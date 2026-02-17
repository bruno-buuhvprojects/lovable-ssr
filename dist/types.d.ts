import { IncomingHttpHeaders } from 'node:http';
import type React from 'react';
export type ComponentWithGetData = React.ComponentType<any> & {
    getData?: (params?: RouteDataParams) => Promise<Record<string, unknown>>;
};
export type RouteConfig = {
    path: string;
    Component: ComponentWithGetData;
    isSSR: boolean;
};
export type RequestContext = {
    cookiesRaw: string;
    cookies: Record<string, string>;
    headers: IncomingHttpHeaders;
    method: string;
    url: string;
};
export type RouteDataParams = {
    routeParams: Record<string, string>;
    searchParams: Record<string, string>;
    request?: RequestContext;
};
//# sourceMappingURL=types.d.ts.map