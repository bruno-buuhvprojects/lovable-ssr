import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { RouteDataParams } from '../types';

export type RouteDataState = Record<string, Record<string, unknown>>;

/**
 * Builds a stable cache key for route data. Includes path, route params and optionally search params
 * so that the same path with different query strings (e.g. ?filter=FPS vs ?filter=RPG) gets different keys.
 */
export function buildRouteKey(
  path: string,
  routeParams: Record<string, string>,
  searchParams?: Record<string, string>
): string {
  const sortedRoute = Object.keys(routeParams)
    .sort()
    .reduce((acc, k) => ({ ...acc, [k]: routeParams[k] }), {} as Record<string, string>);
  let key = `${path}|${JSON.stringify(sortedRoute)}`;
  if (searchParams && Object.keys(searchParams).length > 0) {
    const sortedSearch = Object.keys(searchParams)
      .sort()
      .reduce((acc, k) => ({ ...acc, [k]: searchParams[k] }), {} as Record<string, string>);
    key += `|${JSON.stringify(sortedSearch)}`;
  }
  return key;
}

interface RouteDataContextValue {
  data: RouteDataState;
  setData: (routeKey: string, value: Record<string, unknown>) => void;
}

const RouteDataContext = createContext<RouteDataContextValue | null>(null);

export interface InitialRouteShape {
  path: string;
}

interface RouteDataProviderProps {
  children: ReactNode;
  initialData?: Record<string, unknown>;
  initialRoute?: InitialRouteShape;
  initialParams?: RouteDataParams;
}

export function RouteDataProvider({
  children,
  initialData,
  initialRoute,
  initialParams = {
    routeParams: {},
    searchParams: {},
  },
}: RouteDataProviderProps) {
  const initialKey =
    initialRoute && Object.keys(initialData ?? {}).length > 0
      ? buildRouteKey(initialRoute.path, initialParams.routeParams, initialParams.searchParams)
      : null;

  const [data, setDataState] = useState<RouteDataState>(() =>
    initialKey && initialData ? { [initialKey]: initialData } : {}
  );

  const setData = useCallback((routeKey: string, value: Record<string, unknown>) => {
    setDataState((prev) => ({ ...prev, [routeKey]: value }));
  }, []);

  const value = useMemo(() => ({ data, setData }), [data, setData]);

  return (
    <RouteDataContext.Provider value={value}>{children}</RouteDataContext.Provider>
  );
}

export function useRouteData(): RouteDataContextValue {
  const ctx = useContext(RouteDataContext);
  if (!ctx) {
    throw new Error('useRouteData must be used within RouteDataProvider');
  }
  return ctx;
}
