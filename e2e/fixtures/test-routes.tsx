import React from 'react';
import { Link } from 'react-router-dom';
import { registerRoutes } from '../../src/registry.js';
import type { RouteDataParams } from '../../src/types.js';

const PageA = ({ message }: { message: string }) => (
  <div>
    <h1 data-testid="page-a">{message}</h1>
    <Link to="/page-b" data-testid="link-to-b">Go to B</Link>
  </div>
);

async function getDataA(_params?: RouteDataParams) {
  return { message: 'Server Data A' };
}
(PageA as any).getData = getDataA;

const PageB = () => (
  <div>
    <h1 data-testid="page-b">Client Page B</h1>
    <Link to="/page-a" data-testid="link-to-a">Go to A</Link>
  </div>
);

const NotFound = () => <div data-testid="not-found">404</div>;

registerRoutes([
  { path: '/page-a', Component: PageA as any, isSSR: true },
  { path: '/page-b', Component: PageB as any, isSSR: false },
  { path: '*', Component: NotFound as any, isSSR: false },
]);
