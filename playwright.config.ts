import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'node e2e/fixtures/start-server.mjs',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
