# SSR entry & server

## 1. Entry module

Create a module that registers routes and exports a `render(url)` that uses the framework’s `render` and your app wrappers (e.g. QueryClient, Toaster). The server preloads this entry at startup so `registerRoutes(routes)` runs and the route registry is filled before the first request.

```tsx
// src/ssr/entry-server.tsx (or src/entry-server.tsx)
import { registerRoutes, render as frameworkRender } from 'lovable-ssr';
import { routes } from '@/routes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';

registerRoutes(routes);
const queryClient = new QueryClient();

export interface RenderResult {
  html: string;
  preloadedData: Record<string, unknown>;
}

export async function render(url: string, options?: { requestContext?: unknown }): Promise<RenderResult> {
  return frameworkRender(url, {
    wrap: (children) => (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    ),
    // requestContext is forwarded to getData via params.request
    requestContext: options?.requestContext,
  });
}
```

The framework’s `render(url, options)` resolves the route, runs `getData` when present, and renders `StaticRouter` + `RouteDataProvider` + `AppRoutes`. Your `wrap` adds the rest of the tree (providers, toasts, etc.).

## 2. Server script

Run the Express + Vite server using `createServer` from the **server** subpath (so Node-only code is not bundled in the client). The framework **preloads your entry module at startup** (before accepting requests), so `registerRoutes(routes)` runs and the route registry is filled; that way `RouterService.isSsrRoute(pathname)` works on the first request. Do **not** import your routes module in `server.ts` — that would load React page components in plain Node (e.g. via `tsx`) and can cause “React is not defined” or resolution issues; the entry is loaded correctly via Vite’s `ssrLoadModule` or the built bundle.

```ts
// src/ssr/server.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'lovable-ssr/server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

createServer({
  root,
  entryPath: 'src/ssr/entry-server.tsx',
  port: process.env.PORT ? Number(process.env.PORT) : 5173,
  cssLinkInDev: '<link rel="stylesheet" href="/src/index.css"></head>',
})
  .then((server) => server.listen())
  .catch(console.error);
```

## 3. Scripts in package.json

Add these scripts to your project’s `package.json` so you can run the SSR server in dev and production:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:ssr": "tsx src/ssr/server.ts",
    "build:ssr": "vite build && vite build --ssr src/ssr/entry-server.tsx --outDir dist/ssr && tsc -p tsconfig.server.json",
    "preview:ssr": "npm run build:ssr && cross-env NODE_ENV=production node dist/ssr/server.js"
  }
}
```

- **dev** — SPA only (no SSR).
- **dev:ssr** — Dev server with SSR; uses `tsx` to run `src/ssr/server.ts` (no build).
- **build:ssr** — Client build → `dist/`, SSR bundle → `dist/ssr/entry-server.js`, server → `dist/ssr/server.js` (requires a `tsconfig.server.json` that compiles `src/ssr/server.ts`).
- **preview:ssr** — Full SSR build then run the production server with `node dist/ssr/server.js`.

Adjust paths if your entry or server live elsewhere (e.g. `src/entry-server.tsx` and `src/server.ts`).

You also need a **tsconfig for the server** (e.g. `tsconfig.server.json`) that compiles `src/ssr/server.ts` to `dist/ssr/server.js` so `preview:ssr` can run `node dist/ssr/server.js` without `tsx`. Example:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist/ssr",
    "rootDir": "src/ssr",
    "skipLibCheck": true,
    "strict": true,
    "noEmit": false
  },
  "include": ["src/ssr/server.ts"]
}
```

## 4. Watch and debug (optional)

During development, changing files under `src/ssr` or your app (e.g. pages, entry) does not restart the server by default, so you have to restart the Node process to pick up changes. To get **auto-restart on file change** and **debugger reconnection** in VS Code/Cursor:

1. **Add nodemon** (or similar) and two scripts to your app’s `package.json`:

```json
{
  "scripts": {
    "dev:ssr": "tsx src/ssr/server.ts",
    "dev:ssr:watch": "nodemon --watch src/ssr --watch src/application --ext ts,tsx --exec \"tsx src/ssr/server.ts\"",
    "dev:ssr:watch:debug": "cross-env NODE_OPTIONS=--inspect npm run dev:ssr:watch"
  }
}
```

Adjust `--watch` paths to match your project (e.g. `src/routes`, `src/pages`). `dev:ssr:watch:debug` runs the server with Node’s inspector so the debugger can attach.

2. **Add an attach configuration** in `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to SSR (watch)",
  "port": 9229,
  "restart": true,
  "skipFiles": ["<node_internals>/**"]
}
```

3. **Use it:** run in a terminal `npm run dev:ssr:watch:debug`, then in Run and Debug start **"Attach to SSR (watch)"**. When you edit files in the watched folders, the server restarts and the debugger reconnects automatically (`restart: true`).

## 5. Build output

- Client build goes to `dist/` (e.g. `index.html`, `assets/`).
- SSR build goes to `dist/ssr/entry-server.js`.
- The compiled server is `dist/ssr/server.js` (from `tsc -p tsconfig.server.json`).

`createServer` expects the built entry at `dist/ssr/entry-server.js` when `entryPath` is `src/ssr/entry-server.tsx`.
