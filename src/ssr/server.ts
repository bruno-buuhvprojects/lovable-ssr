import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { getMiddleware, getRoutes } from '../registry.js';
import RouterService from '../router/RouterService.js';
import { buildRequestContext } from '../types.js';
import type { MiddlewareContext, MiddlewareFn, MiddlewareResponse, RequestContext, SitemapEntry } from '../types.js';
import { escapeHtml } from '../utils/escapeHtml.js';

export interface RenderResult {
  html: string;
  preloadedData: Record<string, unknown>;
  helmet?: { title: string; meta: string; link: string; script: string };
}

export interface CreateServerConfig {
  root: string;
  /** Path to the app entry-server module relative to root (e.g. 'src/entry-server.tsx') */
  entryPath: string;
  port?: number;
  /** Optional link tag to inject in dev for CSS (e.g. '<link rel="stylesheet" href="/src/index.css">') */
  cssLinkInDev?: string;
  /** Register routes before the SSR catch-all (e.g. sitemap.xml, robots.txt) */
  extraRoutes?: (app: Express) => void;
  /** Enable sitemap.xml and robots.txt from route registry. Routes with sitemap.include are included. */
  sitemap?: { siteUrl: string };
  /** Middleware executed before rendering each route. If it returns a response, the route is not rendered. */
  middleware?: MiddlewareFn;
}

