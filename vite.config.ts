import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function getPagesBase() {
  const explicitBase = process.env.VITE_BASE_PATH;
  if (explicitBase) {
    return explicitBase.endsWith('/') ? explicitBase : `${explicitBase}/`;
  }

  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    return '/Geo/';
  }

  const [, repoName] = repository.split('/');
  if (!repoName || repoName.toLowerCase().endsWith('.github.io')) {
    return '/';
  }

  return `/${repoName}/`;
}

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? getPagesBase() : '/',
  server: { port: 6000, strictPort: true },
  preview: { port: 6001, strictPort: true },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'tests/**'],
  },
}));
