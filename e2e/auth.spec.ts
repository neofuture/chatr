import { test, expect, Page } from '@playwright/test';
import { apiLogin, TEST_USERS } from './helpers/auth';

test.use({ storageState: { cookies: [], origins: [] } });

async function openLoginPanel(page: Page) {
  const userMenu = page.getByLabel('User menu');
  if (await userMenu.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await userMenu.click();
    const loginItem = page.getByText('Login').first();
    await expect(loginItem).toBeVisible({ timeout: 3_000 });
    await loginItem.click();
  } else {
    const hamburger = page.locator('button[class*="hamburger"]');
    await expect(hamburger).toBeVisible({ timeout: 3_000 });
    await hamburger.click();
    const loginBtn = page.getByRole('button', { name: /Login/i });
    await expect(loginBtn).toBeVisible({ timeout: 3_000 });
    await loginBtn.click();
  }

  await expect(page.getByPlaceholder(/email|username/i)).toBeVisible({ timeout: 10_000 });
}

test.describe('Authentication', () => {
  test.describe.configure({ mode: 'serial' });

  test('API login with OTP bypass returns token', async ({ request }) => {
    const result = await apiLogin(request, TEST_USERS.userA);
    expect(result.token).toBeTruthy();
    expect(result.user).toBeTruthy();
    expect(result.user.email).toBe(TEST_USERS.userA.email);
  });

  test('redirects unauthenticated user to home', async ({ page }) => {
    await page.goto('/app');
    await page.waitForURL(url => !url.toString().includes('/app'), { timeout: 15_000 });
    expect(page.url()).not.toContain('/app');
  });

  test('login panel opens from avatar dropdown', async ({ page }) => {
    await page.goto('/');
    await openLoginPanel(page);

    await expect(page.getByPlaceholder(/email|username/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/');
    await openLoginPanel(page);

    await page.getByPlaceholder(/email|username/i).fill(TEST_USERS.userA.email);
    await page.locator('input[type="password"]').fill('WrongPassword123!');

    const signInBtn = page.getByRole('button', { name: /sign in/i });
    await expect(signInBtn).toBeVisible({ timeout: 5_000 });
    await signInBtn.click();

    await expect(page.getByText('Invalid credentials').first()).toBeVisible({ timeout: 15_000 });
  });
});
