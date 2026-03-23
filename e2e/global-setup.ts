import { test as setup } from '@playwright/test';
import { apiLogin, TEST_USERS, injectAuth } from './helpers/auth';
import { ensureTestAssets } from './helpers/test-assets';
import * as api from './helpers/api';
import path from 'path';
import fs from 'fs';

const AUTH_DIR = path.join(__dirname, '.auth');
const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';

setup('enable test mode', async ({ request }) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await request.post(`${API}/api/test/mode`, {
        headers: { 'Content-Type': 'application/json' },
        data: { enabled: true },
        timeout: 10_000,
      });
      if (res.ok()) break;
    } catch {
      if (attempt === 4) throw new Error('Backend not reachable after 5 attempts');
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  await request.post(`${API}/api/test/cleanup-all`).catch(() => {});
});

setup('authenticate as user A', async ({ page, request }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  ensureTestAssets();

  const result = await apiLogin(request, TEST_USERS.userA);

  try {
    const profile = await api.getMe(request, result.token);
    fs.writeFileSync(
      path.join(AUTH_DIR, 'profile-snapshot-a.json'),
      JSON.stringify(profile, null, 2),
    );
  } catch {
    // Profile snapshot is best-effort (used for cleanup restoration only)
  }

  await injectAuth(page, result);
  await page.goto('/app');
  await page.waitForURL(/\/app/, { timeout: 15_000 });

  await page.context().storageState({ path: path.join(AUTH_DIR, 'user-a.json') });
});

setup('authenticate as user B', async ({ page, request }) => {
  const result = await apiLogin(request, TEST_USERS.userB);

  try {
    const profile = await api.getMe(request, result.token);
    fs.writeFileSync(
      path.join(AUTH_DIR, 'profile-snapshot-b.json'),
      JSON.stringify(profile, null, 2),
    );
  } catch {
    // Profile snapshot is best-effort (used for cleanup restoration only)
  }

  await injectAuth(page, result);
  await page.goto('/app');
  await page.waitForURL(/\/app/, { timeout: 15_000 });

  await page.context().storageState({ path: path.join(AUTH_DIR, 'user-b.json') });
});
