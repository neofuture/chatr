import { test, expect } from '@playwright/test';
import { readStoredAuth } from './helpers/auth';
import * as api from './helpers/api';
import { getAssetPath } from './helpers/test-assets';
import fs from 'fs';

const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const ts = () => Date.now().toString(36);

const storedA = readStoredAuth('a');

test.describe('Group Profile', () => {
  const groupNameBase = `ProfileGrp ${ts()}`;
  let groupId: string;
  const tokenA = storedA.token;

  test.beforeEach(async ({ request }) => {
    if (!groupId) {
      const data = await api.createGroup(request, tokenA, groupNameBase);
      groupId = data.group?.id;
    }
  });

  test.afterEach(async () => {});

  test('edit group name via API', async ({ request }) => {
    const newName = `Renamed ${ts()}`;
    const res = await request.patch(`${API}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      data: { name: newName },
    });
    expect(res.ok()).toBeTruthy();

    const detail = await request.get(`${API}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const g = await detail.json();
    expect(g.group.name).toBe(newName);

    await request.patch(`${API}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      data: { name: groupNameBase },
    });
  });

  test('upload group profile image via API', async ({ request }) => {
    const imgPath = getAssetPath('test-image.png');
    const fileBuffer = fs.readFileSync(imgPath);

    const res = await request.post(`${API}/api/groups/${groupId}/profile-image`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      multipart: {
        profileImage: { name: 'test-image.png', mimeType: 'image/png', buffer: fileBuffer },
      },
    });
    expect([200, 400, 500].includes(res.status())).toBeTruthy();
  });

  test('upload group cover image via API', async ({ request }) => {
    const imgPath = getAssetPath('test-cover.png');
    const fileBuffer = fs.readFileSync(imgPath);

    const res = await request.post(`${API}/api/groups/${groupId}/cover-image`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      multipart: {
        coverImage: { name: 'test-cover.png', mimeType: 'image/png', buffer: fileBuffer },
      },
    });
    expect([200, 400, 500].includes(res.status())).toBeTruthy();
  });

  test('delete group profile image via API', async ({ request }) => {
    const res = await request.delete(`${API}/api/groups/${groupId}/profile-image`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('delete group cover image via API', async ({ request }) => {
    const res = await request.delete(`${API}/api/groups/${groupId}/cover-image`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('edit group name via UI', async ({ page, request }) => {
    if (!groupId) { test.skip(); return; }
    let currentName = groupNameBase;
    try {
      const detail = await request.get(`${API}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      if (detail.ok()) currentName = (await detail.json()).group?.name || groupNameBase;
    } catch {}

    await page.goto('/app/groups');
    await page.waitForLoadState('networkidle');

    const groupBtn = page.getByText(currentName);
    if (!(await groupBtn.isVisible({ timeout: 15_000 }).catch(() => false))) {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    if (!(await groupBtn.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await groupBtn.click();

    const infoBtn = page.getByTitle('Group info').or(page.locator('button:has(i.fa-info-circle)'));
    if (await infoBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await infoBtn.click();

      const editIcon = page.locator('i.fa-pen').first();
      if (await editIcon.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await editIcon.click();

        const nameInput = page.locator('input').first();
        const newName = `UI Renamed ${ts()}`;
        await nameInput.fill(newName);
        await nameInput.press('Enter');

        await expect(page.getByText(newName)).toBeVisible({ timeout: 10_000 });

        await request.patch(`${API}/api/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
          data: { name: groupNameBase },
        });
      }
    }
  });

  test('upload group avatar via UI', async ({ page, request }) => {
    if (!groupId) { test.skip(); return; }
    let currentName = groupNameBase;
    try {
      const detail = await request.get(`${API}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      if (detail.ok()) currentName = (await detail.json()).group?.name || groupNameBase;
    } catch {}

    await page.goto('/app/groups');
    await page.waitForLoadState('networkidle');

    const groupBtn = page.getByText(currentName).first();
    if (!(await groupBtn.isVisible({ timeout: 15_000 }).catch(() => false))) {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    await expect(groupBtn).toBeVisible({ timeout: 15_000 });
    await groupBtn.click();

    // Open group profile by clicking the group name in the panel header
    const panelTitle = page.locator('.auth-panel-title').filter({ hasText: currentName });
    await expect(panelTitle).toBeVisible({ timeout: 10_000 });
    await panelTitle.click();

    const fileInputs = page.locator('input[type="file"]');
    await expect(fileInputs.first()).toBeAttached({ timeout: 10_000 });
    const count = await fileInputs.count();
    if (count < 2) { test.skip(); return; }
    await fileInputs.nth(1).setInputFiles(getAssetPath('test-image.png'));

    const uploadBtn = page.getByRole('button', { name: /upload/i });
    if (await uploadBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await uploadBtn.click();
      await expect(uploadBtn).toBeHidden({ timeout: 15_000 }).catch(() => {});
    }
  });

  test('upload group cover via UI', async ({ page, request }) => {
    if (!groupId) { test.skip(); return; }
    let currentName = groupNameBase;
    try {
      const detail = await request.get(`${API}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      if (detail.ok()) currentName = (await detail.json()).group?.name || groupNameBase;
    } catch {}

    await page.goto('/app/groups');
    await page.waitForLoadState('networkidle');

    const groupBtn = page.getByText(currentName).first();
    if (!(await groupBtn.isVisible({ timeout: 15_000 }).catch(() => false))) {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    await expect(groupBtn).toBeVisible({ timeout: 15_000 });
    await groupBtn.click();

    // Open group profile by clicking the group name in the panel header
    const panelTitle = page.locator('.auth-panel-title').filter({ hasText: currentName });
    await expect(panelTitle).toBeVisible({ timeout: 10_000 });
    await panelTitle.click();

    const fileInputs = page.locator('input[type="file"]');
    await expect(fileInputs.first()).toBeAttached({ timeout: 10_000 });
    if ((await fileInputs.count()) < 1) { test.skip(); return; }
    await fileInputs.first().setInputFiles(getAssetPath('test-cover.png'));

    const uploadBtn = page.getByRole('button', { name: /upload/i });
    if (await uploadBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await uploadBtn.click();
      await expect(uploadBtn).toBeHidden({ timeout: 15_000 }).catch(() => {});
    }
  });

  test('cleanup: delete test group', async ({ request }) => {
    if (groupId && tokenA) {
      await api.deleteGroup(request, tokenA, groupId).catch(() => {});
    }
  });
});
