import type { RouteConfig } from '../types.js';
declare function matchPath(pathPattern: string, pathname: string): boolean;
declare function isSsrRoute(pathname: string): boolean;
declare function matchRoute(pathname: string): RouteConfig | undefined;
declare function routeParams(routePath: string, pathname?: string): Record<'routeParams' | 'searchParams', Record<string, string>>;
declare function searchParams(pathname: string): Record<string, string>;
declare const RouterService: {
    isSsrRoute: typeof isSsrRoute;
    matchPath: typeof matchPath;
    matchRoute: typeof matchRoute;
    routeParams: typeof routeParams;
    searchParams: typeof searchParams;
};
export default RouterService;
//# sourceMappingURL=RouterService.d.ts.map