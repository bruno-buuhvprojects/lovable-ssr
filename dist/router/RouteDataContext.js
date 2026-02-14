import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useMemo, useState, } from 'react';
export function buildRouteKey(path, params) {
    const sorted = Object.keys(params)
        .sort()
        .reduce((acc, k) => ({ ...acc, [k]: params[k] }), {});
    return `${path}|${JSON.stringify(sorted)}`;
}
const RouteDataContext = createContext(null);
export function RouteDataProvider({ children, initialData, initialRoute, initialParams = {
    routeParams: {},
    searchParams: {},
}, }) {
    const initialKey = initialRoute && Object.keys(initialData ?? {}).length > 0
        ? buildRouteKey(initialRoute.path, initialParams.routeParams)
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
