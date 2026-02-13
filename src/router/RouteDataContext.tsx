import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type RouteDataState = Record<string, Record<string, unknown>>;

export function buildRouteKey(path: string, params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, k) => ({ ...acc, [k]: params[k] }), {} as Record<string, string>);
  return `${path}|${JSON.stringify(sorted)}`;
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
  initialParams?: Record<string, string>;
}

export function RouteDataProvider({
  children,
  initialData,
  initialRoute,
  initialParams = {},
}: RouteDataProviderProps) {
  const initialKey =
    initialRoute && initialData !== undefined
      ? buildRouteKey(initialRoute.path, initialParams)
      : null;

  const [data, setDataState] = useState<RouteDataState>(() =>
    initialKey !== null && initialData !== undefined ? { [initialKey]: initialData } : {}
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
