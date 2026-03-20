import { test, expect, request as playwrightRequest } from '@playwright/test';
import { readStoredAuth } from './helpers/auth';
import * as api from './helpers/api';
import { getAssetPath } from './helpers/test-assets';

const storedA = readStoredAuth('a');

let originalProfileImage: string | null = null;
let originalCoverImage: string | null = null;
const snapshot = api.loadProfileSnapshot('a');

test.describe('User Profile', () => {

  test.beforeAll(async () => {
    const ctx = await playwrightRequest.newContext();
    try {
      const me = await api.getMe(ctx, storedA.token);
      originalProfileImage = me.profileImage ?? null;
      originalCoverImage = me.coverImage ?? null;
    } finally {
      await ctx.dispose();
    }
  });

  test.afterAll(async () => {
    const ctx = await playwrightRequest.newContext();
    try {
      if (snapshot) {
        await api.retryCleanup(() =>
          api.updateProfile(ctx, storedA.token, api.pickProfileRestore(snapshot))
        );
      }
      await api.retryCleanup(() =>
        api.restoreImages(ctx, storedA.token, {
          profileImage: originalProfileImage,
          coverImage: originalCoverImage,
        })
      );
    } catch {
      // Best-effort — global teardown also restores profiles
    } finally {
      await ctx.dispose();
    }
  });

  test('profile page loads and shows user info', async ({ page, request }) => {
    const token = storedA.token;
    const me = await api.getMe(request, token);

    await page.goto('/app/profile');
    await expect(page.getByText(`@${me.username?.replace(/^@/, '')}`).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Profile').first()).toBeVisible();
    await expect(page.getByText('Account').first()).toBeVisible();
  });

  test('set display name via UI', async ({ page, request }) => {
    const token = storedA.token;
    const before = await api.getMe(request, token);

    await page.goto('/app/profile');
    const fieldRow = page.locator('[data-testid="field-displayName"]');
    const btn = fieldRow.locator('button').first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();

    const input = fieldRow.locator('input').first();
    await expect(input).toBeVisible({ timeout: 3_000 });

    await input.fill('E2E DisplayName');
    await input.blur();

    // Wait for save — either "Saved" indicator or verify via API
    await page.getByText('Saved').first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});

    const after = await api.getMe(request, token);
    expect(after.displayName).toBe('E2E DisplayName');
    await expect(page.getByText('E2E DisplayName').first()).toBeVisible({ timeout: 5_000 });

    await api.updateProfile(request, token, { displayName: before.displayName ?? null });
  });

  test('set first name via UI', async ({ page, request }) => {
    const token = storedA.token;
    const before = await api.getMe(request, token);

    await page.goto('/app/profile');
    const fieldRow = page.locator('[data-testid="field-firstName"]');
    const btn = fieldRow.locator('button').first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();

    const input = fieldRow.locator('input').first();
    await expect(input).toBeVisible({ timeout: 3_000 });

    await input.fill('Alexander');
    await input.blur();

    await page.getByText('Saved').first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});

    const after = await api.getMe(request, token);
    expect(after.firstName).toBe('Alexander');

    await api.updateProfile(request, token, { firstName: before.firstName ?? null });
  });

  test('set last name via UI', async ({ page, request }) => {
    const token = storedA.token;
    const before = await api.getMe(request, token);

    await page.goto('/app/profile');
    const fieldRow = page.locator('[data-testid="field-lastName"]');
    const btn = fieldRow.locator('button').first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();

    const input = fieldRow.locator('input').first();
    await expect(input).toBeVisible({ timeout: 3_000 });

    await input.fill('Testington');
    await input.blur();

    await page.getByText('Saved').first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});

    const after = await api.getMe(request, token);
    expect(after.lastName).toBe('Testington');

    await api.updateProfile(request, token, { lastName: before.lastName ?? null });
  });

  test('set gender via UI', async ({ page, request }) => {
    const token = storedA.token;
    const before = await api.getMe(request, token);

    const target = before.gender === 'male' ? 'female' : 'male';
    const expectedLabel = target === 'male' ? 'Male' : 'Female';
    if (before.gender === target) {
      await api.updateProfile(request, token, { gender: target === 'male' ? 'female' : 'male' });
    }

    await page.goto('/app/profile');
    const fieldRow = page.locator('[data-testid="field-gender"]');
    const btn = fieldRow.locator('button').first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();

    const select = fieldRow.locator('select').first();
    await expect(select).toBeVisible({ timeout: 3_000 });
    await select.selectOption(target);

    await page.getByText('Saved').first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});

    const after = await api.getMe(request, token);
    expect(after.gender).toBe(target);

    await expect(fieldRow.getByText(expectedLabel)).toBeVisible({ timeout: 5_000 });

    await api.updateProfile(request, token, { gender: before.gender ?? null });
  });

  test('upload profile image via UI', async ({ page }) => {
    await page.goto('/app/profile');

    const avatarSection = page.locator('[data-testid="profile-avatar"]');
    const cameraBtn = avatarSection.locator('button:has(i.fa-camera)').first();
    await expect(cameraBtn).toBeVisible({ timeout: 10_000 });
    await cameraBtn.click();

    await expect(page.getByText('Upload New Picture').first()).toBeVisible({ timeout: 5_000 });

    const fileInput = avatarSection.locator('input[type="file"]');
    await fileInput.setInputFiles(getAssetPath('test-image.png'));

    const backdrop = page.locator('[class*="backdrop"]').first();
    if (await backdrop.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await backdrop.click({ force: true });
    }

    const cropperHeading = page.getByRole('heading', { name: /Adjust Your Profile Image/i });
    await expect(cropperHeading).toBeVisible({ timeout: 15_000 });

    const uploadBtn = page.locator('button:has-text("Upload")').filter({ hasNotText: 'New Picture' }).first();
    await expect(uploadBtn).toBeVisible({ timeout: 5_000 });
    await uploadBtn.click();

    // Wait for cropper to close (upload complete)
    await expect(cropperHeading).toBeHidden({ timeout: 15_000 });
  });

  test('upload cover image via UI', async ({ page }) => {
    await page.goto('/app/profile');

    const coverSection = page.locator('[data-testid="profile-cover"]');
    const cameraBtn = coverSection.locator('button:has(i.fa-camera)').first();
    await expect(cameraBtn).toBeVisible({ timeout: 10_000 });
    await cameraBtn.click();

    await expect(page.getByText('Upload New Picture').first()).toBeVisible({ timeout: 5_000 });

    const fileInput = coverSection.locator('input[type="file"]');
    await fileInput.setInputFiles(getAssetPath('test-cover.png'));

    const backdrop = page.locator('[class*="backdrop"]').first();
    if (await backdrop.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await backdrop.click({ force: true });
    }

    const cropperHeading = page.getByRole('heading', { name: /Adjust Your Cover Image/i });
    await expect(cropperHeading).toBeVisible({ timeout: 15_000 });

    const uploadBtn = page.locator('button:has-text("Upload")').filter({ hasNotText: 'New Picture' }).first();
    await expect(uploadBtn).toBeVisible({ timeout: 5_000 });
    await uploadBtn.click();

    await expect(cropperHeading).toBeHidden({ timeout: 15_000 });
  });

  test('update profile fields via API and verify round-trip', async ({ request }) => {
    const token = storedA.token;
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

    const me = await api.getMe(request, token);
    expect(me.displayName).toBe('API DisplayName Test');
    expect(me.firstName).toBe('APIFirst');
    expect(me.lastName).toBe('APILast');
    expect(me.gender).toBe('non-binary');

    await api.updateProfile(request, token, {
      displayName: before.displayName ?? null,
      firstName: before.firstName ?? null,
      lastName: before.lastName ?? null,
      gender: before.gender ?? null,
    });
  });

  test('cycle through all gender options via API', async ({ request }) => {
    const token = storedA.token;
    const before = await api.getMe(request, token);

    const genders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
    for (const g of genders) {
      await api.updateProfile(request, token, { gender: g });
      const me = await api.getMe(request, token);
      expect(me.gender).toBe(g);
    }

    await api.updateProfile(request, token, { gender: null });
    const cleared = await api.getMe(request, token);
    expect(cleared.gender).toBeNull();

    await api.updateProfile(request, token, { gender: before.gender ?? null });
  });

  test('profile data persists after page reload', async ({ page, request }) => {
    const token = storedA.token;
    const before = await api.getMe(request, token);

    await api.updateProfile(request, token, {
      displayName: 'Persist Test Name',
      gender: 'female',
    });

    await page.goto('/app/profile');
    await expect(page.getByText('Persist Test Name').first()).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(page.getByText('Persist Test Name').first()).toBeVisible({ timeout: 10_000 });

    const genderRow = page.locator('[data-testid="field-gender"]');
    await expect(genderRow.getByText('Female')).toBeVisible({ timeout: 5_000 });

    await api.updateProfile(request, token, {
      displayName: before.displayName ?? null,
      gender: before.gender ?? null,
    });
  });
});
