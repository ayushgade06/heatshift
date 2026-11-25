import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4318', channel: 'chrome' }, // uses the installed Chrome
  webServer: { command: 'npm run build && npx vite preview --port 4318 --strictPort', url: 'http://localhost:4318', reuseExistingServer: true, timeout: 120_000 },
});
