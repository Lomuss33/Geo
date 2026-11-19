import { defineConfig, devices } from '@playwright/test';

const testPort = Number(process.env.GEO_E2E_PORT ?? 6002);
if (!Number.isInteger(testPort) || testPort < 1024 || testPort > 65535) {
  throw new Error('GEO_E2E_PORT must be an integer between 1024 and 65535.');
}

export default defineConfig({
  testDir: './tests',
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${testPort}/Geo/`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-webgl',
            '--ignore-gpu-blocklist',
            '--use-angle=swiftshader',
          ],
        },
      },
    },
    ...(process.env.GEO_E2E_FIREFOX === '1'
      ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }]
      : []),
  ],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${testPort}`,
    port: testPort,
    reuseExistingServer: false,
  },
});
