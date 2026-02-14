import { getRoutes } from '../registry.js';
import type { RouteConfig } from '../types.js';

function matchPath(pathPattern: string, pathname: string): boolean {
  if (pathPattern === '*') return true;
  if (pathPattern === pathname) return true;
  const segments = pathname.split('/').filter(Boolean);
  const patternSegments = pathPattern.split('/').filter(Boolean);
  if (segments.length !== patternSegments.length) return false;
  return patternSegments.every((p, i) => p.startsWith(':') || p === segments[i]);
}

function isSsrRoute(pathname: string): boolean {
  const routes = getRoutes();
  return routes.filter((r) => r.isSSR).some((route) => matchPath(route.path, pathname));
}

function matchRoute(pathname: string): RouteConfig | undefined {
  const routes = getRoutes();
  for (const route of routes) {
    if (matchPath(route.path, pathname)) return route;
  }
  return routes.find((r) => r.path === '*');
}

function routeParams(routePath: string, pathname?: string): Record<'routeParams' | 'searchParams', Record<string, string>> {
  const pathSegments = pathname?.split('/').filter(Boolean) || [];
  const patternSegments = routePath.split('/').filter(Boolean);
  const params: Record<'routeParams' | 'searchParams', Record<string, string>> = {
    routeParams: {},
    searchParams: {},
  };
  patternSegments.forEach((segment, i) => {
    if (segment.startsWith(':')) {
      params['routeParams'][segment.slice(1)] = pathSegments[i];
    }
  });
  return params;
}
function searchParams(pathname: string): Record<string, string> {
  const searchParams = new URLSearchParams(pathname);
  return Object.fromEntries(searchParams.entries());
}

const RouterService = {
  isSsrRoute,
  matchPath,
  matchRoute,
  routeParams,
  searchParams,
};

export default RouterService;
