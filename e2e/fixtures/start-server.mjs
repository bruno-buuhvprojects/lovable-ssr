/**
 * Boot the e2e test server.
 *
 * We cannot use the compiled dist/ directly because the Vite ssrLoadModule
 * resolves the fixture entry-server from src/, creating a separate module
 * registry from dist/. Instead, we use a minimal Express + Vite setup that
 * loads everything through Vite so all imports resolve to the same source.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const port = 4173;

const app = express();

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'custom',
  root,
});
app.use(vite.middlewares);

// Preload entry so registerRoutes() populates the registry
const entry = await vite.ssrLoadModule(path.join(root, 'entry-server.tsx'));
// Import the registry and router from the same Vite-resolved source
const registry = await vite.ssrLoadModule(
  path.resolve(root, '../../src/registry.ts')
);
const routerMod = await vite.ssrLoadModule(
  path.resolve(root, '../../src/router/RouterService.ts')
);
const RouterService = routerMod.default;
const typesMod = await vite.ssrLoadModule(
  path.resolve(root, '../../src/types.ts')
);

app.use('*', async (req, res, next) => {
  const url = req.originalUrl;
  const pathname = url.replace(/\?.*$/, '').replace(/#.*$/, '') || '/';

  try {
    const isSsr = registry
      .getRoutes()
      .filter((r) => r.isSSR)
      .some((route) => RouterService.matchPath(route.path, pathname));

    if (!isSsr) {
      // SPA fallback
      let template = (await import('node:fs')).readFileSync(
        path.join(root, 'index.html'),
        'utf-8'
      );
      template = await vite.transformIndexHtml(url, template);
      return res.status(200).set({ 'Content-Type': 'text/html' }).send(template);
    }

    // SSR
    const requestContext = typesMod.buildRequestContext(req);
    const { html: appHtml, preloadedData, helmet } = await entry.render(url, {
      requestContext,
    });

    let template = (await import('node:fs')).readFileSync(
      path.join(root, 'index.html'),
      'utf-8'
    );
    template = await vite.transformIndexHtml(url, template);

    let html = template.replace(
      '<div id="root"></div>',
      `<div id="root">${appHtml}</div>`
    );

    // Inject preloaded data
    if (preloadedData && Object.keys(preloadedData).length > 0) {
      const script = `<script>window.__PRELOADED_DATA__=${JSON.stringify(preloadedData)};</script>`;
      html = html.replace('</body>', `${script}</body>`);
    }

    return res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
  } catch (e) {
    vite.ssrFixStacktrace?.(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`E2E test server running on http://localhost:${port}`);
});
