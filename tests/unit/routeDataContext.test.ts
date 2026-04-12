import { describe, it, expect } from 'vitest';
import { buildRouteKey } from '../../src/router/RouteDataContext.js';

describe('buildRouteKey', () => {
  it('produces a deterministic key from path and params', () => {
    const key = buildRouteKey('/video/:id', { id: '42' });
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('same params produce the same key', () => {
    const a = buildRouteKey('/video/:id', { id: '42' });
    const b = buildRouteKey('/video/:id', { id: '42' });
    expect(a).toBe(b);
  });

  it('different params produce different keys', () => {
    const a = buildRouteKey('/video/:id', { id: '1' });
    const b = buildRouteKey('/video/:id', { id: '2' });
    expect(a).not.toBe(b);
  });

  it('includes search params in key when provided', () => {
    const without = buildRouteKey('/search', {});
    const with_ = buildRouteKey('/search', {}, { q: 'test' });
    expect(without).not.toBe(with_);
  });

  it('search params order does not affect key (sorted)', () => {
    const a = buildRouteKey('/search', {}, { a: '1', b: '2' });
    const b = buildRouteKey('/search', {}, { b: '2', a: '1' });
    expect(a).toBe(b);
  });

  it('empty search params produce same key as no search params', () => {
    const a = buildRouteKey('/page', { id: '1' });
    const b = buildRouteKey('/page', { id: '1' }, {});
    expect(a).toBe(b);
  });
});
