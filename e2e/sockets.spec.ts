import { test, expect } from '@playwright/test';
import { readStoredAuth, TEST_USERS } from './helpers/auth';
import * as api from './helpers/api';

const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const storedA = readStoredAuth('a');

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function retryGet(request: any, url: string, opts: any, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await request.get(url, opts);
    } catch (err: any) {
      if (!/ECONNRESET|ECONNREFUSED|EPIPE|socket hang up/i.test(err?.message ?? '') || i === retries) throw err;
      await new Promise(r => setTimeout(r, 300 * (i + 1)));
    }
  }
}

test.describe('Socket RPC endpoints (API-level)', () => {
  const tokenA = storedA.token;

  test('GET /api/users/me returns user data (REST fallback works)', async ({ request }) => {
    const res = await retryGet(request, `${API}/api/users/me`, {
      headers: authHeaders(tokenA),
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.email).toBe(TEST_USERS.userA.email);
    expect(data.username).toBe(TEST_USERS.userA.username);
  });

  test('GET /api/users returns user list', async ({ request }) => {
    const res = await request.get(`${API}/api/users`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.users).toBeDefined();
    expect(data.users.length).toBeGreaterThan(0);
  });

  test('GET /api/users/search returns results', async ({ request }) => {
    const res = await request.get(`${API}/api/users/search?q=simon`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.users).toBeDefined();
    expect(data.users.some((u: any) => u.username?.includes('simon'))).toBeTruthy();
  });

  test('GET /api/friends returns friends list', async ({ request }) => {
    const res = await request.get(`${API}/api/friends`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.friends).toBeDefined();
  });

  test('GET /api/friends/requests/incoming returns requests', async ({ request }) => {
    const res = await request.get(`${API}/api/friends/requests/incoming`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.requests).toBeDefined();
  });

  test('GET /api/groups returns groups list', async ({ request }) => {
    const res = await request.get(`${API}/api/groups`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.groups).toBeDefined();
  });

  test('GET /api/users/conversations returns conversations', async ({ request }) => {
    const res = await request.get(`${API}/api/users/conversations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.conversations).toBeDefined();
  });

  test('PUT /api/users/me updates profile', async ({ request }) => {
    const meRes = await request.get(`${API}/api/users/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const before = await meRes.json();

    const res = await request.put(`${API}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      data: { displayName: 'Carl E2E' },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.displayName).toBe('Carl E2E');

    await api.retryCleanup(() => request.put(`${API}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      data: { displayName: before.displayName ?? null },
    }));
  });

  test('PUT /api/users/me/settings updates privacy', async ({ request }) => {
    const settingsRes = await request.get(`${API}/api/users/me/settings`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const beforeSettings = await settingsRes.json().catch(() => ({}));
    const originalPrivacy = beforeSettings.privacyOnlineStatus ?? 'everyone';

    const res = await request.put(`${API}/api/users/me/settings`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      data: { privacyOnlineStatus: 'friends' },
    });
    expect(res.ok()).toBeTruthy();

    await api.retryCleanup(() => request.put(`${API}/api/users/me/settings`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      data: { privacyOnlineStatus: originalPrivacy },
    }));
  });

  test('GET /api/friends/search returns search results', async ({ request }) => {
    const res = await request.get(`${API}/api/friends/search?q=riley`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.users).toBeDefined();
  });

  test('block-status endpoint works', async ({ request }) => {
    // Get user B's ID first
    const usersRes = await request.get(`${API}/api/users/search?q=simon`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const users = await usersRes.json();
    const userB = users.users?.find((u: any) => u.username?.includes('simon'));
    if (!userB) { test.skip(); return; }

    const res = await request.get(`${API}/api/friends/${userB.id}/block-status`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(typeof data.blocked).toBe('boolean');
  });
});
