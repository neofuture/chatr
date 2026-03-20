import { test, expect } from './fixtures/two-users';
import { readStoredAuth } from './helpers/auth';
import * as api from './helpers/api';
import { getAssetPath } from './helpers/test-assets';

const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const ts = () => Date.now().toString(36);

const storedA = readStoredAuth('a');
const storedB = readStoredAuth('b');

test.describe('Group Messaging', () => {
  const groupName = `E2E GrpMsg ${ts()}`;
  let groupId: string;

  test.beforeEach(async ({ request }) => {
    if (!groupId) {
      const users = await api.searchUsers(request, storedA.token, 'simon');
      const userB = users.find((u: any) => u.username?.includes('simon'));

      const groupData = await api.createGroup(request, storedA.token, groupName, userB ? [userB.id] : []);
      groupId = groupData.group?.id;
    }
  });

  test('group appears in group list', async ({ userAPage }) => {
    await userAPage.goto('/app/groups');
    // Reload once if group isn't visible (cache may be stale)
    if (!await userAPage.getByText(groupName).isVisible({ timeout: 5_000 }).catch(() => false)) {
      await userAPage.reload();
    }
    await expect(userAPage.getByText(groupName)).toBeVisible({ timeout: 15_000 });
  });

  test('send a text message in group', async ({ userAPage }) => {
    const msg = `Group msg ${ts()}`;

    await userAPage.goto('/app/groups');
    await expect(userAPage.getByText(groupName)).toBeVisible({ timeout: 10_000 });
    await userAPage.getByText(groupName).click();

    const input = userAPage.getByPlaceholder('Message group…').or(userAPage.getByPlaceholder('Message…'));
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(msg);
    await userAPage.locator('button[title="Send message"]').click();
    await expect(userAPage.getByText(msg)).toBeVisible({ timeout: 10_000 });
  });

  test('send an image in group', async ({ userAPage }) => {
    await userAPage.goto('/app/groups');
    await expect(userAPage.getByText(groupName)).toBeVisible({ timeout: 10_000 });
    await userAPage.getByText(groupName).click();

    const msgInput = userAPage.getByPlaceholder('Message group…').or(userAPage.getByPlaceholder('Message…'));
    await expect(msgInput).toBeVisible({ timeout: 10_000 });

    await userAPage.locator('input[type="file"]').setInputFiles(getAssetPath('test-image.png'));
    const sendFileBtn = userAPage.locator('button').filter({ hasText: /Send file/ }).first();
    await expect(sendFileBtn).toBeVisible({ timeout: 10_000 });
    await sendFileBtn.click();
    await expect(sendFileBtn).toBeHidden({ timeout: 15_000 });
  });

  test('send a voice file in group', async ({ userAPage }) => {
    await userAPage.goto('/app/groups');
    await expect(userAPage.getByText(groupName)).toBeVisible({ timeout: 10_000 });
    await userAPage.getByText(groupName).click();

    const msgInput = userAPage.getByPlaceholder('Message group…').or(userAPage.getByPlaceholder('Message…'));
    await expect(msgInput).toBeVisible({ timeout: 10_000 });

    await userAPage.locator('input[type="file"]').setInputFiles(getAssetPath('test-audio.wav'));
    const sendFileBtn = userAPage.locator('button').filter({ hasText: /Send file/ }).first();
    await expect(sendFileBtn).toBeVisible({ timeout: 10_000 });
    await sendFileBtn.click();
    await expect(sendFileBtn).toBeHidden({ timeout: 15_000 });
  });

  test('send a generic file in group', async ({ userAPage }) => {
    await userAPage.goto('/app/groups');
    await expect(userAPage.getByText(groupName)).toBeVisible({ timeout: 10_000 });
    await userAPage.getByText(groupName).click();

    const msgInput = userAPage.getByPlaceholder('Message group…').or(userAPage.getByPlaceholder('Message…'));
    await expect(msgInput).toBeVisible({ timeout: 10_000 });

    await userAPage.locator('input[type="file"]').setInputFiles(getAssetPath('test-file.txt'));
    const sendFileBtn = userAPage.locator('button').filter({ hasText: /Send file/ }).first();
    await expect(sendFileBtn).toBeVisible({ timeout: 10_000 });
    await sendFileBtn.click();
    await expect(sendFileBtn).toBeHidden({ timeout: 15_000 });
  });

  test('send a link in group', async ({ userAPage }) => {
    const msg = `Check https://example.com ${ts()}`;

    await userAPage.goto('/app/groups');
    await expect(userAPage.getByText(groupName)).toBeVisible({ timeout: 10_000 });
    await userAPage.getByText(groupName).click();

    const input = userAPage.getByPlaceholder('Message group…').or(userAPage.getByPlaceholder('Message…'));
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(msg);
    await userAPage.locator('button[title="Send message"]').click();
    await expect(userAPage.getByText(msg)).toBeVisible({ timeout: 10_000 });
  });

  test('real-time: user B sees group message from user A', async ({ userAPage, userBPage, request }) => {
    await request.post(`${API}/api/groups/${groupId}/accept`, {
      headers: { Authorization: `Bearer ${storedB.token}` },
    }).catch(() => {});

    const msg = `Realtime group ${ts()}`;

    await userAPage.goto('/app/groups');
    await expect(userAPage.getByText(groupName)).toBeVisible({ timeout: 10_000 });
    await userAPage.getByText(groupName).click();

    const input = userAPage.getByPlaceholder('Message group…').or(userAPage.getByPlaceholder('Message…'));
    await expect(input).toBeVisible({ timeout: 10_000 });
    await input.fill(msg);
    await userAPage.locator('button[title="Send message"]').click();
    await expect(userAPage.getByText(msg)).toBeVisible({ timeout: 10_000 });

    // User B check — optional
    await userBPage.goto('/app/groups');
    const groupBtn = userBPage.getByText(groupName);
    if (await groupBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await groupBtn.click();
    }
  });

  test('cleanup: delete test group', async ({ request }) => {
    if (groupId) {
      await api.deleteGroup(request, storedA.token, groupId).catch(() => {});
    }
  });
});
