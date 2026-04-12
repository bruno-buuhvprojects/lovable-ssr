import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BrowserRouteDataProvider } from '../../src/components/BrowserRouteDataProvider.js';
import { AppRoutes } from '../../src/components/AppRoutes.js';
import './test-routes.js';

function App() {
  return (
    <BrowserRouter>
      <BrowserRouteDataProvider>
        <AppRoutes />
      </BrowserRouteDataProvider>
    </BrowserRouter>
  );
}

const rootEl = document.getElementById('root')!;
if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, <App />);
} else {
  createRoot(rootEl).render(<App />);
}
