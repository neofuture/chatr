import { test, expect } from './fixtures/two-users';
import { readStoredAuth } from './helpers/auth';

const API_URL = process.env.E2E_BACKEND_URL || 'http://localhost:3001';

const storedA = readStoredAuth('a');
const storedB = readStoredAuth('b');

test.describe('Real-time messaging', () => {

  test('user A can see user B in new chat search', async ({ userAPage }) => {
    await userAPage.goto('/app');

    const composeBtn = userAPage.getByTitle('New message');
    await expect(composeBtn).toBeVisible({ timeout: 10_000 });
    await composeBtn.click();

    const search = userAPage.getByPlaceholder('Search users...');
    await expect(search).toBeVisible({ timeout: 5_000 });
    await search.fill('simon');
    await expect(
      userAPage.locator('button').filter({ hasText: /simon/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('user A can send a message to user B', async ({ userAPage, userBPage }) => {
    const msgTs = Date.now();
    const msg = `E2E test msg ${msgTs}`;

    // Retry the setup message — late-running tests can hit stale connections
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await userAPage.request.post(`${API_URL}/api/messages/send`, {
          headers: { Authorization: `Bearer ${storedA.token}`, 'Content-Type': 'application/json' },
          data: { recipientId: storedB.userId, content: `_setup_${msgTs}`, type: 'text' },
          timeout: 15_000,
        });
        if (res.ok()) break;
      } catch {
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }
    }

    await userAPage.goto('/app');
    await userAPage.waitForLoadState('networkidle');

    const convRow = userAPage.locator('button').filter({ hasText: /Simon James|simonjames/i }).first();
    if (!await convRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await userAPage.reload();
      await userAPage.waitForLoadState('networkidle');
    }
    await expect(convRow).toBeVisible({ timeout: 15_000 });

    // Click conversation row and retry up to 3 times — under load the first click
    // sometimes doesn't open the panel (React re-render race)
    const anyInput = userAPage.getByPlaceholder(/Message…|Offline|caption/i);
    for (let clickAttempt = 0; clickAttempt < 3; clickAttempt++) {
      await convRow.click();
      if (await anyInput.isVisible({ timeout: 5_000 }).catch(() => false)) break;
    }

    await expect(anyInput).toBeVisible({ timeout: 15_000 });
    await expect(userAPage.getByPlaceholder('Message…')).toBeVisible({ timeout: 45_000 });
    await userAPage.getByPlaceholder('Message…').fill(msg);

    const sendBtn = userAPage.locator('button[title="Send message"]');
    await expect(sendBtn).toBeEnabled({ timeout: 5_000 });
    await sendBtn.click();

    await expect(userAPage.getByText(msg)).toBeVisible({ timeout: 15_000 });

    // Check user B can see the conversation
    await userBPage.goto('/app');
    await userBPage.waitForLoadState('networkidle');
    const bConvRow = userBPage.locator('button').filter({ hasText: /Carl|carlfearby/i }).first();
    if (!await bConvRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await userBPage.reload();
    }
    await expect(bConvRow).toBeVisible({ timeout: 15_000 });
  });
});
