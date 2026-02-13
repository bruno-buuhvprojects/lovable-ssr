# SSR entry & server

## 1. Entry module

Create a module that registers routes and exports a `render(url)` that uses the framework’s `render` and your app wrappers (e.g. QueryClient, Toaster):

```tsx
// src/ssr/entry-server.tsx (or src/entry-server.tsx)
import { render as frameworkRender } from 'lovable-ssr';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';

const queryClient = new QueryClient();

export interface RenderResult {
  html: string;
  preloadedData: Record<string, unknown>;
}

export async function render(url: string): Promise<RenderResult> {
  return frameworkRender(url, {
    wrap: (children) => (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    ),
  });
}
```

The framework’s `render(url, options)` resolves the route, runs `getServerData` when present, and renders `StaticRouter` + `RouteDataProvider` + `AppRoutes`. Your `wrap` adds the rest of the tree (providers, toasts, etc.).

## 2. Server script

Run the Express + Vite server using `createServer` from the **server** subpath (so Node-only code is not bundled in the client). **Import your routes module before `createServer()`** so the route registry is populated when the server starts; the server calls `RouterService.isSsrRoute(pathname)` on each request, and that reads from the registry — if it’s empty (because the entry is only loaded later), every route is treated as SPA.

```ts
// src/ssr/server.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'lovable-ssr/server';
import { registerRoutes } from 'lovable-ssr';

import { routes } from '@/routes';//adjust for your path
// Ensures the route registry is populated before the first request (isSsrRoute, etc.)
registerRoutes(routes);

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

## 4. Build output

- Client build goes to `dist/` (e.g. `index.html`, `assets/`).
- SSR build goes to `dist/ssr/entry-server.js`.
- The compiled server is `dist/ssr/server.js` (from `tsc -p tsconfig.server.json`).

`createServer` expects the built entry at `dist/ssr/entry-server.js` when `entryPath` is `src/ssr/entry-server.tsx`.
