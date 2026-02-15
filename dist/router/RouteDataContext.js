import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useState, } from 'react';
/**
 * Builds a stable cache key for route data. Includes path, route params and optionally search params
 * so that the same path with different query strings (e.g. ?filter=FPS vs ?filter=RPG) gets different keys.
 */
export function buildRouteKey(path, routeParams, searchParams) {
    const sortedRoute = Object.keys(routeParams)
        .sort()
        .reduce((acc, k) => ({ ...acc, [k]: routeParams[k] }), {});
    let key = `${path}|${JSON.stringify(sortedRoute)}`;
    if (searchParams && Object.keys(searchParams).length > 0) {
        const sortedSearch = Object.keys(searchParams)
            .sort()
            .reduce((acc, k) => ({ ...acc, [k]: searchParams[k] }), {});
        key += `|${JSON.stringify(sortedSearch)}`;
    }
    return key;
}
const RouteDataContext = createContext(null);
export function RouteDataProvider({ children, initialData, initialRoute, initialParams = {
    routeParams: {},
    searchParams: {},
}, }) {
    const initialKey = initialRoute && Object.keys(initialData ?? {}).length > 0
        ? buildRouteKey(initialRoute.path, initialParams.routeParams, initialParams.searchParams)
        : null;
    const [data, setDataState] = useState(() => initialKey && initialData ? { [initialKey]: initialData } : {});
    const setData = useCallback((routeKey, value) => {
        setDataState((prev) => ({ ...prev, [routeKey]: value }));
    }, []);
    const value = useMemo(() => ({ data, setData }), [data, setData]);
    return (_jsx(RouteDataContext.Provider, { value: value, children: children }));
}
export function useRouteData() {
    const ctx = useContext(RouteDataContext);
    if (!ctx) {
        throw new Error('useRouteData must be used within RouteDataProvider');
    }
    return ctx;
}
