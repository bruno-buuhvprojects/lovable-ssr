import { type Express } from 'express';
import type { MiddlewareFn } from '../types.js';
export interface RenderResult {
    html: string;
    preloadedData: Record<string, unknown>;
    helmet?: {
        title: string;
        meta: string;
        link: string;
        script: string;
    };
}
export interface CreateServerConfig {
    root: string;
    /** Path to the app entry-server module relative to root (e.g. 'src/entry-server.tsx') */
    entryPath: string;
    port?: number;
    /** Optional link tag to inject in dev for CSS (e.g. '<link rel="stylesheet" href="/src/index.css">') */
    cssLinkInDev?: string;
    /** Register routes before the SSR catch-all (e.g. sitemap.xml, robots.txt) */
    extraRoutes?: (app: Express) => void;
    /** Enable sitemap.xml and robots.txt from route registry. Routes with sitemap.include are included. */
    sitemap?: {
        siteUrl: string;
    };
    /** Middleware executed before rendering each route. If it returns a response, the route is not rendered. */
    middleware?: MiddlewareFn;
}
export declare function createServer(config: CreateServerConfig): Promise<{
    getApp: () => Express;
    listen: (port?: number, callback?: () => void) => void;
}>;
/** Standalone: run server when this file is executed (e.g. tsx packages/lovable-ssr/src/ssr/server.ts).
 * Set env ROOT, ENTRY_PATH, PORT or use defaults. */
export declare function runServer(config?: Partial<CreateServerConfig>): void;
//# sourceMappingURL=server.d.ts.map