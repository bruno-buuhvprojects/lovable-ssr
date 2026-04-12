import { IncomingHttpHeaders } from 'node:http';
import type React from 'react';
export type ComponentWithGetData = React.ComponentType<any> & {
    getData?: (params?: RouteDataParams) => Promise<Record<string, unknown>>;
};
export type SitemapChangefreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
export type SitemapEntry = {
    loc: string;
    lastmod?: string;
    changefreq?: SitemapChangefreq;
    priority?: number;
};
export type SitemapRouteConfig = {
    include: boolean;
    changefreq?: SitemapChangefreq;
    priority?: number;
    /** For dynamic routes (e.g. /video/:id): return all URLs for this pattern. */
    getEntries?: (ctx: {
        siteUrl: string;
    }) => Promise<SitemapEntry[]>;
};
export type RouteConfig = {
    path: string;
    Component: ComponentWithGetData;
    isSSR: boolean;
    sitemap?: SitemapRouteConfig;
};
export type RequestContext = {
    cookiesRaw: string;
    cookies: Record<string, string>;
    headers: IncomingHttpHeaders;
    method: string;
    url: string;
};
export declare function parseCookies(raw: string): Record<string, string>;
export declare function buildRequestContext(req: {
    headers: IncomingHttpHeaders;
    method: string;
    originalUrl: string;
}): RequestContext;
export type RouteDataParams = {
    routeParams: Record<string, string>;
    searchParams: Record<string, string>;
    request?: RequestContext;
};
export type MiddlewareContext = {
    request: RequestContext;
    route: RouteConfig | undefined;
    pathname: string;
    params: Omit<RouteDataParams, 'request'>;
};
export type MiddlewareResponse = {
    redirect?: string;
    status?: number;
    headers?: Record<string, string>;
    body?: string;
};
export type MiddlewareFn = (ctx: MiddlewareContext) => Promise<MiddlewareResponse | void> | MiddlewareResponse | void;
//# sourceMappingURL=types.d.ts.map