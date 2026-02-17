import { type ReactNode } from 'react';
import { RouteDataParams } from '../types';
export type RouteDataState = Record<string, Record<string, unknown>>;
/**
 * Builds a stable cache key for route data. Includes path, route params and optionally search params
 * so that the same path with different query strings (e.g. ?filter=FPS vs ?filter=RPG) gets different keys.
 */
export declare function buildRouteKey(path: string, routeParams: Record<string, string>, searchParams?: Record<string, string>): string;
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
    initialParams?: RouteDataParams;
}
export declare function RouteDataProvider({ children, initialData, initialRoute, initialParams, }: RouteDataProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useRouteData(): RouteDataContextValue;
export {};
//# sourceMappingURL=RouteDataContext.d.ts.map