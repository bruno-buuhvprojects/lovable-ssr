import { describe, it, expect } from 'vitest';
import { parseCookies, buildRequestContext } from '../../src/types.js';

describe('parseCookies', () => {
  it('returns empty object for empty string', () => {
    expect(parseCookies('')).toEqual({});
  });

  it('parses a single cookie', () => {
    expect(parseCookies('token=abc123')).toEqual({ token: 'abc123' });
  });

  it('parses multiple cookies', () => {
    expect(parseCookies('a=1; b=2; c=3')).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('handles values containing =', () => {
    expect(parseCookies('data=a=b=c')).toEqual({ data: 'a=b=c' });
  });

  it('decodes URI-encoded values', () => {
    expect(parseCookies('name=%C3%A9l%C3%A8ve')).toEqual({ name: 'élève' });
  });

  it('ignores empty keys from leading/trailing semicolons', () => {
    expect(parseCookies('  ; ; a=1')).toEqual({ a: '1' });
  });
});

describe('buildRequestContext', () => {
  it('builds context from request-like object', () => {
    const req = {
      headers: { cookie: 'token=xyz', host: 'localhost' } as any,
      method: 'GET',
      originalUrl: '/dashboard?tab=settings',
    };
    const ctx = buildRequestContext(req);

    expect(ctx.cookiesRaw).toBe('token=xyz');
    expect(ctx.cookies).toEqual({ token: 'xyz' });
    expect(ctx.headers).toBe(req.headers);
    expect(ctx.method).toBe('GET');
    expect(ctx.url).toBe('/dashboard?tab=settings');
  });

  it('handles missing cookie header', () => {
    const req = {
      headers: {} as any,
      method: 'POST',
      originalUrl: '/api/data',
    };
    const ctx = buildRequestContext(req);

    expect(ctx.cookiesRaw).toBe('');
    expect(ctx.cookies).toEqual({});
  });
});
