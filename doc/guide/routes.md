# Routes

## Define routes

Import the types from the framework and define your route list:

```ts
// src/routes.ts (or src/application/routes.ts)
import {
  registerRoutes,
  type RouteConfig,
  type ComponentWithGetServerData,
} from 'lovable-ssr';
import HomePage from '@/pages/HomePage';
import VideoPage from '@/pages/VideoPage';
import NotFound from '@/pages/NotFound';

export type { RouteConfig, ComponentWithGetServerData };

export const routes: RouteConfig[] = [
  { path: '/', Component: HomePage, isSSR: true },
  { path: '/video/:id', Component: VideoPage, isSSR: true },
  { path: '/signup', Component: SignupPage, isSSR: false },
  { path: '*', Component: NotFound, isSSR: false },
];

registerRoutes(routes);
```

## RouteConfig

| Field       | Type     | Description                                      |
| ----------- | -------- | ------------------------------------------------ |
| `path`      | `string` | Path pattern (e.g. `/`, `/video/:id`, `*`)       |
| `Component` | `React.ComponentType` | Page component (may have `getServerData`) |
| `isSSR`     | `boolean`| If `true`, the server will run SSR for this path |

## Register once

You must call `registerRoutes(routes)` before any use of the router or `AppRoutes`:

- **Client**: import your routes module in `App.tsx` (or `main.tsx`) so it runs on load.
- **SSR entry**: the entry-server typically imports the routes module and calls `registerRoutes(routes)` before calling the framework’s `render`.
- **SSR server**: **import the routes module in your `server.ts` before `createServer()`** (e.g. `import '../application/routes'`). The server calls `RouterService.isSsrRoute(pathname)` on each request; that reads from the registry. If the registry is still empty (because the entry is only loaded when doing SSR), every request is treated as SPA and the entry never runs. Importing the routes in `server.ts` ensures the registry is filled at startup.

The framework uses this registry for `RouterService.matchRoute`, `RouterService.isSsrRoute`, and for `AppRoutes` to render the list of routes.
