import { test, expect, request as playwrightRequest } from '@playwright/test';
import { apiLogin, TEST_USERS } from './helpers/auth';
import * as api from './helpers/api';
import { getAssetPath } from './helpers/test-assets';

let originalProfileImage: string | null = null;
let originalCoverImage: string | null = null;
const snapshot = api.loadProfileSnapshot('a');

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
      if (snapshot) {
        await api.retryCleanup(() =>
          api.updateProfile(ctx, token, api.pickProfileRestore(snapshot))
        );
      }
      await api.retryCleanup(() =>
        api.restoreImages(ctx, token, {
          profileImage: originalProfileImage,
          coverImage: originalCoverImage,
        })
      );
    } finally {
      await ctx.dispose();
    }
  });

  // ── Profile page loads ───────────────────────────────────────────────

  test('profile page loads and shows user info', async ({ page, request }) => {
    const { token } = await apiLogin(request, TEST_USERS.userA);
    const me = await api.getMe(request, token);

    await page.goto('/app/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(`@${me.username?.replace(/^@/, '')}`).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Profile').first()).toBeVisible();
    await expect(page.getByText('Account').first()).toBeVisible();
  });

  // ── Display name ─────────────────────────────────────────────────────

  test('set display name via UI', async ({ page, request }) => {
    const { token } = await apiLogin(request, TEST_USERS.userA);
    const before = await api.getMe(request, token);

    await page.goto('/app/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const fieldRow = page.locator('[data-testid="field-displayName"]');
    const btn = fieldRow.locator('button').first();
    await expect(btn).toBeVisible({ timeout: 5_000 });
    await btn.click();

    const input = fieldRow.locator('input').first();
    await expect(input).toBeVisible({ timeout: 3_000 });

    await input.fill('E2E DisplayName');
    await input.blur();

    await expect(page.getByText('Saved').first()).toBeVisible({ timeout: 10_000 });

    const after = await api.getMe(request, token);
    expect(after.displayName).toBe('E2E DisplayName');

    await expect(page.getByText('E2E DisplayName').first()).toBeVisible({ timeout: 5_000 });

    // Restore
    await api.updateProfile(request, token, { displayName: before.displayName ?? null });
  });

  // ── First name ───────────────────────────────────────────────────────

  test('set first name via UI', async ({ page, request }) => {
    const { token } = await apiLogin(request, TEST_USERS.userA);
    const before = await api.getMe(request, token);

    await page.goto('/app/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const fieldRow = page.locator('[data-testid="field-firstName"]');
    const btn = fieldRow.locator('button').first();
    await expect(btn).toBeVisible({ timeout: 5_000 });
    await btn.click();

    const input = fieldRow.locator('input').first();
    await expect(input).toBeVisible({ timeout: 3_000 });

    await input.fill('Alexander');
    await input.blur();

    await expect(page.getByText('Saved').first()).toBeVisible({ timeout: 10_000 });

    const after = await api.getMe(request, token);
    expect(after.firstName).toBe('Alexander');

    await api.updateProfile(request, token, { firstName: before.firstName ?? null });
  });

  // ── Last name ────────────────────────────────────────────────────────

  test('set last name via UI', async ({ page, request }) => {
    const { token } = await apiLogin(request, TEST_USERS.userA);
    const before = await api.getMe(request, token);

    await page.goto('/app/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const fieldRow = page.locator('[data-testid="field-lastName"]');
    const btn = fieldRow.locator('button').first();
    await expect(btn).toBeVisible({ timeout: 5_000 });
    await btn.click();

    const input = fieldRow.locator('input').first();
    await expect(input).toBeVisible({ timeout: 3_000 });

    await input.fill('Testington');
    await input.blur();

    await expect(page.getByText('Saved').first()).toBeVisible({ timeout: 10_000 });

    const after = await api.getMe(request, token);
    expect(after.lastName).toBe('Testington');

    await api.updateProfile(request, token, { lastName: before.lastName ?? null });
  });

  // ── Gender ───────────────────────────────────────────────────────────

  test('set gender via UI', async ({ page, request }) => {
    const { token } = await apiLogin(request, TEST_USERS.userA);
    const before = await api.getMe(request, token);

    // Ensure starting value differs from target so the save triggers
    const target = before.gender === 'male' ? 'female' : 'male';
    const expectedLabel = target === 'male' ? 'Male' : 'Female';
    if (before.gender === target) {
      await api.updateProfile(request, token, { gender: target === 'male' ? 'female' : 'male' });
    }

    await page.goto('/app/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const fieldRow = page.locator('[data-testid="field-gender"]');
    const btn = fieldRow.locator('button').first();
    await expect(btn).toBeVisible({ timeout: 5_000 });
    await btn.click();

    const select = fieldRow.locator('select').first();
    await expect(select).toBeVisible({ timeout: 3_000 });
    await select.selectOption(target);

    await expect(page.getByText('Saved').first()).toBeVisible({ timeout: 10_000 });

    const after = await api.getMe(request, token);
    expect(after.gender).toBe(target);

    await expect(fieldRow.getByText(expectedLabel)).toBeVisible({ timeout: 5_000 });

    await api.updateProfile(request, token, { gender: before.gender ?? null });
  });

  // ── Profile image upload via UI ──────────────────────────────────────

  test('upload profile image via UI', async ({ page }) => {
    await page.goto('/app/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const avatarWrap = page.locator('[data-testid="profile-avatar"]');
    const cameraBtn = avatarWrap.locator('button:has(i.fa-camera)').first();
    await expect(cameraBtn).toBeVisible({ timeout: 5_000 });
    await cameraBtn.click();

    // Should show upload option
    const uploadBtn = page.getByText('Upload New Picture').first();
    await expect(uploadBtn).toBeVisible({ timeout: 5_000 });

    // Set file via the avatar uploader's file input (scoped to avoid cover uploader)
    const fileInput = avatarWrap.locator('input[type="file"]');
    await fileInput.setInputFiles(getAssetPath('test-image.png'));

    // Cropper should appear with Upload button
    const cropperUpload = page.locator('[data-testid="cropper-upload"]');
    await expect(cropperUpload).toBeVisible({ timeout: 10_000 });
    await cropperUpload.click();

    // Wait for upload to complete
    await page.waitForTimeout(3000);
  });

  // ── Cover image upload via UI ────────────────────────────────────────

  test('upload cover image via UI', async ({ page }) => {
    await page.goto('/app/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const coverWrap = page.locator('[data-testid="profile-cover"]');
    const cameraBtn = coverWrap.locator('button:has(i.fa-camera)').first();
    await expect(cameraBtn).toBeVisible({ timeout: 5_000 });
    await cameraBtn.click();

    const uploadBtn = page.getByText('Upload New Picture').first();
    await expect(uploadBtn).toBeVisible({ timeout: 5_000 });

    // Set file via the cover uploader's file input (scoped to avoid avatar uploader)
    const fileInput = coverWrap.locator('input[type="file"]');
    await fileInput.setInputFiles(getAssetPath('test-cover.png'));

    // Cropper should appear with Upload button
    const cropperUpload = page.locator('[data-testid="cropper-upload"]');
    await expect(cropperUpload).toBeVisible({ timeout: 10_000 });
    await cropperUpload.click();

    await page.waitForTimeout(3000);
  });

  // ── API: update profile and verify ───────────────────────────────────

  test('update profile fields via API and verify round-trip', async ({ request }) => {
    const { token } = await apiLogin(request, TEST_USERS.userA);
    const before = await api.getMe(request, token);

    const updated = await api.updateProfile(request, token, {
      displayName: 'API DisplayName Test',
      firstName: 'APIFirst',
      lastName: 'APILast',
      gender: 'non-binary',
    });
    expect(updated.displayName).toBe('API DisplayName Test');
    expect(updated.firstName).toBe('APIFirst');
    expect(updated.lastName).toBe('APILast');
    expect(updated.gender).toBe('non-binary');

    // Verify via GET
    const me = await api.getMe(request, token);
    expect(me.displayName).toBe('API DisplayName Test');
    expect(me.firstName).toBe('APIFirst');
    expect(me.lastName).toBe('APILast');
    expect(me.gender).toBe('non-binary');

    // Restore
    await api.updateProfile(request, token, {
      displayName: before.displayName ?? null,
      firstName: before.firstName ?? null,
      lastName: before.lastName ?? null,
      gender: before.gender ?? null,
    });
  });

  // ── API: gender values ───────────────────────────────────────────────

  test('cycle through all gender options via API', async ({ request }) => {
    const { token } = await apiLogin(request, TEST_USERS.userA);
    const before = await api.getMe(request, token);

    const genders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
    for (const g of genders) {
      await api.updateProfile(request, token, { gender: g });
      const me = await api.getMe(request, token);
      expect(me.gender).toBe(g);
    }

    // Clear gender
    await api.updateProfile(request, token, { gender: null });
    const cleared = await api.getMe(request, token);
    expect(cleared.gender).toBeNull();

    // Restore
    await api.updateProfile(request, token, { gender: before.gender ?? null });
  });

  // ── Profile data persists across reload ──────────────────────────────

  test('profile data persists after page reload', async ({ page, request }) => {
    const { token } = await apiLogin(request, TEST_USERS.userA);
    const before = await api.getMe(request, token);

    // Set known values via API
    await api.updateProfile(request, token, {
      displayName: 'Persist Test Name',
      gender: 'female',
    });

    // Load profile page
    await page.goto('/app/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.getByText('Persist Test Name').first()).toBeVisible({ timeout: 10_000 });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Data should still be there
    await expect(page.getByText('Persist Test Name').first()).toBeVisible({ timeout: 10_000 });

    const genderRow = page.locator('[data-testid="field-gender"]');
    await expect(genderRow.getByText('Female')).toBeVisible({ timeout: 5_000 });

    // Restore
    await api.updateProfile(request, token, {
      displayName: before.displayName ?? null,
      gender: before.gender ?? null,
    });
  });
});
