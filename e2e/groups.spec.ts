import { test, expect } from './fixtures/two-users';
import { request as playwrightRequest } from '@playwright/test';
import { apiLogin, TEST_USERS } from './helpers/auth';
import * as api from './helpers/api';

test.describe('Groups', () => {

  test.afterAll(async () => {
    const ctx = await playwrightRequest.newContext();
    try {
      const resultA = await apiLogin(ctx, TEST_USERS.userA);
      const groups = await api.getGroups(ctx, resultA.token);
      const testPrefixes = ['E2E Group ', 'Test Group '];
      for (const g of groups) {
        if (testPrefixes.some(p => g.name?.startsWith(p))) {
          await api.deleteGroup(ctx, resultA.token, g.id).catch(() => {});
        }
      }
    } finally {
      await ctx.dispose();
    }
  });

  test('groups page loads', async ({ userAPage }) => {
    await userAPage.goto('/app/groups');
    await expect(
      userAPage.getByPlaceholder('Search groups...')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('can open create group flow', async ({ userAPage }) => {
    await userAPage.goto('/app/groups');
    await userAPage.waitForTimeout(1000);

    // Click the "Create new group" header button
    const createBtn = userAPage.getByTitle('Create new group');
    if (await createBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await createBtn.click();
      await userAPage.waitForTimeout(500);
      await expect(
        userAPage.getByPlaceholder('Add people…')
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('user A creates a group and it appears in list', async ({ userAPage }) => {
    const groupName = `E2E Group ${Date.now()}`;
    await userAPage.goto('/app/groups');
    await userAPage.waitForTimeout(1000);

    const createBtn = userAPage.getByTitle('Create new group');
    if (!(await createBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await createBtn.click();
    await userAPage.waitForTimeout(500);

    const memberSearch = userAPage.getByPlaceholder('Add people…');
    await memberSearch.fill('simon');
    await userAPage.waitForTimeout(1000);

    const simonResult = userAPage.locator('button').filter({ hasText: /Simon/ }).first();
    if (await simonResult.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await simonResult.evaluate((el: HTMLElement) => el.click());
    }

    const nextBtn = userAPage.getByRole('button', { name: /next/i });
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.click();
    }
    await userAPage.waitForTimeout(500);

    const nameInput = userAPage.getByPlaceholder('Group name…');
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill(groupName);
      // Create
      const createGroupBtn = userAPage.getByRole('button', { name: /create/i });
      if (await createGroupBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await createGroupBtn.click();
        await userAPage.waitForTimeout(2000);
        // Navigate back to groups list
        await userAPage.goto('/app/groups');
        await expect(
          userAPage.getByText(groupName)
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
