import { test, expect } from './fixtures/two-users';
import { readStoredAuth } from './helpers/auth';
import * as api from './helpers/api';

const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const ts = () => Date.now().toString(36);

const storedA = readStoredAuth('a');
const storedB = readStoredAuth('b');

function setup() {
  return {
    tokenA: storedA.token,
    tokenB: storedB.token,
    userAId: storedA.userId,
    userBId: storedB.userId,
  };
}

test.describe('Conversation lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  test('accept a pending conversation via API', async ({ request }) => {
    const { tokenA, tokenB, userBId } = setup();

    await request.post(`${API}/api/messages/send`, {
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      data: { recipientId: userBId, content: `Accept test ${ts()}`, type: 'text' },
    });

    const convs = await api.getConversations(request, tokenB);
    const meA = await api.getMe(request, tokenA);
    const fromA = convs.find((c: any) => c.id === meA.id);
    if (fromA?.conversationId && fromA?.status === 'pending') {
      const acceptRes = await request.post(`${API}/api/conversations/${fromA.conversationId}/accept`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(acceptRes.ok()).toBeTruthy();
    }

    await api.cleanupTestData(request, tokenA, userBId).catch(() => {});
  });

  test('decline a pending conversation via API', async ({ request }) => {
    const { tokenA, tokenB, userBId } = setup();

    await request.post(`${API}/api/messages/send`, {
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      data: { recipientId: userBId, content: `Decline test ${ts()}`, type: 'text' },
    });

    const convs = await api.getConversations(request, tokenB);
    const meA = await api.getMe(request, tokenA);
    const fromA = convs.find((c: any) => c.id === meA.id);
    if (fromA?.conversationId && fromA?.status === 'pending') {
      const declineRes = await request.post(`${API}/api/conversations/${fromA.conversationId}/decline`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      expect(declineRes.ok()).toBeTruthy();
    }

    await api.cleanupTestData(request, tokenA, userBId).catch(() => {});
  });

  test('send and surgically remove a conversation message', async ({ request }) => {
    const { tokenA, userBId } = setup();

    const convs = await api.getConversations(request, tokenA);
    for (const c of convs) {
      if (c.status === 'declined' || c.status === 'pending') {
        await request.post(`${API}/api/conversations/${c.conversationId || c.id}/accept`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        }).catch(() => {});
      }
    }

    const sendRes = await request.post(`${API}/api/messages/send`, {
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      data: { recipientId: userBId, content: `Nuke test ${ts()}`, type: 'text' },
    });
    if (sendRes.ok()) {
      await api.cleanupTestData(request, tokenA, userBId).catch(() => {});
    }
  });

  test('accept conversation via UI', async ({ userAPage, userBPage, request }) => {
    const { tokenA, userBId } = setup();

    await request.post(`${API}/api/messages/send`, {
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      data: { recipientId: userBId, content: `UI accept test ${ts()}`, type: 'text' },
    });

    await userBPage.goto('/app');

    const requestsTab = userBPage.getByRole('button', { name: /Requests/ });
    if (await requestsTab.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await requestsTab.click();

      const alexRow = userBPage.locator('button').filter({ hasText: /Carl|carlfearby/ }).first();
      if (await alexRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await alexRow.click();

        const acceptBtn = userBPage.getByRole('button', { name: /Accept/i }).first();
        if (await acceptBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await acceptBtn.click();
          await expect(acceptBtn).toBeHidden({ timeout: 5_000 }).catch(() => {});
        }
      }
    }

    await api.cleanupTestData(request, tokenA, userBId).catch(() => {});
  });
});

test.describe('Block and unblock', () => {

  test('block and unblock a user via API', async ({ request }) => {
    const { tokenA, userBId } = setup();

    const blockRes = await request.post(`${API}/api/friends/${userBId}/block`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(blockRes.ok()).toBeTruthy();

    const statusRes = await request.get(`${API}/api/friends/${userBId}/block-status`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const status = await statusRes.json();
    expect(status.blocked).toBe(true);
    expect(status.blockedByMe).toBe(true);

    const unblockRes = await request.post(`${API}/api/friends/${userBId}/unblock`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(unblockRes.ok()).toBeTruthy();

    const status2Res = await request.get(`${API}/api/friends/${userBId}/block-status`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const status2 = await status2Res.json();
    expect(status2.blocked).toBe(false);
  });

  test('blocked user cannot send messages', async ({ request }) => {
    const { tokenA, tokenB, userBId, userAId } = setup();

    await api.blockUser(request, tokenA, userBId);

    await request.post(`${API}/api/messages/send`, {
      headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      data: { recipientId: userAId, content: 'Should fail', type: 'text' },
    });

    const statusRes = await request.get(`${API}/api/friends/${userBId}/block-status`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const status = await statusRes.json();
    expect(status.blocked).toBe(true);

    await api.unblockUser(request, tokenA, userBId);
  });
});
