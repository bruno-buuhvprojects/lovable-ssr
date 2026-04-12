import { describe, it, expect, beforeEach } from 'vitest';
import RouterService from '../../src/router/RouterService.js';
import { registerRoutes } from '../../src/registry.js';
import type { RouteConfig } from '../../src/types.js';

const dummyComponent: any = () => null;

describe('RouterService.matchPath', () => {
  it('matches exact path', () => {
    expect(RouterService.matchPath('/', '/')).toBe(true);
    expect(RouterService.matchPath('/about', '/about')).toBe(true);
  });

  it('rejects mismatched path', () => {
    expect(RouterService.matchPath('/about', '/home')).toBe(false);
  });

  it('matches dynamic segment :id', () => {
    expect(RouterService.matchPath('/video/:id', '/video/123')).toBe(true);
  });

  it('rejects dynamic segment with extra depth', () => {
    expect(RouterService.matchPath('/video/:id', '/video/123/extra')).toBe(false);
  });

  it('wildcard * matches anything', () => {
    expect(RouterService.matchPath('*', '/anything/here')).toBe(true);
  });

  it('nested wildcard studio/* matches nested paths', () => {
    expect(RouterService.matchPath('studio/*', '/studio/profile/1')).toBe(true);
  });

  it('nested wildcard matches base path', () => {
    expect(RouterService.matchPath('studio/*', '/studio')).toBe(true);
  });

  it('matches multiple dynamic segments', () => {
    expect(RouterService.matchPath('/u/:userId/post/:postId', '/u/1/post/2')).toBe(true);
  });
});

describe('RouterService.matchRoute', () => {
  const routes: RouteConfig[] = [
    { path: '/', Component: dummyComponent, isSSR: true },
    { path: '/video/:id', Component: dummyComponent, isSSR: true },
    { path: '/search', Component: dummyComponent, isSSR: true },
    { path: 'studio/*', Component: dummyComponent, isSSR: true },
    { path: '/login', Component: dummyComponent, isSSR: false },
    { path: '*', Component: dummyComponent, isSSR: false },
  ];

  beforeEach(() => {
    registerRoutes(routes);
  });

  it('finds the correct route for /', () => {
    expect(RouterService.matchRoute('/')?.path).toBe('/');
  });

  it('finds the correct route for dynamic path', () => {
    expect(RouterService.matchRoute('/video/42')?.path).toBe('/video/:id');
  });

  it('finds the correct route for static path', () => {
    expect(RouterService.matchRoute('/search')?.path).toBe('/search');
  });

  it('finds wildcard route for nested studio path', () => {
    expect(RouterService.matchRoute('/studio/profile/test')?.path).toBe('studio/*');
  });

  it('falls back to * for unmatched path', () => {
    expect(RouterService.matchRoute('/unknown')?.path).toBe('*');
  });

  it('returns undefined when no wildcard and no match', () => {
    registerRoutes([{ path: '/only', Component: dummyComponent, isSSR: true }]);
    expect(RouterService.matchRoute('/other')).toBeUndefined();
  });
});

describe('RouterService.isSsrRoute', () => {
  beforeEach(() => {
    registerRoutes([
      { path: '/', Component: dummyComponent, isSSR: true },
      { path: '/video/:id', Component: dummyComponent, isSSR: true },
      { path: '/login', Component: dummyComponent, isSSR: false },
    ]);
  });

  it('returns true for SSR routes', () => {
    expect(RouterService.isSsrRoute('/')).toBe(true);
    expect(RouterService.isSsrRoute('/video/42')).toBe(true);
  });

  it('returns false for non-SSR routes', () => {
    expect(RouterService.isSsrRoute('/login')).toBe(false);
  });

  it('returns false for unregistered paths', () => {
    expect(RouterService.isSsrRoute('/nonexistent')).toBe(false);
  });
});

describe('RouterService.routeParams', () => {
  it('extracts :id from /video/:id', () => {
    const result = RouterService.routeParams('/video/:id', '/video/42');
    expect(result.routeParams).toEqual({ id: '42' });
    expect(result.searchParams).toEqual({});
  });

  it('extracts multiple dynamic params', () => {
    const result = RouterService.routeParams('/u/:userId/post/:postId', '/u/1/post/2');
    expect(result.routeParams).toEqual({ userId: '1', postId: '2' });
  });

  it('returns empty params for static route', () => {
    const result = RouterService.routeParams('/about', '/about');
    expect(result.routeParams).toEqual({});
  });
});

describe('RouterService.searchParams', () => {
  it('parses query string', () => {
    expect(RouterService.searchParams('?q=test&filter=FPS')).toEqual({
      q: 'test',
      filter: 'FPS',
    });
  });

  it('returns empty object for empty string', () => {
    expect(RouterService.searchParams('')).toEqual({});
  });

  it('handles query without leading ?', () => {
    expect(RouterService.searchParams('q=hello')).toEqual({ q: 'hello' });
  });
});
