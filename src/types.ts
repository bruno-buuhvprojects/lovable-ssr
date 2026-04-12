import { IncomingHttpHeaders } from 'node:http';
import type React from 'react';

export type ComponentWithGetData = React.ComponentType<any> & {
  getData?: (params?: RouteDataParams) => Promise<Record<string, unknown>>;
};

export type SitemapChangefreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

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
  getEntries?: (ctx: { siteUrl: string }) => Promise<SitemapEntry[]>;
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

export function parseCookies(raw: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!raw) return cookies;
  raw.split(';').forEach((part) => {
    const [k, ...rest] = part.split('=');
    if (!k) return;
    const key = k.trim();
    if (!key) return;
    cookies[key] = decodeURIComponent(rest.join('=').trim());
  });
  return cookies;
}

export function buildRequestContext(req: {
  headers: IncomingHttpHeaders;
  method: string;
  originalUrl: string;
}): RequestContext {
  const cookiesRaw = (req.headers.cookie as string) ?? '';
  return {
    cookiesRaw,
    cookies: parseCookies(cookiesRaw),
    headers: req.headers,
    method: req.method,
    url: req.originalUrl,
  };
}

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

export type MiddlewareFn = (
  ctx: MiddlewareContext
) => Promise<MiddlewareResponse | void> | MiddlewareResponse | void;