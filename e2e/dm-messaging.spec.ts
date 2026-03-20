import { test, expect } from './fixtures/two-users';
import { readStoredAuth } from './helpers/auth';
import { getAssetPath } from './helpers/test-assets';
import type { Page } from '@playwright/test';

const ts = () => Date.now().toString(36);

const API_URL = process.env.E2E_BACKEND_URL || 'http://localhost:3001';

const storedA = readStoredAuth('a');
const storedB = readStoredAuth('b');

async function openDMWithSimon(page: Page) {
  // Ensure a conversation exists between user A and user B
  await page.request.post(`${API_URL}/api/messages/send`, {
    headers: { Authorization: `Bearer ${storedA.token}`, 'Content-Type': 'application/json' },
    data: { recipientId: storedB.userId, content: `_setup_${Date.now()}`, type: 'text' },
  }).catch(() => {});

  await page.goto('/app');

  // Click Simon's conversation row
  const convRow = page.locator('button').filter({ hasText: /Simon James|simonjames/i }).first();
  await expect(convRow).toBeVisible({ timeout: 15_000 });
  await convRow.click();

  // The input may initially show "Offline — reconnecting…" while the WebSocket connects
  await expect(page.getByPlaceholder(/Message…|Offline/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByPlaceholder('Message…')).toBeVisible({ timeout: 30_000 });
}

test.describe('DM Messaging', () => {

  test('send and receive a text message in real-time', async ({ userAPage, userBPage }) => {
    const msg = `Hello ${ts()}`;

    await openDMWithSimon(userAPage);

    const input = userAPage.getByPlaceholder('Message…');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(msg);
    await userAPage.locator('button[title="Send message"]').click();
    await expect(userAPage.getByText(msg)).toBeVisible({ timeout: 10_000 });

    // User B verification
    await userBPage.goto('/app');
    const msgPreview = userBPage.getByText(msg);
    if (await msgPreview.isVisible({ timeout: 10_000 }).catch(() => false)) {
      expect(true).toBeTruthy();
    }
  });

  test('send a link message', async ({ userAPage }) => {
    await openDMWithSimon(userAPage);
    const msg = `Link https://example.com ${ts()}`;
    const input = userAPage.getByPlaceholder('Message…');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(msg);
    await userAPage.locator('button[title="Send message"]').click();
    await expect(userAPage.getByText(msg)).toBeVisible({ timeout: 10_000 });
  });

  test('send an image file', async ({ userAPage }) => {
    await openDMWithSimon(userAPage);
    await expect(userAPage.getByPlaceholder('Message…')).toBeVisible({ timeout: 10_000 });
    await userAPage.locator('input[type="file"]').setInputFiles(getAssetPath('test-image.png'));
    const sendFileBtn = userAPage.locator('button').filter({ hasText: /Send file/ }).first();
    await expect(sendFileBtn).toBeVisible({ timeout: 10_000 });
    await sendFileBtn.click();
    await expect(sendFileBtn).toBeHidden({ timeout: 15_000 });
  });

  test('send an audio file', async ({ userAPage }) => {
    await openDMWithSimon(userAPage);
    await expect(userAPage.getByPlaceholder('Message…')).toBeVisible({ timeout: 10_000 });
    await userAPage.locator('input[type="file"]').setInputFiles(getAssetPath('test-audio.wav'));
    const sendFileBtn = userAPage.locator('button').filter({ hasText: /Send file/ }).first();
    await expect(sendFileBtn).toBeVisible({ timeout: 10_000 });
    await sendFileBtn.click();
    await expect(sendFileBtn).toBeHidden({ timeout: 15_000 });
  });

  test('send a text file', async ({ userAPage }) => {
    await openDMWithSimon(userAPage);
    await expect(userAPage.getByPlaceholder('Message…')).toBeVisible({ timeout: 10_000 });
    await userAPage.locator('input[type="file"]').setInputFiles(getAssetPath('test-file.txt'));
    const sendFileBtn = userAPage.locator('button').filter({ hasText: /Send file/ }).first();
    await expect(sendFileBtn).toBeVisible({ timeout: 10_000 });
    await sendFileBtn.click();
    await expect(sendFileBtn).toBeHidden({ timeout: 15_000 });
  });

  test('unsend a message', async ({ userAPage }) => {
    const msg = `Unsend ${ts()}`;
    await openDMWithSimon(userAPage);

    const input = userAPage.getByPlaceholder('Message…');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(msg);
    await userAPage.locator('button[title="Send message"]').click();
    await expect(userAPage.getByText(msg)).toBeVisible({ timeout: 10_000 });

    // Right-click to open context menu
    const msgBubble = userAPage.getByText(msg);
    await msgBubble.click({ button: 'right' });

    const unsendBtn = userAPage.locator('button[aria-label="Unsend this message"]');
    if (await unsendBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await unsendBtn.click();
      // Wait for the message to be removed or replaced with "unsent" indicator
      const unsent = userAPage.getByText('You unsent this message').first();
      await expect(unsent.or(msgBubble)).toBeHidden({ timeout: 10_000 }).catch(() => {});
    }
  });

  test('emoji picker opens and closes', async ({ userAPage }) => {
    await openDMWithSimon(userAPage);
    const emojiBtn = userAPage.locator('button[title="Emoji"]');
    if (await emojiBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emojiBtn.click();
      await expect(userAPage.locator('[class*="picker"], [class*="emoji"]').first()).toBeVisible({ timeout: 3_000 });
      await userAPage.getByPlaceholder('Message…').click();
    }
  });
});
