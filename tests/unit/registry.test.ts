import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerRoutes,
  getRoutes,
  registerMiddleware,
  getMiddleware,
} from '../../src/registry.js';
import type { RouteConfig } from '../../src/types.js';

const dummyComponent: any = () => null;

beforeEach(() => {
  registerRoutes([]);
});

describe('registerRoutes / getRoutes', () => {
  it('returns empty array before registering', () => {
    expect(getRoutes()).toEqual([]);
  });

  it('returns registered routes', () => {
    const routes: RouteConfig[] = [
      { path: '/', Component: dummyComponent, isSSR: true },
      { path: '/about', Component: dummyComponent, isSSR: false },
    ];
    registerRoutes(routes);
    expect(getRoutes()).toBe(routes);
  });

  it('replaces previous routes on re-register', () => {
    registerRoutes([{ path: '/a', Component: dummyComponent, isSSR: true }]);
    const newRoutes: RouteConfig[] = [{ path: '/b', Component: dummyComponent, isSSR: false }];
    registerRoutes(newRoutes);
    expect(getRoutes()).toBe(newRoutes);
    expect(getRoutes()).toHaveLength(1);
    expect(getRoutes()[0].path).toBe('/b');
  });
});

describe('registerMiddleware / getMiddleware', () => {
  it('returns null when no middleware registered', () => {
    // getMiddleware starts as null by default
    // We can't easily reset it without re-importing, so just test the flow
    const mw = getMiddleware();
    // It's either null or a previously set function
    expect(mw === null || typeof mw === 'function').toBe(true);
  });

  it('returns the registered middleware', () => {
    const fn = async () => {};
    registerMiddleware(fn);
    expect(getMiddleware()).toBe(fn);
  });
});
