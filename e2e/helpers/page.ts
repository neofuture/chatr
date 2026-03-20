import { expect, type Page } from '@playwright/test';

export async function waitForProfilePageReady(page: Page) {
  await page.goto('/app/profile', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-testid="field-displayName"]')).toBeVisible();
}
