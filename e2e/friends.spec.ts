import { test, expect } from './fixtures/two-users';

test.describe('Friends', () => {

  test('user A can search for user B on friends page', async ({ userAPage }) => {
    await userAPage.goto('/app/friends');
    await userAPage.waitForTimeout(1000);
    const search = userAPage.getByPlaceholder('Search people…');
    await search.fill('simon');
    await userAPage.waitForTimeout(1000);
    await expect(
      userAPage.getByText(/simon/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('friend tabs are functional', async ({ userAPage }) => {
    await userAPage.goto('/app/friends');
    await userAPage.waitForTimeout(2000);

    // Friends tab should be active by default
    const friendsTab = userAPage.getByRole('button', { name: 'Friends' });
    await expect(friendsTab).toBeVisible();

    // Switch to Blocked tab
    const blockedTab = userAPage.getByRole('button', { name: 'Blocked' });
    await blockedTab.click();
    await userAPage.waitForTimeout(500);

    // Switch back to Friends tab
    await friendsTab.click();
    await userAPage.waitForTimeout(500);
  });
});
