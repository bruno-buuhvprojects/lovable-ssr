import { test, expect } from '@playwright/test';

test.describe('SSR navigation', () => {
  test('SSR page loads with server data', async ({ page }) => {
    await page.goto('/page-a');
    await expect(page.getByTestId('page-a')).toHaveText('Server Data A');
  });

  test('__PRELOADED_DATA__ is injected in SSR HTML', async ({ request }) => {
    const response = await request.get('/page-a');
    const html = await response.text();
    expect(html).toContain('window.__PRELOADED_DATA__=');
    expect(html).toContain('"message":"Server Data A"');
  });

  test('client-side navigation to non-SSR page works', async ({ page }) => {
    await page.goto('/page-a');
    await page.getByTestId('link-to-b').click();
    await expect(page.getByTestId('page-b')).toBeVisible();
  });

  test('SSR page retains data after client navigation and back', async ({ page }) => {
    // 1. Load Page A via SSR
    await page.goto('/page-a');
    await expect(page.getByTestId('page-a')).toHaveText('Server Data A');

    // 2. Navigate to Page B via client-side link
    await page.getByTestId('link-to-b').click();
    await expect(page.getByTestId('page-b')).toBeVisible();

    // 3. Navigate back to Page A
    await page.goBack();

    // 4. Verify Page A still has its data
    await expect(page.getByTestId('page-a')).toHaveText('Server Data A');
  });

  test('SSR page retains data after forward-back via links', async ({ page }) => {
    // 1. Load Page A via SSR
    await page.goto('/page-a');
    await expect(page.getByTestId('page-a')).toHaveText('Server Data A');

    // 2. Navigate to Page B
    await page.getByTestId('link-to-b').click();
    await expect(page.getByTestId('page-b')).toBeVisible();

    // 3. Navigate back to Page A via link (not browser back)
    await page.getByTestId('link-to-a').click();
    await expect(page.getByTestId('page-a')).toHaveText('Server Data A');
  });
});
