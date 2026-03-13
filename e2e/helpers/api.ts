import type { APIRequestContext } from '@playwright/test';

const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function getMe(request: APIRequestContext, token: string) {
  const res = await request.get(`${API}/api/users/me`, { headers: headers(token) });
  return res.json();
}

export async function searchUsers(request: APIRequestContext, token: string, q: string) {
  const res = await request.get(`${API}/api/users/search?q=${encodeURIComponent(q)}`, { headers: headers(token) });
  const data = await res.json();
  return data.users ?? [];
}

export async function getFriends(request: APIRequestContext, token: string) {
  const res = await request.get(`${API}/api/friends`, { headers: headers(token) });
  const data = await res.json();
  return data.friends ?? [];
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
  const res = await request.get(`${API}/api/users/conversations`, { headers: headers(token) });
  const data = await res.json();
  return data.conversations ?? [];
}

export async function nukeConversation(request: APIRequestContext, token: string, conversationId: string) {
  await request.post(`${API}/api/conversations/${conversationId}/nuke`, { headers: headers(token) });
}

export async function nukeByUser(request: APIRequestContext, token: string, recipientId: string) {
  await request.post(`${API}/api/conversations/nuke-by-user/${recipientId}`, { headers: headers(token) });
}

export async function getGroups(request: APIRequestContext, token: string) {
  const res = await request.get(`${API}/api/groups`, { headers: headers(token) });
  const data = await res.json();
  return data.groups ?? [];
}

export async function createGroup(request: APIRequestContext, token: string, name: string, memberIds: string[] = []) {
  const res = await request.post(`${API}/api/groups`, {
    headers: headers(token),
    data: { name, memberIds },
  });
  return res.json();
}

export async function deleteGroup(request: APIRequestContext, token: string, groupId: string) {
  await request.delete(`${API}/api/groups/${groupId}`, { headers: headers(token) });
}

export async function leaveGroup(request: APIRequestContext, token: string, groupId: string) {
  await request.post(`${API}/api/groups/${groupId}/leave`, { headers: headers(token) });
}

export async function updateProfile(request: APIRequestContext, token: string, data: Record<string, any>) {
  const res = await request.put(`${API}/api/users/me`, { headers: headers(token), data });
  return res.json();
}

export async function updateSettings(request: APIRequestContext, token: string, data: Record<string, any>) {
  await request.put(`${API}/api/users/me/settings`, { headers: headers(token), data });
}

/** Surgically remove only E2E-pattern test data between the caller and recipientId */
export async function cleanupTestData(request: APIRequestContext, token: string, recipientId: string) {
  await request.post(`${API}/api/test/cleanup`, { headers: headers(token), data: { recipientId } });
}

export async function deleteProfileImage(request: APIRequestContext, token: string) {
  await request.delete(`${API}/api/users/profile-image`, { headers: headers(token) });
}

export async function deleteCoverImage(request: APIRequestContext, token: string) {
  await request.delete(`${API}/api/users/cover-image`, { headers: headers(token) });
}

export async function restoreImages(request: APIRequestContext, token: string, data: { profileImage?: string | null; coverImage?: string | null }) {
  await request.post(`${API}/api/test/restore-images`, { headers: headers(token), data });
}
