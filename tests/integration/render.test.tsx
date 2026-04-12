import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerRoutes } from '../../src/registry.js';
import { render } from '../../src/ssr/render.js';
import { SEO } from '../../src/components/SEO.js';
import type { RouteConfig, RouteDataParams } from '../../src/types.js';

const SimplePage = () => <div>Hello World</div>;

const DataPage = ({ title }: { title: string }) => <div>{title}</div>;
(DataPage as any).getData = async () => ({ title: 'From Server' });

const SeoPage = () => (
  <>
    <SEO title="SEO Title" description="SEO Description" image="https://img.test/og.png" />
    <div>SEO Page</div>
  </>
);

const FailPage = () => <div>Fail</div>;
(FailPage as any).getData = async () => {
  throw new Error('getData error');
};

function makeRoutes(extra: RouteConfig[] = []): RouteConfig[] {
  return [
    { path: '/', Component: SimplePage as any, isSSR: true },
    { path: '/data', Component: DataPage as any, isSSR: true },
    { path: '/seo', Component: SeoPage as any, isSSR: true },
    { path: '/fail', Component: FailPage as any, isSSR: true },
    ...extra,
  ];
}

beforeEach(() => {
  registerRoutes(makeRoutes());
});

describe('render', () => {
  it('renders a simple component to HTML', async () => {
    const result = await render('/');
    expect(result.html).toContain('Hello World');
  });

  it('calls getData and includes data in preloadedData', async () => {
    const result = await render('/data');
    expect(result.html).toContain('From Server');
    expect(result.preloadedData).toEqual({ title: 'From Server' });
  });

  it('forwards routeParams to getData', async () => {
    const spy = vi.fn(async (params?: RouteDataParams) => ({
      id: params?.routeParams?.id ?? '',
    }));
    const ParamPage = ({ id }: { id: string }) => <div>{id}</div>;
    (ParamPage as any).getData = spy;

    registerRoutes([
      { path: '/video/:id', Component: ParamPage as any, isSSR: true },
    ]);

    const result = await render('/video/42');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]?.routeParams).toEqual({ id: '42' });
    expect(result.preloadedData).toEqual({ id: '42' });
  });

  it('forwards searchParams to getData', async () => {
    const spy = vi.fn(async (params?: RouteDataParams) => ({
      q: params?.searchParams?.q ?? '',
    }));
    const SearchPage = ({ q }: { q: string }) => <div>{q}</div>;
    (SearchPage as any).getData = spy;

    registerRoutes([
      { path: '/search', Component: SearchPage as any, isSSR: true },
    ]);

    const result = await render('/search?q=test');
    expect(spy.mock.calls[0][0]?.searchParams).toEqual({ q: 'test' });
    expect(result.preloadedData).toEqual({ q: 'test' });
  });

  it('forwards requestContext to getData', async () => {
    const spy = vi.fn(async (params?: RouteDataParams) => ({
      token: (params?.request as any)?.cookies?.auth_token ?? '',
    }));
    const AuthPage = ({ token }: { token: string }) => <div>{token}</div>;
    (AuthPage as any).getData = spy;

    registerRoutes([
      { path: '/auth', Component: AuthPage as any, isSSR: true },
    ]);

    const requestContext = {
      cookiesRaw: 'auth_token=secret',
      cookies: { auth_token: 'secret' },
      headers: {},
      method: 'GET',
      url: '/auth',
    } as any;

    await render('/auth', { requestContext });
    expect(spy.mock.calls[0][0]?.request).toBe(requestContext);
  });

  it('returns is_success: false when getData throws', async () => {
    const result = await render('/fail');
    expect(result.preloadedData.is_success).toBe(false);
  });

  it('captures SEO helmet from SEO component', async () => {
    const result = await render('/seo');
    expect(result.helmet).toBeDefined();
    expect(result.helmet?.title).toContain('SEO Title');
    expect(result.helmet?.meta).toContain('SEO Description');
    expect(result.helmet?.meta).toContain('og:image');
  });

  it('applies wrap option around the rendered tree', async () => {
    const result = await render('/', {
      wrap: (children) => <div data-wrapper="true">{children}</div>,
    });
    expect(result.html).toContain('data-wrapper="true"');
    expect(result.html).toContain('Hello World');
  });

  it('returns preloadedData with is_success for component without getData', async () => {
    const result = await render('/');
    expect(result.preloadedData).toEqual({ is_success: true });
  });
});
