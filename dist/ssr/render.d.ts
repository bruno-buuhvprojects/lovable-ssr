import type { ReactNode } from 'react';
export interface RenderResult {
    html: string;
    preloadedData: Record<string, unknown>;
}
export interface RenderOptions {
    wrap?: (children: ReactNode) => ReactNode;
}
/**
 * Renders the app for a single URL. Called once per request with that request's URL.
 * getServerData is invoked only for the route that matches this URL (never for all routes).
 */
export declare function render(url: string, options?: RenderOptions): Promise<RenderResult>;
//# sourceMappingURL=render.d.ts.map