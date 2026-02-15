import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { getRoutes } from '../registry.js';
import { buildRouteKey, useRouteData } from '../router/RouteDataContext.js';
import RouterService from '../router/RouterService.js';
export function AppRoutes() {
    const location = useLocation();
    const pathname = location.pathname || '/';
    const routes = getRoutes();
    const matchedRoute = RouterService.matchRoute(pathname);
    const params = matchedRoute ? RouterService.routeParams(matchedRoute.path, pathname) : {
        routeParams: {},
        searchParams: {},
    };
    const routeKey = matchedRoute ? buildRouteKey(matchedRoute.path, params.routeParams) : '';
    const { data, setData } = useRouteData();
    const currentData = routeKey ? data[routeKey] : undefined;
    const getServerData = matchedRoute?.Component?.getServerData;
    params.searchParams = RouterService.searchParams(location.search ?? '');
    useEffect(() => {
        if (!routeKey || !getServerData || currentData !== undefined)
            return;
        getServerData(params)
            .then((d) => setData(routeKey, d))
            .catch((e) => {
            console.error('Client getServerData failed:', e);
            setData(routeKey, {});
        });
    }, [routeKey, getServerData, params, currentData, setData]);
    return (_jsx(Routes, { children: routes.map((route) => {
            const isMatched = matchedRoute === route;
            const getServerDataForRoute = route.Component.getServerData;
            let element;
            if (isMatched) {
                if (typeof getServerDataForRoute === 'function') {
                    element =
                        currentData !== undefined ? (_jsx(route.Component, { ...currentData })) : null;
                }
                else {
                    element = _jsx(route.Component, {});
                }
            }
            else {
                element = _jsx(route.Component, {});
            }
            return _jsx(Route, { path: route.path, element: element }, route.path);
        }) }));
}
