import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
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
