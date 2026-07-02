import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for BlackPayments Wallet
 * Production E2E testing configuration
 */
const env = process.env as Record<string, string | undefined>;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!env['CI'],
  retries: env['CI'] ? 2 : 0,
  workers: env['CI'] ? 1 : 1,
  reporter: 'html',
  use: {
    baseURL: env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !env['CI'],
    timeout: 120 * 1000,
  },
});
