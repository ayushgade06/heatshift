import { defineConfig } from '@playwright/test';

// BASE_URL=https://… npm run test:e2e runs the suite against a deployed site.
const remote = process.env.BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { baseURL: remote ?? 'http://localhost:4318', channel: 'chrome' }, // uses the installed Chrome
  webServer: remote ? undefined : { command: 'npm run build && npx vite preview --port 4318 --strictPort', url: 'http://localhost:4318', reuseExistingServer: true, timeout: 120_000 },
});
