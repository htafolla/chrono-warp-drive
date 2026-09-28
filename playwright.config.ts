import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Default `npx playwright test` is the local claims-paused spec only.
  // Live prod specs: PLAYWRIGHT_LIVE=1 npx playwright test e2e/vortex.spec.ts e2e/validate.spec.ts
  testMatch: process.env.PLAYWRIGHT_LIVE === '1' ? '**/*.spec.ts' : '**/claims-paused.spec.ts',
  timeout: 180000,
  retries: 1,
  workers: 1,
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 8080',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'placeholder-public-anon-key',
    },
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    baseURL: 'http://127.0.0.1:8080',
  },
});
