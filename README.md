# lovable-ssr

SSR and route data engine for [Lovable](https://lovable.dev) projects. Provides a route registry (singleton), `getServerData`-based data loading for SSR and SPA navigation, and an Express + Vite server.

**Documentation:** [Documentação completa](https://calm-meadow-5cf6.github-8c8.workers.dev/)

## Installation

```bash
npm i lovable-ssr
```

Peer dependencies: `react`, `react-dom`, `react-router-dom` (^18 / ^6).

## Quick start

### 1. Register routes

Define your routes and call `registerRoutes` so the framework can match paths and run `getServerData`:

```ts
// src/routes.ts (or wherever you define routes)
import { registerRoutes, type RouteConfig, type ComponentWithGetServerData } from 'lovable-ssr';
import HomePage from '@/pages/HomePage';
import VideoPage from '@/pages/VideoPage';

export const routes: RouteConfig[] = [
  { path: '/', Component: HomePage, isSSR: true },
  { path: '/video/:id', Component: VideoPage, isSSR: true },
  { path: '*', Component: NotFound, isSSR: false },
];

registerRoutes(routes);
```

### 2. App shell

Ensure routes are loaded (so the registry is filled), then use `BrowserRouteDataProvider` and `AppRoutes`. The framework reads `window.__PRELOADED_DATA__` and the current pathname and fills the route data context for you (no need to declare `Window` or compute initial route/params in the app):

```tsx
// src/App.tsx
import './routes'; // runs registerRoutes(routes)
import { BrowserRouteDataProvider, AppRoutes } from 'lovable-ssr';
import { BrowserRouter } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <BrowserRouteDataProvider>
        <AppRoutes />
      </BrowserRouteDataProvider>
    </BrowserRouter>
  );
}
```

The package augments `Window` with `__PRELOADED_DATA__?: Record<string, unknown>` so you don't need to declare it. If you prefer to wire `RouteDataProvider` yourself (e.g. for testing), use `RouterService`, `RouteDataProvider`, and the same initial data logic.

### 3. SSR entry (optional)

For SSR, add an entry module that registers routes and calls the framework’s `render` with your app wrappers (e.g. QueryClient, Toaster):

```tsx
// src/entry-server.tsx
import { registerRoutes, render as frameworkRender } from 'lovable-ssr';
import { routes } from '@/routes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

registerRoutes(routes);

export async function render(url: string) {
  return frameworkRender(url, {
    wrap: (children) => (
      <QueryClientProvider client={new QueryClient()}>
        {children}
      </QueryClientProvider>
    ),
  });
}
```

### 4. SSR server (optional)

Run the Express + Vite server using the framework’s `createServer` (import from the `server` subpath so Node-only code is not bundled in the client). **You must import your routes module before `createServer()`** so the route registry is filled when the server starts; otherwise `isSsrRoute(pathname)` sees an empty list and every request is treated as SPA.

```ts
// src/ssr/server.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'lovable-ssr/server';
// Ensures the route registry is populated before the first request (isSsrRoute, etc.)
import '../application/routes';  // or '@/routes' depending on your path aliases

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

createServer({
  root,
  entryPath: 'src/ssr/entry-server.tsx',
  port: process.env.PORT ? Number(process.env.PORT) : 5173,
})
  .then((s) => s.listen())
  .catch(console.error);
```

Scripts:

- **Dev SPA:** `vite`
- **Dev SSR:** `tsx src/ssr/server.ts`
- **Build SSR:** `vite build && vite build --ssr src/entry-server.tsx --outDir dist`
- **Preview SSR:** `npm run build:ssr && NODE_ENV=production tsx src/ssr/server.ts`

## API

- **Types:** `RouteConfig`, `ComponentWithGetServerData`
- **Registry:** `registerRoutes(routes)`, `getRoutes()`
- **Router:** `RouterService.matchRoute(pathname)`, `RouterService.routeParams(path, pathname)`, `RouterService.isSsrRoute(pathname)`
- **Data:** `RouteDataProvider`, `useRouteData()`, `buildRouteKey(path, params)`, `RouteDataState`, `InitialRouteShape`
- **UI:** `AppRoutes` (no props), `BrowserRouteDataProvider` (wraps children with `RouteDataProvider` using `window.__PRELOADED_DATA__` and current pathname; use inside `BrowserRouter`)
- **SSR:** `render(url, options?)` with `options.wrap = (children) => ReactNode`
- **Server:** `createServer(config)` and `runServer(config?)` from `lovable-ssr/server`

## Pages with `getServerData`

Attach a `getServerData` function to the route component; it runs on the server for SSR and on the client when navigating to that route if data is not already cached (keyed by path + params).

```ts
async function getServerData(params?: Record<string, string>) {
  const id = params?.id;
  const data = await fetch(`/api/videos/${id}`).then((r) => r.json());
  return { video: data };
}
VideoPage.getServerData = getServerData;
```

## License

MIT
