import { defineConfig, devices } from '@playwright/test';
import production from './playwright.config';

const dev = process.env.GEO_MATRIX_DEV === '1';

export default defineConfig({
  ...production,
  testMatch: ['viewport-matrix.spec.ts', 'renderer-regressions.spec.ts'],
  timeout: 60_000,
  projects: [
    production.projects![0]!,
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  use: {
    ...production.use,
    ...(dev ? { baseURL: 'http://127.0.0.1:6005/' } : {}),
  },
  webServer: dev
    ? {
        command: 'npm run dev -- --host 127.0.0.1 --port 6005',
        port: 6005,
        reuseExistingServer: false,
      }
    : production.webServer,
});
