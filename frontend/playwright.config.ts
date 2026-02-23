import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './visual-tests',
  timeout: 30_000,
  expect: {
    toMatchSnapshot: { threshold: 0.2 },
  },
  use: {
    baseURL: 'http://localhost:3001',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npm run dev -- --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

