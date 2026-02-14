import { type ReactNode } from 'react';
export type RouteDataState = Record<string, Record<string, unknown>>;
export declare function buildRouteKey(path: string, params: Record<string, string>): string;
interface RouteDataContextValue {
    data: RouteDataState;
    setData: (routeKey: string, value: Record<string, unknown>) => void;
}
export interface InitialRouteShape {
    path: string;
}
interface RouteDataProviderProps {
    children: ReactNode;
    initialData?: Record<string, unknown>;
    initialRoute?: InitialRouteShape;
    initialParams?: Record<'routeParams' | 'searchParams', Record<string, string>>;
}
export declare function RouteDataProvider({ children, initialData, initialRoute, initialParams, }: RouteDataProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useRouteData(): RouteDataContextValue;
export {};
//# sourceMappingURL=RouteDataContext.d.ts.map