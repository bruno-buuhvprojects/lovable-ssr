import type React from 'react';
export type ComponentWithGetServerData = React.ComponentType<any> & {
    getServerData?: (params?: Record<'routeParams' | 'searchParams', Record<string, string>>) => Promise<Record<string, unknown>>;
};
export type RouteConfig = {
    path: string;
    Component: ComponentWithGetServerData;
    isSSR: boolean;
};
//# sourceMappingURL=types.d.ts.map