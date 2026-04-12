import { render as frameworkRender } from '../../src/ssr/render.js';
import './test-routes.js';

export async function render(url: string, options?: { requestContext?: unknown }) {
  return frameworkRender(url, {
    requestContext: options?.requestContext as any,
  });
}
