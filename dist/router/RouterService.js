import { getRoutes } from '../registry.js';
function matchPath(pathPattern, pathname) {
    if (pathPattern === '*')
        return true;
    if (pathPattern === pathname)
        return true;
    const segments = pathname.split('/').filter(Boolean);
    const patternSegments = pathPattern.split('/').filter(Boolean);
    if (segments.length !== patternSegments.length)
        return false;
    return patternSegments.every((p, i) => p.startsWith(':') || p === segments[i]);
}
function isSsrRoute(pathname) {
    const routes = getRoutes();
    return routes.filter((r) => r.isSSR).some((route) => matchPath(route.path, pathname));
}
function matchRoute(pathname) {
    const routes = getRoutes();
    for (const route of routes) {
        if (matchPath(route.path, pathname))
            return route;
    }
    return routes.find((r) => r.path === '*');
}
function routeParams(routePath, pathname) {
    const pathSegments = pathname?.split('/').filter(Boolean) || [];
    const patternSegments = routePath.split('/').filter(Boolean);
    const params = {
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
function searchParams(pathname) {
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
