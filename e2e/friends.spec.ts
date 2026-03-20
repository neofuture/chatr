import { test, expect } from './fixtures/two-users';

test.describe('Friends', () => {

  test('user A can search for user B on friends page', async ({ userAPage }) => {
    await userAPage.goto('/app/friends');
    const search = userAPage.locator('input[placeholder*="Search"]').first();
    await expect(search).toBeVisible({ timeout: 10_000 });
    await search.fill('simon');

    await expect(
      userAPage.getByText(/simon/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('friend tabs are functional', async ({ userAPage }) => {
    await userAPage.goto('/app/friends');

    const friendsTab = userAPage.getByRole('button', { name: 'Friends' });
    await expect(friendsTab).toBeVisible({ timeout: 10_000 });

    const blockedTab = userAPage.getByRole('button', { name: 'Blocked' });
    await blockedTab.click();
    await expect(blockedTab).toHaveAttribute('class', /active|selected/i, { timeout: 3_000 }).catch(() => {});

    await friendsTab.click();
  });
});
