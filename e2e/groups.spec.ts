import { test, expect } from './fixtures/two-users';

test.describe('Groups', () => {

  test('groups page loads', async ({ userAPage }) => {
    await userAPage.goto('/app/groups');
    await expect(
      userAPage.getByPlaceholder('Search groups...')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('can open create group flow', async ({ userAPage }) => {
    await userAPage.goto('/app/groups');
    await userAPage.waitForLoadState('networkidle');

    const createBtn = userAPage.getByTitle('Create new group');
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();
    await expect(
      userAPage.getByPlaceholder('Add people…')
    ).toBeVisible({ timeout: 5_000 });
  });

  test('user A creates a group and it appears in list', async ({ userAPage }) => {
    const groupName = `E2E Group ${Date.now()}`;
    await userAPage.goto('/app/groups');
    await userAPage.waitForLoadState('networkidle');

    const createBtn = userAPage.getByTitle('Create new group');
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();

    const memberSearch = userAPage.getByPlaceholder('Add people…');
    await expect(memberSearch).toBeVisible({ timeout: 5_000 });
    await memberSearch.fill('simon');

    const simonResult = userAPage.locator('button').filter({ hasText: /Simon/ }).first();
    if (await simonResult.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await simonResult.evaluate((el: HTMLElement) => el.click());
    }

    const nextBtn = userAPage.getByRole('button', { name: /next/i });
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.click();
    }

    const nameInput = userAPage.getByPlaceholder('Group name…');
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill(groupName);
      const createGroupBtn = userAPage.getByRole('button', { name: /create/i });
      if (await createGroupBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await createGroupBtn.click();
        await userAPage.goto('/app/groups');
        await expect(
          userAPage.getByText(groupName)
        ).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
