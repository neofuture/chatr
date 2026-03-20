import { defineConfig, devices } from '@playwright/test';

const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const IS_CI = !!process.env.CI;
const RUN_MOBILE = true;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: IS_CI,
  retries: 2,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list'], ['json', { outputFile: 'e2e-results.json' }], ['./e2e/cache-reporter.ts']],
  timeout: 90_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    { name: 'setup', testMatch: /global-setup\.ts/, teardown: 'teardown' },
    { name: 'teardown', testMatch: /global-teardown\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user-a.json',
      },
      dependencies: ['setup'],
    },
    ...(RUN_MOBILE ? [{
      name: 'mobile',
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium' as const,
        storageState: 'e2e/.auth/user-a.json',
      },
      dependencies: ['setup'],
    }] : []),
  ],

  webServer: [
    {
      command: 'cd backend && npm run dev',
      url: `${BACKEND_URL}/api/health`,
      reuseExistingServer: true,
      timeout: 60_000,
      env: { NODE_ENV: 'development' },
    },
    {
      command: 'cd frontend && npm run dev',
      url: FRONTEND_URL,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
