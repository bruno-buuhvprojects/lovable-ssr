import { jsx as _jsx } from "react/jsx-runtime";
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { AppRoutes } from '../components/AppRoutes.js';
import { RouteDataProvider } from '../router/RouteDataContext.js';
import RouterService from '../router/RouterService.js';
/**
 * Renders the app for a single URL. Called once per request with that request's URL.
 * getData is invoked only for the route that matches this URL (never for all routes).
 */
export async function render(url, options) {
    const fullUrl = new URL(url, 'http://localhost');
    const pathname = fullUrl.pathname || '/';
    const matchedRoute = RouterService.matchRoute(pathname);
    const params = matchedRoute
        ? RouterService.routeParams(matchedRoute.path, pathname)
        : {
            routeParams: {},
            searchParams: {},
        };
    const searchParams = matchedRoute ? RouterService.searchParams(fullUrl.search) : {};
    params.searchParams = searchParams;
    params.request = options?.requestContext;
    let preloadedData = { is_success: true };
    const getData = matchedRoute?.Component?.getData;
    if (typeof getData === 'function') {
        try {
            preloadedData = await getData(params);
        }
        catch (e) {
            console.error(`SSR getData failed for ${matchedRoute?.path}:`, e);
            preloadedData = { ...preloadedData, is_success: false };
        }
    }
    const inner = (_jsx(StaticRouter, { location: url, children: _jsx(RouteDataProvider, { initialData: preloadedData, initialRoute: matchedRoute, initialParams: params, children: _jsx(AppRoutes, {}) }) }));
    const app = options?.wrap ? options.wrap(inner) : inner;
    const html = renderToString(app);
    return { html, preloadedData };
}
