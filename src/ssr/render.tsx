import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { AppRoutes } from '../components/AppRoutes.js';
import { RouteDataProvider } from '../router/RouteDataContext.js';
import RouterService from '../router/RouterService.js';
import { RequestContext, RouteDataParams } from '../types.js';

export interface RenderResult {
  html: string;
  preloadedData: Record<string, unknown>;
}

export interface RenderOptions {
  wrap?: (children: ReactNode) => ReactNode;
  /**
   * Contexto opcional da request (ex.: cookies, headers).
   * O servidor pode preencher isso e o getData recebe via params.request.
   */
  requestContext?: RequestContext;
}

/**
 * Renders the app for a single URL. Called once per request with that request's URL.
 * getData is invoked only for the route that matches this URL (never for all routes).
 */
export async function render(url: string, options?: RenderOptions): Promise<RenderResult> {
  const fullUrl = new URL(url, 'http://localhost');
  const pathname = fullUrl.pathname || '/';
  const matchedRoute = RouterService.matchRoute(pathname);
  const params: RouteDataParams = matchedRoute
    ? RouterService.routeParams(matchedRoute.path, pathname)
    : {
        routeParams: {},
        searchParams: {},
      };
  const searchParams = matchedRoute ? RouterService.searchParams(fullUrl.search) : {};
  params.searchParams = searchParams;
  params.request = options?.requestContext;

  let preloadedData: Record<string, unknown> = { is_success: true };
  const getData = matchedRoute?.Component?.getData;
  if (typeof getData === 'function') {
    try {
      preloadedData = await getData(params);
    } catch (e) {
      console.error(`SSR getData failed for ${matchedRoute?.path}:`, e);
      preloadedData = { ...preloadedData, is_success: false };
    }
  }

  const inner = (
    <StaticRouter location={url}>
      <RouteDataProvider
        initialData={preloadedData}
        initialRoute={matchedRoute}
        initialParams={params}
      >
        <AppRoutes />
      </RouteDataProvider>
    </StaticRouter>
  );

  const app = options?.wrap ? options.wrap(inner) : inner;
  const html = renderToString(app);
  return { html, preloadedData };
}
