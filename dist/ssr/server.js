import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { getMiddleware, getRoutes } from '../registry.js';
import RouterService from '../router/RouterService.js';
import { buildRequestContext } from '../types.js';
import { escapeHtml } from '../utils/escapeHtml.js';
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
            extraRoutes: config.extraRoutes ?? (() => { }),
            middleware: config.middleware ?? null,
            sitemap: config.sitemap ?? undefined,
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
        if (this.config.sitemap?.siteUrl) {
            this.registerSitemapRoutes(this.config.sitemap.siteUrl);
        }
        this.config.extraRoutes?.(this.app);
        this.app.use('*', (req, res, next) => this.handleRequest(req, res, next));
    }
    registerSitemapRoutes(siteUrl) {
        const baseUrl = siteUrl.replace(/\/$/, '');
        this.app.get('/robots.txt', (_req, res) => {
            res.type('text/plain');
            res.send(`User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`);
        });
        this.app.get('/sitemap.xml', async (_req, res) => {
            const today = new Date().toISOString().split('T')[0];
            const entries = [];
            for (const route of getRoutes()) {
                const cfg = route.sitemap;
                if (!cfg?.include)
                    continue;
                const changefreq = cfg.changefreq ?? 'weekly';
                const priority = cfg.priority ?? 0.5;
                if (cfg.getEntries) {
                    try {
                        const dynamicEntries = await cfg.getEntries({ siteUrl: baseUrl });
                        for (const e of dynamicEntries) {
                            entries.push({
                                loc: e.loc,
                                lastmod: e.lastmod ?? today,
                                changefreq: e.changefreq ?? changefreq,
                                priority: e.priority ?? priority,
                            });
                        }
                    }
                    catch (err) {
                        console.error(`[lovable-ssr] sitemap getEntries failed for ${route.path}:`, err);
                    }
                }
                else if (!route.path.includes(':')) {
                    entries.push({
                        loc: `${baseUrl}${route.path === '/' ? '' : route.path}`,
                        lastmod: today,
                        changefreq,
                        priority,
                    });
                }
            }
            const xml = this.buildSitemapXml(entries);
            res.type('application/xml').send(xml);
        });
    }
    buildSitemapXml(entries) {
        const lines = entries.map((e) => `  <url><loc>${escapeHtml(e.loc)}</loc><lastmod>${e.lastmod ?? ''}</lastmod><changefreq>${e.changefreq ?? 'weekly'}</changefreq><priority>${e.priority ?? 0.5}</priority></url>`);
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${lines.join('\n')}
</urlset>`;
    }
    async runMiddleware(ctx) {
        const mw = this.config.middleware ?? getMiddleware();
        if (!mw)
            return;
        return await mw(ctx);
    }
    sendMiddlewareResponse(res, mwRes) {
        if (mwRes.headers) {
            for (const [key, value] of Object.entries(mwRes.headers)) {
                res.setHeader(key, value);
            }
        }
        if (mwRes.redirect) {
            res.redirect(mwRes.status ?? 302, mwRes.redirect);
            return;
        }
        res.status(mwRes.status ?? 200).send(mwRes.body ?? '');
    }
    async handleRequest(req, res, next) {
        const url = req.originalUrl;
        const pathname = url.replace(/\?.*$/, '').replace(/#.*$/, '') || '/';
        try {
            const matchedRoute = RouterService.matchRoute(pathname);
            const params = matchedRoute
                ? RouterService.routeParams(matchedRoute.path, pathname)
                : { routeParams: {}, searchParams: {} };
            const requestContext = buildRequestContext(req);
            const mwResult = await this.runMiddleware({
                request: requestContext,
                route: matchedRoute,
                pathname,
                params,
            });
            if (mwResult) {
                return this.sendMiddlewareResponse(res, mwResult);
            }
            if (!RouterService.isSsrRoute(pathname)) {
                return await this.renderSpa(url, res);
            }
            return await this.renderSsr(url, res, requestContext);
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
    normalizeRenderResult(result) {
        return {
            appHtml: typeof result.html === 'string' ? result.html : '',
            preloadedData: result.preloadedData ?? {},
            helmet: result.helmet,
        };
    }
    async resolveRenderResult(url, render, requestContext) {
        if (!this.isProd) {
            return this.normalizeRenderResult(await render(url, { requestContext }));
        }
        const hasCookies = !!requestContext.cookiesRaw;
        if (hasCookies) {
            return this.normalizeRenderResult(await render(url, { requestContext }));
        }
        const cacheKey = this.normalizeCacheKey(url);
        const cached = this._ssrCache.get(cacheKey);
        if (cached) {
            return { appHtml: cached.html, preloadedData: cached.preloadedData, helmet: cached.helmet };
        }
        const normalized = this.normalizeRenderResult(await render(url, { requestContext }));
        this._ssrCache.set(cacheKey, { html: normalized.appHtml, preloadedData: normalized.preloadedData, helmet: normalized.helmet });
        return normalized;
    }
    async renderSsr(url, res, requestContext) {
        const { template, render } = await this.getSsrRenderer();
        if (process.env.NODE_ENV !== 'production' && process.env.LOVABLE_SSR_DEBUG) {
            console.log('[lovable-ssr] render(url)', url);
        }
        const { appHtml, preloadedData, helmet } = await this.resolveRenderResult(url, render, requestContext);
        let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
        html = this.injectHelmet(html, helmet);
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
    injectHelmet(html, helmet) {
        if (!helmet)
            return html;
        const tags = [helmet.title, helmet.meta, helmet.link, helmet.script].filter(Boolean).join('\n');
        if (!tags)
            return html;
        return html.replace('</head>', `${tags}\n</head>`);
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