function defaultDistEntryPath(entryPath: string): string {
  return entryPath
    .replace(/^src\//, 'dist/')
    .replace(/\.tsx?$/, '.js');
}

type ResolvedServerConfig = Omit<Required<CreateServerConfig>, 'sitemap' | 'middleware'> & {
  sitemap?: { siteUrl: string };
  middleware: MiddlewareFn | null;
};

class SsrServer {
  private app: Express;
  private vite: ViteDevServer | undefined;
  private readonly config: ResolvedServerConfig;
  private readonly isProd: boolean;
  private _rendererCache?: {
    template: string;
    render: (url: string) => Promise<RenderResult>;
  };

  constructor(config: CreateServerConfig) {
    this.config = {
      root: path.resolve(config.root),
      entryPath: config.entryPath,
      port: config.port ?? 5173,
      cssLinkInDev:
        config.cssLinkInDev ?? '<link rel="stylesheet" href="/src/index.css"></head>',
      extraRoutes: config.extraRoutes ?? (() => {}),
      middleware: config.middleware ?? null,
      sitemap: config.sitemap ?? undefined,
    };
    this.isProd = process.env.NODE_ENV === 'production';
    this.app = express();
  }

  public static async create(config: CreateServerConfig): Promise<SsrServer> {
    const server = new SsrServer(config);
    await server.configureVite();
    server.configureStaticAssets();
    server.configureRequestHandler();
    // Preload entry so registerRoutes() runs and the route registry is filled before the first request (isSsrRoute).
    await server.ensureEntryLoaded();
    return server;
  }

  /** Load the entry module once at startup so the route registry is populated before any request. */
  private async ensureEntryLoaded(): Promise<void> {
    if (!this._rendererCache) {
      this._rendererCache = await this.getSsrRenderer();
    }
  }

  private async configureVite() {
    if (this.isProd) return;
    this.vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
      root: this.config.root,
    });
    this.app.use(this.vite.middlewares);
  }

  private configureStaticAssets() {
    if (!this.isProd) return;
    this.app.use(express.static(path.join(this.config.root, 'dist'), { index: false }));
  }

  private configureRequestHandler() {
    if (this.config.sitemap?.siteUrl) {
      this.registerSitemapRoutes(this.config.sitemap.siteUrl);
    }
    this.config.extraRoutes?.(this.app);
    this.app.use('*', (req, res, next) => this.handleRequest(req, res, next));
  }

  private registerSitemapRoutes(siteUrl: string) {
    const baseUrl = siteUrl.replace(/\/$/, '');

    this.app.get('/robots.txt', (_req, res) => {
      res.type('text/plain');
      res.send(`User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`);
    });

    this.app.get('/sitemap.xml', async (_req, res) => {
      const today = new Date().toISOString().split('T')[0];
      const entries: SitemapEntry[] = [];

      for (const route of getRoutes()) {
        const cfg = route.sitemap;
        if (!cfg?.include) continue;

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
          } catch (err) {
            console.error(`[lovable-ssr] sitemap getEntries failed for ${route.path}:`, err);
          }
        } else if (!route.path.includes(':')) {
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

  private buildSitemapXml(entries: SitemapEntry[]): string {
    const lines = entries.map(
      (e) =>
        `  <url><loc>${escapeHtml(e.loc)}</loc><lastmod>${e.lastmod ?? ''}</lastmod><changefreq>${e.changefreq ?? 'weekly'}</changefreq><priority>${e.priority ?? 0.5}</priority></url>`
    );
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${lines.join('\n')}
</urlset>`;
  }


  private async runMiddleware(ctx: MiddlewareContext): Promise<MiddlewareResponse | void> {
    const mw = this.config.middleware ?? getMiddleware();
    if (!mw) return;
    return await mw(ctx);
  }

  private sendMiddlewareResponse(res: Response, mwRes: MiddlewareResponse): void {
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

  private async handleRequest(req: Request, res: Response, next: NextFunction) {
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
    } catch (e) {
      if (this.vite) {
        (this.vite as any).ssrFixStacktrace?.(e as Error);
      }
      next(e);
    }
  }

  private async renderSpa(url: string, res: Response) {
    if (this.vite) {
      let template = this.readTemplate(path.join(this.config.root, 'index.html'));
      template = this.injectCssInDev(template);
      const html = await this.vite.transformIndexHtml(url, template);
      return res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
    }
    const template = this.readTemplate(path.join(this.config.root, 'dist', 'index.html'));
    return res.status(200).set({ 'Content-Type': 'text/html' }).send(template);
  }

  private async resolveRenderResult(
    url: string,
    render: (url: string, options?: { requestContext?: unknown }) => Promise<RenderResult>,
    requestContext: RequestContext,
  ): Promise<{ appHtml: string; preloadedData: Record<string, unknown>; helmet: RenderResult['helmet'] }> {
    const result = await render(url, { requestContext });
    return {
      appHtml: typeof result.html === 'string' ? result.html : '',
      preloadedData: result.preloadedData ?? {},
      helmet: result.helmet,
    };
  }

  private async renderSsr(url: string, res: Response, requestContext: RequestContext) {
    const { template, render } = await this.getSsrRenderer();
    if (process.env.NODE_ENV !== 'production' && process.env.LOVABLE_SSR_DEBUG) {
      console.log('[lovable-ssr] render(url)', url);
    }

    const { appHtml, preloadedData, helmet } = await this.resolveRenderResult(url, render, requestContext);

    let html = template.replace(
      '<div id="root"></div>',
      `<div id="root">${appHtml}</div>`
    );
    html = this.injectHelmet(html, helmet);
    html = this.injectPreloadedData(html, preloadedData);
    if (this.vite) {
      const transformed = await this.vite.transformIndexHtml(url, html);
      return res.status(200).set({ 'Content-Type': 'text/html' }).send(transformed);
    }
    return res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
  }

  private async getSsrRenderer(): Promise<{
    template: string;
    render: (url: string, options?: { requestContext?: unknown }) => Promise<RenderResult>;
  }> {
    if (this._rendererCache) return this._rendererCache;
    if (this.vite) {
      const template = this.injectCssInDev(
        this.readTemplate(path.join(this.config.root, 'index.html'))
      );
      const entry = await this.vite.ssrLoadModule(
        path.join(this.config.root, this.config.entryPath)
      );
      return {
        template,
        render: entry.render as (
          url: string,
          options?: { requestContext?: unknown }
        ) => Promise<RenderResult>,
      };
    }
    const template = this.readTemplate(
      path.join(this.config.root, 'dist', 'index.html')
    );
    const distEntryPath = defaultDistEntryPath(this.config.entryPath);
    const entryUrl = pathToFileURL(
      path.join(this.config.root, distEntryPath)
    ).href;
    const entry = await import(entryUrl);
    return {
      template,
      render: entry.render as (
        url: string,
        options?: { requestContext?: unknown }
      ) => Promise<RenderResult>,
    };
  }

  private readTemplate(fullPath: string): string {
    return fs.readFileSync(fullPath, 'utf-8');
  }

  private injectCssInDev(html: string): string {
    if (!this.vite) return html;
    return html.replace('</head>', this.config.cssLinkInDev);
  }

  private injectHelmet(html: string, helmet?: RenderResult['helmet']): string {
    if (!helmet) return html;
    const tags = [helmet.title, helmet.meta, helmet.link, helmet.script].filter(Boolean).join('\n');
    if (!tags) return html;
    return html.replace('</head>', `${tags}\n</head>`);
  }

  private injectPreloadedData(
    html: string,
    preloadedData: Record<string, unknown>
  ): string {
    if (Object.keys(preloadedData).length === 0) return html;
    const script = `<script>window.__PRELOADED_DATA__=${JSON.stringify(
      preloadedData
    )};</script>`;
    return html.replace('</body>', `${script}</body>`);
  }

  public listen(port?: number, callback?: () => void) {
    const p = port ?? this.config.port;
    this.app.listen(p, callback ?? (() => {
      console.log(`SSR server running at http://localhost:${p}`);
    }));
  }

  public getApp(): Express {
    return this.app;
  }
}

export async function createServer(config: CreateServerConfig): Promise<{
  getApp: () => Express;
  listen: (port?: number, callback?: () => void) => void;
}> {
  const server = await SsrServer.create(config);
  return {
    getApp: () => server.getApp(),
    listen: (port?: number, callback?: () => void) =>
      server.listen(port, callback),
  };
}

/** Standalone: run server when this file is executed (e.g. tsx packages/lovable-ssr/src/ssr/server.ts).
 * Set env ROOT, ENTRY_PATH, PORT or use defaults. */
export function runServer(config?: Partial<CreateServerConfig>) {
  const root = config?.root ?? process.cwd();
  const entryPath = config?.entryPath ?? 'src/entry-server.tsx';
  const port = config?.port ?? (process.env.PORT ? Number(process.env.PORT) : 5173);
  createServer({ root, entryPath, port, ...config })
    .then((s) => s.listen(port))
    .catch(console.error);
}
