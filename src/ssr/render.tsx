import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import type { ReactNode } from 'react';
import RouterService from '../router/RouterService.js';
import { RouteDataProvider } from '../router/RouteDataContext.js';
import { AppRoutes } from '../components/AppRoutes.js';

export interface RenderResult {
  html: string;
  preloadedData: Record<string, unknown>;
}

export interface RenderOptions {
  wrap?: (children: ReactNode) => ReactNode;
}

export async function render(url: string, options?: RenderOptions): Promise<RenderResult> {
  const fullUrl = new URL(url, 'http://localhost');
  const pathname = fullUrl.pathname || '/';
  const matchedRoute = RouterService.matchRoute(pathname);
  const params = matchedRoute ? RouterService.routeParams(matchedRoute.path, pathname) : {
    routeParams: {},
    searchParams: {},
  };
  const searchParams = matchedRoute ? RouterService.searchParams(fullUrl.search) : {};
  params.searchParams = searchParams;

  let preloadedData: Record<string, unknown> = { is_success: true };
  const getServerData = matchedRoute?.Component?.getServerData;
  if (typeof getServerData === 'function') {
    try {
      preloadedData = await getServerData(params);
    } catch (e) {
      console.error(`SSR getServerData failed for ${matchedRoute?.path}:`, e);
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
