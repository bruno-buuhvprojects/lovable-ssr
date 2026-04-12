import type { MiddlewareFn, RouteConfig } from './types.js';

let routes: RouteConfig[] = [];
let middleware: MiddlewareFn | null = null;

export function registerRoutes(r: RouteConfig[]): void {
  routes = r;
}

export function getRoutes(): RouteConfig[] {
  return routes;
}

export function registerMiddleware(m: MiddlewareFn): void {
  middleware = m;
}

export function getMiddleware(): MiddlewareFn | null {
  return middleware;
}
