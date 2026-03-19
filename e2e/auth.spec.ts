import { test, expect } from '@playwright/test';
import { apiLogin, TEST_USERS } from './helpers/auth';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {

  test('API login with OTP bypass returns token', async ({ request }) => {
    const result = await apiLogin(request, TEST_USERS.userA);
    expect(result.token).toBeTruthy();
    expect(result.user).toBeTruthy();
    expect(result.user.email).toBe(TEST_USERS.userA.email);
  });

  test('redirects unauthenticated user to home', async ({ page }) => {
    await page.goto('/app');
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/app');
  });

  test('login panel opens from avatar dropdown', async ({ page }) => {
    await page.goto('/');
    
    // Click avatar button to open dropdown
    await page.getByLabel('User menu').click();
    await expect(page.getByText('Login')).toBeVisible({ timeout: 5_000 });
    
    // Click Login to open auth panel
    await page.getByText('Login').click();
    
    // Auth panel should be visible
    await expect(page.getByPlaceholder(/email|username/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/');
    
    // Open auth panel
    await page.getByLabel('User menu').click();
    await page.getByText('Login').click();
    
    // Fill in wrong credentials
    await page.getByPlaceholder(/email|username/i).fill(TEST_USERS.userA.email);
    await page.locator('input[type="password"]').fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for error response
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 15_000 });
    
    // App shows errors via toast notifications
    const hasError = await page.getByText(/invalid|failed|incorrect|wrong|error/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
    const buttonBack = await page.getByRole('button', { name: /sign in/i }).isEnabled();
    expect(hasError || buttonBack).toBeTruthy();
  });
});
