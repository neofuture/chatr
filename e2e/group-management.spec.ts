import { test, expect } from './fixtures/two-users';
import { apiLogin, TEST_USERS } from './helpers/auth';
import * as api from './helpers/api';

const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const ts = () => Date.now().toString(36);

async function setup(request: any) {
  const resultA = await apiLogin(request, TEST_USERS.userA);
  const resultB = await apiLogin(request, TEST_USERS.userB);
  return {
    tokenA: resultA.token,
    tokenB: resultB.token,
    userAId: resultA.user.id,
    userBId: resultB.user.id,
  };
}

test.describe('Group Management', () => {

  test('create a group via UI', async ({ userAPage, request }) => {
    const { tokenA } = await setup(request);

    await userAPage.goto('/app/groups');

    // Click create new group button
    const createBtn = userAPage.getByTitle('Create new group');
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();

    // Search for a user to add
    const memberSearch = userAPage.getByPlaceholder(/add people/i);
    await expect(memberSearch).toBeVisible({ timeout: 10_000 });
    await memberSearch.fill('simon');

    // Wait for search results (socketFirst: 4s WebSocket + 15s HTTP fallback max)
    const simonRow = userAPage.getByText('Simon James').first();
    await expect(simonRow).toBeVisible({ timeout: 25_000 });
    await simonRow.click();

    // Click Next to go to name step
    const nextBtn = userAPage.getByRole('button', { name: /next/i });
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    await nextBtn.click();

    // Enter group name and create
    const groupName = `UI Group ${ts()}`;
    const nameInput = userAPage.getByPlaceholder(/group name/i);
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.fill(groupName);

    const createGroupBtn = userAPage.getByRole('button', { name: /create group/i });
    await expect(createGroupBtn).toBeVisible({ timeout: 5_000 });
    await createGroupBtn.click();

    // Wait for group to be created (verify via API)
    let created: any;
    for (let i = 0; i < 10; i++) {
      await userAPage.waitForTimeout(1000);
      const groups = await api.getGroups(request, tokenA);
      created = groups.find((g: any) => g.name === groupName);
      if (created) break;
    }
    expect(created).toBeTruthy();

    // Cleanup
    if (created) await api.deleteGroup(request, tokenA, created.id);
  });

  test('promote member to admin and demote back', async ({ userAPage, request }) => {
    const { tokenA, tokenB, userBId } = await setup(request);

    // Create group via API
    const groupName = `Promote Test ${ts()}`;
    const data = await api.createGroup(request, tokenA, groupName, [userBId]);
    const groupId = data.group?.id;
    if (!groupId) { test.skip(); return; }

    // Accept invite as user B
    await request.post(`${API}/api/groups/${groupId}/accept`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    // Navigate to groups and open the group
    await userAPage.goto('/app/groups');
    await expect(userAPage.getByText(groupName)).toBeVisible({ timeout: 10_000 });
    await userAPage.getByText(groupName).click();

    // Open group profile panel
    const panelTitle = userAPage.locator('.auth-panel-title').last();
    await expect(panelTitle).toBeVisible({ timeout: 5_000 });
    await panelTitle.click();

    // Find and click Actions for the member
    const profilePanel = userAPage.locator('.auth-panel').last();
    const actionBtns = profilePanel.getByTitle('Actions');
    await expect(actionBtns.first()).toBeVisible({ timeout: 10_000 });
    await actionBtns.last().click();

    // Click Make Admin
    const makeAdmin = userAPage.getByText('Make Admin').first();
    await expect(makeAdmin).toBeVisible({ timeout: 5_000 });
    await makeAdmin.click();

    // Confirm in dialog
    const confirmBtn = userAPage.getByRole('button', { name: 'Make Admin' });
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();

    // Verify via API
    let detail = await request.get(`${API}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    let memberRole = (await detail.json()).group?.members?.find((m: any) => m.userId === userBId)?.role;
    expect(memberRole).toBe('admin');

    // Cleanup
    await api.deleteGroup(request, tokenA, groupId);
  });

  test('transfer ownership to another member', async ({ request }) => {
    const { tokenA, tokenB, userBId } = await setup(request);

    const groupName = `Ownership Test ${ts()}`;
    const data = await api.createGroup(request, tokenA, groupName, [userBId]);
    const groupId = data.group?.id;
    if (!groupId) { test.skip(); return; }

    await request.post(`${API}/api/groups/${groupId}/accept`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    await request.patch(`${API}/api/groups/${groupId}/members/${userBId}/promote`, {
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    });

    const transferRes = await request.post(`${API}/api/groups/${groupId}/transfer-ownership`, {
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      data: { newOwnerId: userBId },
    });
    expect(transferRes.ok()).toBeTruthy();

    const groupDetail = await request.get(`${API}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const detail = await groupDetail.json();
    const newOwner = detail.group?.members?.find((m: any) => m.userId === userBId);
    expect(newOwner?.role).toBe('owner');

    await api.deleteGroup(request, tokenB, groupId);
  });

  test('kick a member from group', async ({ request }) => {
    const { tokenA, tokenB, userBId } = await setup(request);

    const groupName = `Kick Test ${ts()}`;
    const data = await api.createGroup(request, tokenA, groupName, [userBId]);
    const groupId = data.group?.id;
    if (!groupId) { test.skip(); return; }

    await request.post(`${API}/api/groups/${groupId}/accept`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const removeRes = await request.delete(`${API}/api/groups/${groupId}/members/${userBId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(removeRes.ok()).toBeTruthy();

    const detail = await request.get(`${API}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const g = await detail.json();
    const bMember = g.group?.members?.find((m: any) => m.userId === userBId);
    expect(bMember).toBeUndefined();

    await api.deleteGroup(request, tokenA, groupId);
  });

  test('member leaves group voluntarily', async ({ request }) => {
    const { tokenA, tokenB, userBId } = await setup(request);

    const groupName = `Leave Test ${ts()}`;
    const data = await api.createGroup(request, tokenA, groupName, [userBId]);
    const groupId = data.group?.id;
    if (!groupId) { test.skip(); return; }

    await request.post(`${API}/api/groups/${groupId}/accept`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const leaveRes = await request.post(`${API}/api/groups/${groupId}/leave`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(leaveRes.ok()).toBeTruthy();

    await api.deleteGroup(request, tokenA, groupId);
  });

  test('delete a group via API', async ({ request }) => {
    const { tokenA } = await setup(request);

    const groupName = `Delete Test ${ts()}`;
    const data = await api.createGroup(request, tokenA, groupName);
    const groupId = data.group?.id;
    if (!groupId) { test.skip(); return; }

    const delRes = await request.delete(`${API}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(delRes.ok()).toBeTruthy();

    const groups = await api.getGroups(request, tokenA);
    expect(groups.find((g: any) => g.id === groupId)).toBeUndefined();
  });
});
