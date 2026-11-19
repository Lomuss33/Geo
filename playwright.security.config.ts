import { defineConfig } from '@playwright/test';
import production from './playwright.config';

// Exercise Vite's optimized dependency path as well as the Pages production build.
export default defineConfig({
  ...production,
  testMatch: 'attribution-security.spec.ts',
  use: { ...production.use, baseURL: 'http://127.0.0.1:6004/' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 6004',
    port: 6004,
    reuseExistingServer: false,
  },
});
