import './globals.js';
export type { RouteConfig, ComponentWithGetData, RouteDataParams } from './types.js';
export { registerRoutes, getRoutes } from './registry.js';
export { BrowserRouteDataProvider } from './components/BrowserRouteDataProvider.js';
export { default as RouterService } from './router/RouterService.js';
export {
  RouteDataProvider,
  useRouteData,
  buildRouteKey,
  type RouteDataState,
  type InitialRouteShape,
} from './router/RouteDataContext.js';
export { AppRoutes } from './components/AppRoutes.js';
export {
  render,
  type RenderResult,
  type RenderOptions,
} from './ssr/render.js';
