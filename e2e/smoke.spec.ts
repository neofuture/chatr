import { test, expect } from '@playwright/test';

test.describe('Smoke tests (authenticated)', () => {

  test('loads the chats page', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByPlaceholder('Search messages...')).toBeVisible({ timeout: 10_000 });
  });

  test('bottom nav is visible with all tabs', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByRole('link', { name: 'CHATS' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'FRIENDS' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'GROUPS' })).toBeVisible();
  });

  test('can navigate to friends page', async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('link', { name: 'FRIENDS' }).click();
    await expect(page).toHaveURL(/\/app\/friends/);
    await expect(page.getByPlaceholder('Search people…')).toBeVisible({ timeout: 10_000 });
  });

  test('can navigate to groups page', async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('link', { name: 'GROUPS' }).click();
    await expect(page).toHaveURL(/\/app\/groups/);
    await expect(page.getByPlaceholder('Search groups...')).toBeVisible({ timeout: 10_000 });
  });

  test('can navigate to settings', async ({ page }) => {
    await page.goto('/app/settings');
    await expect(page.getByText('Appearance')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('can navigate to profile', async ({ page }) => {
    await page.goto('/app/profile');
    await expect(page.getByRole('heading', { name: 'Profile' }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('friends page has tabs', async ({ page }) => {
    await page.goto('/app/friends');
    await expect(page.getByRole('button', { name: 'Friends' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Blocked' })).toBeVisible();
  });

  test('friends search works', async ({ page }) => {
    await page.goto('/app/friends');
    const search = page.getByPlaceholder('Search people…');
    await expect(search).toBeVisible({ timeout: 10_000 });
    await search.fill('simon');
    await expect(page.getByText(/simon/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('conversations search works', async ({ page }) => {
    await page.goto('/app');
    const search = page.getByPlaceholder('Search messages...');
    await expect(search).toBeVisible({ timeout: 10_000 });
    await search.fill('hello');
    await expect(search).toHaveValue('hello');
  });

  test('sign out works', async ({ page }) => {
    await page.goto('/app/settings');
    const signOutBtn = page.getByRole('button', { name: 'Sign out' });
    await expect(signOutBtn).toBeVisible({ timeout: 10_000 });
    await signOutBtn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
