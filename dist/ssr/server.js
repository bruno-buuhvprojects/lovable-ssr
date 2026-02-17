import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import RouterService from '../router/RouterService.js';
function defaultDistEntryPath(entryPath) {
    return entryPath
        .replace(/^src\//, 'dist/')
        .replace(/\.tsx?$/, '.js');
}
class SsrServer {
    app;
    vite;
    config;
    isProd;
    _rendererCache;
    /** On-demand SSR cache: key = pathname + normalized search params, value = render result. Only used in production. */
    _ssrCache = new Map();
    normalizeCacheKey(url) {
        const u = new URL(url, 'http://localhost');
        const search = new URLSearchParams(u.search);
        const sorted = new URLSearchParams([...search.entries()].sort((a, b) => a[0].localeCompare(b[0])));
        const q = sorted.toString();
        return (u.pathname || '/') + (q ? `?${q}` : '');
    }
    constructor(config) {
        this.config = {
            root: path.resolve(config.root),
            entryPath: config.entryPath,
            port: config.port ?? 5173,
            cssLinkInDev: config.cssLinkInDev ?? '<link rel="stylesheet" href="/src/index.css"></head>',
        };
        this.isProd = process.env.NODE_ENV === 'production';
        this.app = express();
    }
    static async create(config) {
        const server = new SsrServer(config);
        await server.configureVite();
        server.configureStaticAssets();
        server.configureRequestHandler();
        // Preload entry so registerRoutes() runs and the route registry is filled before the first request (isSsrRoute).
        await server.ensureEntryLoaded();
        return server;
    }
    /** Load the entry module once at startup so the route registry is populated before any request. */
    async ensureEntryLoaded() {
        if (!this._rendererCache) {
            this._rendererCache = await this.getSsrRenderer();
        }
    }
    async configureVite() {
        if (this.isProd)
            return;
        this.vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom',
            root: this.config.root,
        });
        this.app.use(this.vite.middlewares);
    }
    configureStaticAssets() {
        if (!this.isProd)
            return;
        this.app.use(express.static(path.join(this.config.root, 'dist'), { index: false }));
    }
    configureRequestHandler() {
        this.app.use('*', (req, res, next) => this.handleRequest(req, res, next));
    }
    async handleRequest(req, res, next) {
        const url = req.originalUrl;
        const pathname = url.replace(/\?.*$/, '').replace(/#.*$/, '') || '/';
        try {
            if (!RouterService.isSsrRoute(pathname)) {
                return await this.renderSpa(url, res);
            }
            return await this.renderSsr(url, res, req);
        }
        catch (e) {
            if (this.vite) {
                this.vite.ssrFixStacktrace?.(e);
            }
            next(e);
        }
    }
    async renderSpa(url, res) {
        if (this.vite) {
            let template = this.readTemplate(path.join(this.config.root, 'index.html'));
            template = this.injectCssInDev(template);
            const html = await this.vite.transformIndexHtml(url, template);
            return res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
        }
        const template = this.readTemplate(path.join(this.config.root, 'dist', 'index.html'));
        return res.status(200).set({ 'Content-Type': 'text/html' }).send(template);
    }
    async renderSsr(url, res, req) {
        const { template, render } = await this.getSsrRenderer();
        if (process.env.NODE_ENV !== 'production' && process.env.LOVABLE_SSR_DEBUG) {
            console.log('[lovable-ssr] render(url)', url);
        }
        let appHtml;
        let preloadedData;
        // Constrói um contexto simples de request (cookies raw + headers) para o getData.
        const cookiesRaw = req.headers.cookie ?? '';
        const cookies = {};
        if (cookiesRaw) {
            cookiesRaw.split(';').forEach((part) => {
                const [k, ...rest] = part.split('=');
                if (!k)
                    return;
                const key = k.trim();
                if (!key)
                    return;
                const value = rest.join('=').trim();
                cookies[key] = decodeURIComponent(value);
            });
        }
        const requestContext = {
            cookiesRaw,
            cookies,
            headers: req.headers,
            method: req.method,
            url: req.originalUrl,
        };
        if (this.isProd) {
            const cacheKey = this.normalizeCacheKey(url);
            const hasCookies = !!cookiesRaw;
            // Evita cachear respostas personalizadas por cookies (ex.: auth).
            if (!hasCookies) {
                const cached = this._ssrCache.get(cacheKey);
                if (cached) {
                    appHtml = cached.html;
                    preloadedData = cached.preloadedData;
                }
                else {
                    const result = await render(url, { requestContext });
                    appHtml = typeof result.html === 'string' ? result.html : '';
                    preloadedData = result.preloadedData ?? {};
                    this._ssrCache.set(cacheKey, { html: appHtml, preloadedData });
                }
            }
            else {
                const result = await render(url, { requestContext });
                appHtml = typeof result.html === 'string' ? result.html : '';
                preloadedData = result.preloadedData ?? {};
            }
        }
        else {
            const result = await render(url, { requestContext });
            appHtml = typeof result.html === 'string' ? result.html : '';
            preloadedData = result.preloadedData ?? {};
        }
        let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
        html = this.injectPreloadedData(html, preloadedData);
        if (this.vite) {
            const transformed = await this.vite.transformIndexHtml(url, html);
            return res.status(200).set({ 'Content-Type': 'text/html' }).send(transformed);
        }
        return res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
    }
    async getSsrRenderer() {
        if (this._rendererCache)
            return this._rendererCache;
        if (this.vite) {
            const template = this.injectCssInDev(this.readTemplate(path.join(this.config.root, 'index.html')));
            const entry = await this.vite.ssrLoadModule(path.join(this.config.root, this.config.entryPath));
            return {
                template,
                render: entry.render,
            };
        }
        const template = this.readTemplate(path.join(this.config.root, 'dist', 'index.html'));
        const distEntryPath = defaultDistEntryPath(this.config.entryPath);
        const entryUrl = pathToFileURL(path.join(this.config.root, distEntryPath)).href;
        const entry = await import(entryUrl);
        return {
            template,
            render: entry.render,
        };
    }
    readTemplate(fullPath) {
        return fs.readFileSync(fullPath, 'utf-8');
    }
    injectCssInDev(html) {
        if (!this.vite)
            return html;
        return html.replace('</head>', this.config.cssLinkInDev);
    }
    injectPreloadedData(html, preloadedData) {
        if (Object.keys(preloadedData).length === 0)
            return html;
        const script = `<script>window.__PRELOADED_DATA__=${JSON.stringify(preloadedData)};</script>`;
        return html.replace('</body>', `${script}</body>`);
    }
    listen(port, callback) {
        const p = port ?? this.config.port;
        this.app.listen(p, callback ?? (() => {
            console.log(`SSR server running at http://localhost:${p}`);
        }));
    }
    getApp() {
        return this.app;
    }
}
export async function createServer(config) {
    const server = await SsrServer.create(config);
    return {
        getApp: () => server.getApp(),
        listen: (port, callback) => server.listen(port, callback),
    };
}
/** Standalone: run server when this file is executed (e.g. tsx packages/lovable-ssr/src/ssr/server.ts).
 * Set env ROOT, ENTRY_PATH, PORT or use defaults. */
export function runServer(config) {
    const root = config?.root ?? process.cwd();
    const entryPath = config?.entryPath ?? 'src/entry-server.tsx';
    const port = config?.port ?? (process.env.PORT ? Number(process.env.PORT) : 5173);
    createServer({ root, entryPath, port, ...config })
        .then((s) => s.listen(port))
        .catch(console.error);
}
