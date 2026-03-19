import { test, expect } from './fixtures/two-users';
import { request as playwrightRequest } from '@playwright/test';
import { apiLogin, TEST_USERS } from './helpers/auth';
import * as api from './helpers/api';

test.describe('Real-time messaging', () => {

  test.afterAll(async () => {
    const ctx = await playwrightRequest.newContext();
    try {
      const resultA = await apiLogin(ctx, TEST_USERS.userA);
      const resultB = await apiLogin(ctx, TEST_USERS.userB);
      await api.cleanupTestData(ctx, resultA.token, resultB.user.id).catch(() => {});
    } finally {
      await ctx.dispose();
    }
  });

  test('user A can see user B in new chat search', async ({ userAPage }) => {
    await userAPage.goto('/app');
    await userAPage.waitForTimeout(2000);

    // Open compose panel
    const composeBtn = userAPage.getByTitle('New message');
    await expect(composeBtn).toBeVisible({ timeout: 5_000 });
    await composeBtn.click();
    await userAPage.waitForTimeout(500);

    const search = userAPage.getByPlaceholder('Search users...');
    await search.fill('simon');
    await userAPage.waitForTimeout(1000);
    await expect(
      userAPage.locator('button').filter({ hasText: /simon/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('user A can send a message to user B', async ({ userAPage, userBPage, request }) => {
    const ts = Date.now();
    const msg = `E2E test msg ${ts}`;

    const resultA = await apiLogin(request, TEST_USERS.userA);
    const resultB = await apiLogin(request, TEST_USERS.userB);
    const API_URL = process.env.E2E_BACKEND_URL || 'http://localhost:3001';

    // Ensure conversation exists via API (retry on ECONNRESET)
    for (let i = 0; i < 3; i++) {
      try {
        await request.post(`${API_URL}/api/messages/send`, {
          headers: { Authorization: `Bearer ${resultA.token}`, 'Content-Type': 'application/json' },
          data: { recipientId: resultB.user.id, content: `_setup_${ts}`, type: 'text' },
        });
        break;
      } catch {
        if (i < 2) await userAPage.waitForTimeout(1000);
      }
    }

    await userAPage.goto('/app');
    await userAPage.waitForTimeout(3000);

    // Click on the conversation in sidebar (match displayName or username)
    const convRow = userAPage.locator('button').filter({ hasText: /Simon James|simonjames/i }).first();
    await expect(convRow).toBeVisible({ timeout: 15_000 });
    await convRow.click();
    await userAPage.waitForTimeout(1500);

    // Type and send
    const msgInput = userAPage.getByPlaceholder('Message…');
    await expect(msgInput).toBeVisible({ timeout: 15_000 });
    await msgInput.fill(msg);
    await userAPage.locator('button[title="Send message"]').click();

    // Verify message appears in user A's chat
    await expect(userAPage.getByText(msg)).toBeVisible({ timeout: 15_000 });

    // Check user B can see the conversation (match displayName or username)
    await userBPage.goto('/app');
    await userBPage.waitForTimeout(3000);
    await expect(
      userBPage.locator('button').filter({ hasText: /Carl|carlfearby/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
