# Middleware

Middleware lets you run logic **before** a route is loaded — useful for auth checks, redirects, or custom responses.

Only one middleware can be registered. It receives the request context and the matched route, and can either allow the request to continue (return nothing) or short-circuit with a redirect or custom response.

## Usage

### Via `createServer` config

```ts
import { createServer } from 'lovable-ssr/server';

createServer({
  root,
  entryPath: 'src/ssr/entry-server.tsx',
  middleware: async (ctx) => {
    if (ctx.pathname.startsWith('/dashboard') && !ctx.request.cookies.token) {
      return { redirect: '/login' };
    }
  },
});
```

### Via global `registerMiddleware`

```ts
import { registerMiddleware } from 'lovable-ssr';

registerMiddleware(async (ctx) => {
  if (ctx.pathname.startsWith('/admin') && !ctx.request.cookies.session) {
    return { status: 401, body: 'Unauthorized' };
  }
});
```

If both a config middleware and a global middleware are registered, the config middleware takes priority.

## MiddlewareContext

The middleware function receives a `MiddlewareContext` with:

| Field | Type | Description |
|-------|------|-------------|
| `request` | `RequestContext` | Parsed request: `cookies`, `cookiesRaw`, `headers`, `method`, `url`. |
| `route` | `RouteConfig \| undefined` | The matched route config, or `undefined` if no route matched. |
| `pathname` | `string` | The URL pathname (e.g. `/dashboard/settings`). |
| `params` | `{ routeParams, searchParams }` | Extracted route and search params. |

## MiddlewareResponse

Return an object to short-circuit the request. Return `void` (or nothing) to continue normally.

| Field | Type | Description |
|-------|------|-------------|
| `redirect` | `string?` | URL to redirect to. |
| `status` | `number?` | HTTP status code (defaults to `302` for redirects, `200` otherwise). |
| `headers` | `Record<string, string>?` | Extra response headers. |
| `body` | `string?` | Response body (used when not redirecting). |

## Examples

### Auth guard

```ts
middleware: async (ctx) => {
  const protectedPaths = ['/dashboard', '/settings', '/profile'];
  const isProtected = protectedPaths.some((p) => ctx.pathname.startsWith(p));

  if (isProtected && !ctx.request.cookies.token) {
    return { redirect: '/login' };
  }
}
```

### Maintenance mode

```ts
middleware: async (ctx) => {
  if (process.env.MAINTENANCE === 'true') {
    return {
      status: 503,
      headers: { 'Retry-After': '3600' },
      body: '<h1>Under maintenance</h1>',
    };
  }
}
```
