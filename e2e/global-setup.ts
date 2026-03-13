import { test as setup } from '@playwright/test';
import { apiLogin, TEST_USERS, injectAuth } from './helpers/auth';
import { ensureTestAssets } from './helpers/test-assets';
import path from 'path';
import fs from 'fs';

const AUTH_DIR = path.join(__dirname, '.auth');
const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';

setup('enable test mode', async ({ request }) => {
  await request.post(`${API}/api/test/mode`, {
    headers: { 'Content-Type': 'application/json' },
    data: { enabled: true },
  });
});

setup('authenticate as user A', async ({ page, request }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  ensureTestAssets();

  const result = await apiLogin(request, TEST_USERS.userA);

  await injectAuth(page, result);
  await page.goto('/app');
  await page.waitForURL(/\/app/, { timeout: 15_000 });

  await page.context().storageState({ path: path.join(AUTH_DIR, 'user-a.json') });
});

setup('authenticate as user B', async ({ page, request }) => {
  const result = await apiLogin(request, TEST_USERS.userB);

  await injectAuth(page, result);
  await page.goto('/app');
  await page.waitForURL(/\/app/, { timeout: 15_000 });

  await page.context().storageState({ path: path.join(AUTH_DIR, 'user-b.json') });
});
