import type { ReactNode } from 'react';
import RouterService from '../router/RouterService.js';
import { RouteDataProvider } from '../router/RouteDataContext.js';

/**
 * Wraps children with RouteDataProvider using initial data from the browser:
 * - window.__PRELOADED_DATA__ (from SSR)
 * - window.location.pathname + RouterService for matchedRoute and routeParams
 *
 * Use this inside BrowserRouter so the app does not need to read __PRELOADED_DATA__
 * or compute initial route/params manually.
 */
export function BrowserRouteDataProvider({ children }: { children: ReactNode }) {
  const preloadedData =
    typeof window !== 'undefined' ? (window.__PRELOADED_DATA__ ?? {}) : {};
  const pathname =
    typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
  const searchParams =
    typeof window !== 'undefined' ? RouterService.searchParams(window.location.search ?? '') : {};
  const matchedRoute = RouterService.matchRoute(pathname);
  const routeParamsResult = matchedRoute
    ? RouterService.routeParams(matchedRoute.path, pathname)
    : { routeParams: {}, searchParams: {} };

  const initialParams = {
    routeParams: routeParamsResult.routeParams,
    searchParams: Object.keys(searchParams).length > 0 ? searchParams : routeParamsResult.searchParams,
  };

  return (
    <RouteDataProvider
      initialData={preloadedData}
      initialRoute={matchedRoute}
      initialParams={initialParams}
    >
      {children}
    </RouteDataProvider>
  );
}
