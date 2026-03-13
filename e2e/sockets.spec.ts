import { test, expect } from '@playwright/test';
import { apiLogin, TEST_USERS } from './helpers/auth';

const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';

test.describe('Socket RPC endpoints (API-level)', () => {
  let tokenA: string;

  test.beforeEach(async ({ request }) => {
    if (!tokenA) {
      const result = await apiLogin(request, TEST_USERS.userA);
      tokenA = result.token;
    }
  });

  test('GET /api/users/me returns user data (REST fallback works)', async ({ request }) => {
    const res = await request.get(`${API}/api/users/me`, {
      headers: { Authorization: `Bearer ${tokenA}` },
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

    // Reset
    await request.put(`${API}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      data: { displayName: null },
    });
  });

  test('PUT /api/users/me/settings updates privacy', async ({ request }) => {
    const res = await request.put(`${API}/api/users/me/settings`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      data: { privacyOnlineStatus: 'friends' },
    });
    expect(res.ok()).toBeTruthy();

    // Reset
    await request.put(`${API}/api/users/me/settings`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      data: { privacyOnlineStatus: 'everyone' },
    });
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
