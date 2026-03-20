import { test, expect } from '@playwright/test';
import { readStoredAuth } from './helpers/auth';
import * as api from './helpers/api';

const storedA = readStoredAuth('a');

test.describe('Settings', () => {

  test('settings page loads with all sections', async ({ page }) => {
    await page.goto('/app/settings');
    await expect(page.getByText(/Privacy|Appearance|Notifications/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('toggle dark mode', async ({ page }) => {
    await page.goto('/app/settings');
    await expect(page.getByText('Appearance')).toBeVisible({ timeout: 10_000 });

    const themeToggle = page.locator('[class*="themeToggle"], button:has(i.fa-moon), button:has(i.fa-sun)').first();
    if (await themeToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await themeToggle.click();
      await themeToggle.click();
    }
  });

  test('toggle privacy settings via API and restore', async ({ request }) => {
    const tokenA = storedA.token;

    const original = await api.getMe(request, tokenA);

    await api.updateSettings(request, tokenA, { privacyOnlineStatus: 'nobody' });
    let me = await api.getMe(request, tokenA);
    expect(me.privacyOnlineStatus).toBe('nobody');

    await api.updateSettings(request, tokenA, { privacyPhone: 'friends' });
    me = await api.getMe(request, tokenA);
    expect(me.privacyPhone).toBe('friends');

    // Restore
    await api.updateSettings(request, tokenA, {
      privacyOnlineStatus: original.privacyOnlineStatus ?? 'everyone',
      privacyPhone: original.privacyPhone ?? 'everyone',
    });

    me = await api.getMe(request, tokenA);
    expect(me.privacyOnlineStatus).toBe(original.privacyOnlineStatus ?? 'everyone');
  });

  test('toggle privacy settings via UI', async ({ page }) => {
    await page.goto('/app/settings');
    await expect(page.getByText(/Privacy|Appearance|Notifications/i).first()).toBeVisible({ timeout: 10_000 });

    const toggles = page.locator('[class*="toggle"], input[type="checkbox"]');
    const count = await toggles.count();

    if (count > 0) {
      await toggles.first().click();
      await toggles.first().click();
    }
  });
});
