import type { APIRequestContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const AUTH_DIR = path.join(__dirname, '..', '.auth');

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const transient = /ECONNRESET|ECONNREFUSED|EPIPE|socket hang up/i.test(err?.message ?? '');
      if (!transient || i === retries) throw err;
      await new Promise(r => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw new Error('withRetry: unreachable');
}

export async function getMe(request: APIRequestContext, token: string) {
  return withRetry(async () => {
    const res = await request.get(`${API}/api/users/me`, { headers: headers(token) });
    return res.json();
  });
}

export async function searchUsers(request: APIRequestContext, token: string, q: string) {
  return withRetry(async () => {
    const res = await request.get(`${API}/api/users/search?q=${encodeURIComponent(q)}`, { headers: headers(token) });
    const data = await res.json();
    return data.users ?? [];
  });
}

export async function getFriends(request: APIRequestContext, token: string) {
  return withRetry(async () => {
    const res = await request.get(`${API}/api/friends`, { headers: headers(token) });
    const data = await res.json();
    return data.friends ?? [];
  });
}

export async function sendFriendRequest(request: APIRequestContext, token: string, addresseeId: string) {
  const res = await request.post(`${API}/api/friends/request`, {
    headers: headers(token),
    data: { addresseeId },
  });
  return res.json();
}

export async function removeFriend(request: APIRequestContext, token: string, friendshipId: string) {
  await request.delete(`${API}/api/friends/${friendshipId}`, { headers: headers(token) });
}

export async function acceptFriend(request: APIRequestContext, token: string, friendshipId: string) {
  await request.post(`${API}/api/friends/${friendshipId}/accept`, { headers: headers(token) });
}

export async function blockUser(request: APIRequestContext, token: string, targetUserId: string) {
  await request.post(`${API}/api/friends/${targetUserId}/block`, { headers: headers(token) });
}

export async function unblockUser(request: APIRequestContext, token: string, targetUserId: string) {
  await request.post(`${API}/api/friends/${targetUserId}/unblock`, { headers: headers(token) });
}

export async function getConversations(request: APIRequestContext, token: string) {
  return withRetry(async () => {
    const res = await request.get(`${API}/api/users/conversations`, { headers: headers(token) });
    const data = await res.json();
    return data.conversations ?? [];
  });
}

export async function nukeConversation(request: APIRequestContext, token: string, conversationId: string) {
  await request.post(`${API}/api/conversations/${conversationId}/nuke`, { headers: headers(token) });
}

export async function nukeByUser(request: APIRequestContext, token: string, recipientId: string) {
  await request.post(`${API}/api/conversations/nuke-by-user/${recipientId}`, { headers: headers(token) });
}

export async function getGroups(request: APIRequestContext, token: string) {
  return withRetry(async () => {
    const res = await request.get(`${API}/api/groups`, { headers: headers(token) });
    const data = await res.json();
    return data.groups ?? [];
  });
}

export async function createGroup(request: APIRequestContext, token: string, name: string, memberIds: string[] = []) {
  return withRetry(async () => {
    const res = await request.post(`${API}/api/groups`, {
      headers: headers(token),
      data: { name, memberIds },
    });
    return res.json();
  });
}

export async function deleteGroup(request: APIRequestContext, token: string, groupId: string) {
  await request.delete(`${API}/api/groups/${groupId}`, { headers: headers(token) });
}

export async function leaveGroup(request: APIRequestContext, token: string, groupId: string) {
  await request.post(`${API}/api/groups/${groupId}/leave`, { headers: headers(token) });
}

export async function updateProfile(request: APIRequestContext, token: string, data: Record<string, any>) {
  return withRetry(async () => {
    const res = await request.put(`${API}/api/users/me`, { headers: headers(token), data });
    return res.json();
  });
}

export async function updateSettings(request: APIRequestContext, token: string, data: Record<string, any>) {
  await withRetry(async () => {
    await request.put(`${API}/api/users/me/settings`, { headers: headers(token), data });
  });
}

/** Surgically remove only E2E-pattern test data between the caller and recipientId */
export async function cleanupTestData(request: APIRequestContext, token: string, recipientId: string) {
  await request.post(`${API}/api/test/cleanup`, { headers: headers(token), data: { recipientId } });
}

/**
 * Register a new user via API. Returns { userId } — user still needs email verification.
 */
export async function registerUser(request: APIRequestContext, data: {
  email: string; password: string; username: string;
  firstName: string; lastName: string; phoneNumber: string;
  gender?: string;
}) {
  return withRetry(async () => {
    const res = await request.post(`${API}/api/auth/register`, {
      headers: { 'Content-Type': 'application/json' },
      data,
    });
    return res.json();
  });
}

/**
 * Verify a user's email using the test bypass OTP code.
 */
export async function verifyEmail(request: APIRequestContext, userId: string, code = '000000') {
  return withRetry(async () => {
    const res = await request.post(`${API}/api/auth/verify-email`, {
      headers: { 'Content-Type': 'application/json' },
      data: { userId, code },
    });
    return res.json();
  });
}

/**
 * Delete a user account by ID (test-mode only cleanup).
 */
export async function deleteUser(request: APIRequestContext, token: string, userId: string) {
  await request.delete(`${API}/api/test/user/${userId}`, { headers: headers(token) }).catch(() => {});
}

export async function deleteProfileImage(request: APIRequestContext, token: string) {
  await request.delete(`${API}/api/users/profile-image`, { headers: headers(token) });
}

export async function deleteCoverImage(request: APIRequestContext, token: string) {
  await request.delete(`${API}/api/users/cover-image`, { headers: headers(token) });
}

export async function restoreImages(request: APIRequestContext, token: string, data: { profileImage?: string | null; coverImage?: string | null }) {
  await withRetry(async () => {
    await request.post(`${API}/api/test/restore-images`, { headers: headers(token), data });
  });
}

/**
 * Load the pre-test profile snapshot saved by global-setup.
 * Returns null if not found (tests should skip destructive cleanup in that case).
 */
export function loadProfileSnapshot(user: 'a' | 'b'): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(AUTH_DIR, `profile-snapshot-${user}.json`), 'utf-8'));
  } catch {
    return null;
  }
}

const PROFILE_FIELDS = ['displayName', 'firstName', 'lastName', 'gender'] as const;

/** Pick only the profile fields we need to restore. */
export function pickProfileRestore(snapshot: Record<string, any>): Record<string, any> {
  const data: Record<string, any> = {};
  for (const key of PROFILE_FIELDS) data[key] = snapshot[key] ?? null;
  return data;
}

/** Pick image fields for restore-images endpoint. */
export function pickImageRestore(snapshot: Record<string, any>): { profileImage?: string | null; coverImage?: string | null } | null {
  const has = 'profileImage' in snapshot || 'coverImage' in snapshot;
  if (!has) return null;
  return {
    ...(snapshot.profileImage !== undefined ? { profileImage: snapshot.profileImage } : {}),
    ...(snapshot.coverImage !== undefined ? { coverImage: snapshot.coverImage } : {}),
  };
}

/**
 * Retry an async cleanup operation up to `retries` times.
 * Swallows the error only after all retries are exhausted.
 */
export async function retryCleanup(fn: () => Promise<any>, retries = 3): Promise<void> {
  for (let i = 0; i <= retries; i++) {
    try {
      await fn();
      return;
    } catch {
      if (i < retries) await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
}
