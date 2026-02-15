import React, { useEffect } from 'react';
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
  params.searchParams = RouterService.searchParams(location.search ?? '');
  const routeKey = matchedRoute ? buildRouteKey(matchedRoute.path, params.routeParams, params.searchParams) : '';
  const { data, setData } = useRouteData();
  const currentData = routeKey ? data[routeKey] : undefined;
  const getServerData = matchedRoute?.Component?.getServerData;

  useEffect(() => {
    if (!routeKey || !getServerData || currentData !== undefined) return;
    getServerData(params)
      .then((d) => setData(routeKey, d))
      .catch((e) => {
        console.error('Client getServerData failed:', e);
        setData(routeKey, {});
      });
  }, [routeKey, getServerData, params, currentData, setData]);

  return (
    <Routes>
      {routes.map((route) => {
        const isMatched = matchedRoute === route;
        const getServerDataForRoute = route.Component.getServerData;
        let element: React.ReactNode;

        if (isMatched) {
          if (typeof getServerDataForRoute === 'function') {
            element =
              currentData !== undefined ? (
                <route.Component {...currentData} />
              ) : null;
          } else {
            element = <route.Component />;
          }
        } else {
          element = <route.Component />;
        }

        return <Route key={route.path} path={route.path} element={element} />;
      })}
    </Routes>
  );
}
