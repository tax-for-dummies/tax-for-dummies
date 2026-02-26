import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
