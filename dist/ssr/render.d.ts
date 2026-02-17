import type { ReactNode } from 'react';
import { RequestContext } from '../types.js';
export interface RenderResult {
    html: string;
    preloadedData: Record<string, unknown>;
}
export interface RenderOptions {
    wrap?: (children: ReactNode) => ReactNode;
    /**
     * Contexto opcional da request (ex.: cookies, headers).
     * O servidor pode preencher isso e o getData recebe via params.request.
     */
    requestContext?: RequestContext;
}
/**
 * Renders the app for a single URL. Called once per request with that request's URL.
 * getData is invoked only for the route that matches this URL (never for all routes).
 */
export declare function render(url: string, options?: RenderOptions): Promise<RenderResult>;
//# sourceMappingURL=render.d.ts.map