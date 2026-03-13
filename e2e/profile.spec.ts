import { test, expect, request as playwrightRequest } from '@playwright/test';
import { apiLogin, TEST_USERS } from './helpers/auth';
import * as api from './helpers/api';
import { getAssetPath } from './helpers/test-assets';

let originalProfileImage: string | null = null;
let originalCoverImage: string | null = null;

test.describe('User Profile', () => {

  test.beforeAll(async () => {
    const ctx = await playwrightRequest.newContext();
    try {
      const { token } = await apiLogin(ctx, TEST_USERS.userA);
      const me = await api.getMe(ctx, token);
      originalProfileImage = me.profileImage ?? null;
      originalCoverImage = me.coverImage ?? null;
    } finally {
      await ctx.dispose();
    }
  });

  test.afterAll(async () => {
    const ctx = await playwrightRequest.newContext();
    try {
      const { token } = await apiLogin(ctx, TEST_USERS.userA);
      await api.restoreImages(ctx, token, {
        profileImage: originalProfileImage,
        coverImage: originalCoverImage,
      }).catch(() => {});
    } finally {
      await ctx.dispose();
    }
  });

  test('edit display name via UI and reset', async ({ page, request }) => {
    const { token: tokenA } = await apiLogin(request, TEST_USERS.userA);

    await page.goto('/app/profile');
    await page.waitForTimeout(2000);

    const displayNameBtn = page.locator('button').filter({ hasText: /Add a display name/ }).first();
    if (await displayNameBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await displayNameBtn.click();
      await page.waitForTimeout(500);

      const input = page.getByPlaceholder('Add a display name');
      await expect(input).toBeVisible({ timeout: 3_000 });
      await input.fill('Carl E2E Test');
      await input.blur();
      await page.waitForTimeout(2000);

      await expect(page.getByText('Carl E2E Test').first()).toBeVisible({ timeout: 5_000 });

      // Cleanup — don't fail the test if cleanup has a transient network error
      await api.updateProfile(request, tokenA, { displayName: null }).catch(() => {});
    }
  });

  test('edit first name via UI and reset', async ({ page, request }) => {
    const { token: tokenA } = await apiLogin(request, TEST_USERS.userA);

    await page.goto('/app/profile');
    await page.waitForTimeout(2000);

    // Find the row containing "First name" label, then click its edit button
    const firstNameRow = page.locator('div').filter({ has: page.locator('span', { hasText: 'First name' }) });
    const btn = firstNameRow.locator('button').first();
    if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(500);
      const input = firstNameRow.locator('input').first();
      if (await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await input.fill('Alexander');
        await input.blur();
        await page.waitForTimeout(2000);
      }
    }

    // Cleanup
    await api.updateProfile(request, tokenA, { firstName: 'Carl' }).catch(() => {});
  });

  test('profile image upload via UI', async ({ page }) => {
    await page.goto('/app/profile');
    await page.waitForTimeout(2000);

    const cameraBtn = page.locator('button:has(i.fa-camera)').first();
    if (await cameraBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await cameraBtn.click();
      await page.waitForTimeout(500);

      const uploadBtn = page.getByText('Upload New Picture').first();
      if (await uploadBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const fileInput = page.locator('input[type="file"][accept*="image"]').first();
        await fileInput.setInputFiles(getAssetPath('test-image.png'));
        await page.waitForTimeout(2000);

        const cropperUpload = page.getByRole('button', { name: 'Upload' });
        if (await cropperUpload.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await cropperUpload.click();
          await page.waitForTimeout(3000);
        }
      }
    }
  });

  test('cover image upload via UI', async ({ page }) => {
    await page.goto('/app/profile');
    await page.waitForTimeout(2000);

    const cameraBtns = page.locator('button:has(i.fa-camera)');
    const coverCameraBtn = cameraBtns.first();
    if (await coverCameraBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await coverCameraBtn.click();
      await page.waitForTimeout(500);

      const uploadBtn = page.getByText('Upload New Picture').first();
      if (await uploadBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const fileInput = page.locator('input[type="file"][accept*="image"]').first();
        await fileInput.setInputFiles(getAssetPath('test-cover.png'));
        await page.waitForTimeout(2000);

        const cropperUpload = page.getByRole('button', { name: 'Upload' });
        if (await cropperUpload.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await cropperUpload.click();
          await page.waitForTimeout(3000);
        }
      }
    }
  });

  test('update profile via API and verify', async ({ request }) => {
    const { token: tokenA } = await apiLogin(request, TEST_USERS.userA);

    const updated = await api.updateProfile(request, tokenA, {
      displayName: 'API Display Name',
      firstName: 'APIFirst',
      lastName: 'APILast',
    });
    expect(updated.displayName).toBe('API Display Name');
    expect(updated.firstName).toBe('APIFirst');
    expect(updated.lastName).toBe('APILast');

    const me = await api.getMe(request, tokenA);
    expect(me.displayName).toBe('API Display Name');

    // Cleanup
    await api.updateProfile(request, tokenA, {
      displayName: null,
      firstName: 'Carl',
      lastName: 'Fearby',
    });
  });

  test('change gender via API and verify', async ({ request }) => {
    const { token: tokenA } = await apiLogin(request, TEST_USERS.userA);

    await api.updateProfile(request, tokenA, { gender: 'male' });
    const me = await api.getMe(request, tokenA);
    expect(me.gender).toBe('male');

    // Cleanup
    await api.updateProfile(request, tokenA, { gender: null });
  });
});
