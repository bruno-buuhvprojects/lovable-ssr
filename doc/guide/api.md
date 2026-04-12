# API reference

## Types

| Type | Description |
|------|-------------|
| `RouteConfig` | `{ path: string; Component: ComponentWithGetData; isSSR: boolean; sitemap?: SitemapRouteConfig }` |
| `ComponentWithGetData` | React component type with optional `getData?: (params?: { routeParams: Record<string, string>; searchParams: Record<string, string>; request?: unknown }) => Promise<Record<string, unknown>>` |
| `MiddlewareFn` | `(ctx: MiddlewareContext) => Promise<MiddlewareResponse \| void> \| MiddlewareResponse \| void` |
| `MiddlewareContext` | `{ request: RequestContext; route: RouteConfig \| undefined; pathname: string; params: { routeParams; searchParams } }` |
| `MiddlewareResponse` | `{ redirect?: string; status?: number; headers?: Record<string, string>; body?: string }` |
| `RouteDataState` | `Record<string, Record<string, unknown>>` (routeKey → data) |
| `InitialRouteShape` | `{ path: string }` (minimal shape for initial route) |

## Registry

| Function | Description |
|----------|-------------|
| `registerRoutes(routes: RouteConfig[])` | Set the route list (call once on client and in entry-server). |
| `getRoutes(): RouteConfig[]` | Read the current route list (used internally). |
| `registerMiddleware(fn: MiddlewareFn)` | Register a global middleware that runs before every route. Only one middleware can be registered. |

## Router (RouterService)

| Method | Description |
|--------|-------------|
| `RouterService.matchRoute(pathname: string)` | Returns the `RouteConfig` that matches the pathname. |
| `RouterService.routeParams(routePath: string, pathname?: string)` | Returns `{ routeParams, searchParams }`; path segments (e.g. `/video/:id` + `/video/123` → `routeParams: { id: '123' }`). |
| `RouterService.searchParams(urlOrSearch: string)` | Parses query string into `Record<string, string>`. |
| `RouterService.isSsrRoute(pathname: string)` | Returns whether the pathname matches a route with `isSSR: true`. |
| `RouterService.matchPath(pathPattern: string, pathname: string)` | Low-level path match. |

## Route data context

| Export | Description |
|--------|-------------|
| `RouteDataProvider` | Provider with `initialData`, `initialRoute`, `initialParams`. |
| `useRouteData()` | Returns `{ data: RouteDataState; setData(routeKey, value) }`. |
| `buildRouteKey(path, routeParams, searchParams?)` | Builds a stable key for path + route params + optional search params (so the same path with different query strings gets different keys). |

## UI components

| Component | Description |
|-----------|-------------|
| `AppRoutes` | Renders `<Routes>` from the registry; uses context for page data. Use inside `RouteDataProvider` (or `BrowserRouteDataProvider`). |
| `BrowserRouteDataProvider` | Reads `window.__PRELOADED_DATA__` and pathname, wraps children in `SEOProvider` + `RouteDataProvider`. Use inside `BrowserRouter`. |
| `SEO` | Sets meta tags and optional JSON-LD for a page. Props: `title`, `description`, `image?`, `url?`, `type?`, `noindex?`, `structuredData?`. See [SEO guide](/guide/seo). |

## SSR (main package)

| Export | Description |
|--------|-------------|
| `render(url: string, options?: RenderOptions)` | Returns `Promise<{ html: string; preloadedData; helmet? }>`. `options.wrap` can wrap the inner tree (e.g. QueryClient, Toaster). `options.requestContext` is forwarded to `getData` via `params.request`. When pages use `<SEO />`, `helmet` contains title, meta, link, and script tags for server injection (built from SEO props, no external lib). |

## Server (lovable-ssr/server)

Import from `lovable-ssr/server` so Node/Express are not bundled in the client.

| Export | Description |
|--------|-------------|
| `createServer(config: CreateServerConfig)` | Returns `Promise<{ getApp(); listen(port?, callback?) }>`. |
| `runServer(config?)` | Convenience: creates server and calls `listen` (uses `process.cwd()` and env if config omitted). |

### CreateServerConfig

| Field | Type | Description |
|-------|------|-------------|
| `root` | `string` | Project root (where `index.html` and `dist/` live). |
| `entryPath` | `string` | Path to the app’s entry-server module relative to `root` (e.g. `src/ssr/entry-server.tsx`). |
| `port` | `number?` | Default port (default `5173`). |
| `cssLinkInDev` | `string?` | HTML snippet to inject before `</head>` in dev (e.g. link to `/src/index.css`). |
| `extraRoutes` | `(app: Express) => void` | Optional. Called before the SSR catch-all; use for custom routes. |
| `middleware` | `MiddlewareFn?` | Optional. Runs before every route. If it returns a `MiddlewareResponse`, the route is not rendered. See [Middleware guide](/guide/middleware). |
| `sitemap` | `{ siteUrl: string }` | Optional. Enables `/sitemap.xml` and `/robots.txt` built from routes with `sitemap.include`. |

Production entry path is derived from `entryPath` by replacing `src/` with `dist/` and the extension with `.js` (e.g. `dist/ssr/entry-server.js`).
