import { jsx as _jsx } from "react/jsx-runtime";
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import RouterService from '../router/RouterService.js';
import { RouteDataProvider } from '../router/RouteDataContext.js';
import { AppRoutes } from '../components/AppRoutes.js';
/**
 * Renders the app for a single URL. Called once per request with that request's URL.
 * getServerData is invoked only for the route that matches this URL (never for all routes).
 */
export async function render(url, options) {
    const fullUrl = new URL(url, 'http://localhost');
    const pathname = fullUrl.pathname || '/';
    const matchedRoute = RouterService.matchRoute(pathname);
    const params = matchedRoute ? RouterService.routeParams(matchedRoute.path, pathname) : {
        routeParams: {},
        searchParams: {},
    };
    const searchParams = matchedRoute ? RouterService.searchParams(fullUrl.search) : {};
    params.searchParams = searchParams;
    let preloadedData = { is_success: true };
    const getServerData = matchedRoute?.Component?.getServerData;
    if (typeof getServerData === 'function') {
        try {
            preloadedData = await getServerData(params);
        }
        catch (e) {
            console.error(`SSR getServerData failed for ${matchedRoute?.path}:`, e);
            preloadedData = { ...preloadedData, is_success: false };
        }
    }
    const inner = (_jsx(StaticRouter, { location: url, children: _jsx(RouteDataProvider, { initialData: preloadedData, initialRoute: matchedRoute, initialParams: params, children: _jsx(AppRoutes, {}) }) }));
    const app = options?.wrap ? options.wrap(inner) : inner;
    const html = renderToString(app);
    return { html, preloadedData };
}
