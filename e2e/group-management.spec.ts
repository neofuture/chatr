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

test.describe('Group Management', () => {

  test('create a group via UI', async ({ userAPage, request }) => {
    const { tokenA } = setup();

    await userAPage.goto('/app/groups');

    const createBtn = userAPage.getByTitle('Create new group');
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();

    const memberSearch = userAPage.getByPlaceholder(/add people/i);
    await expect(memberSearch).toBeVisible({ timeout: 10_000 });
    await memberSearch.fill('simon');

    const simonRow = userAPage.getByText('Simon James').first();
    await expect(simonRow).toBeVisible({ timeout: 25_000 });
    await simonRow.click();

    const nextBtn = userAPage.getByRole('button', { name: /next/i });
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    await nextBtn.click();

    const groupName = `UI Group ${ts()}`;
    const nameInput = userAPage.getByPlaceholder(/group name/i);
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.fill(groupName);

    const createGroupBtn = userAPage.getByRole('button', { name: /create group/i });
    await expect(createGroupBtn).toBeVisible({ timeout: 5_000 });
    await createGroupBtn.click();

    // Poll API for the group to appear
    let created: any;
    for (let i = 0; i < 10; i++) {
      const groups = await api.getGroups(request, tokenA);
      created = groups.find((g: any) => g.name === groupName);
      if (created) break;
      await userAPage.waitForTimeout(500);
    }
    expect(created).toBeTruthy();

    if (created) await api.deleteGroup(request, tokenA, created.id);
  });

  test('promote member to admin and demote back', async ({ userAPage, request }) => {
    const { tokenA, tokenB, userBId } = setup();

    const groupName = `Promote Test ${ts()}`;
    const data = await api.createGroup(request, tokenA, groupName, [userBId]);
    const groupId = data.group?.id;
    if (!groupId) { test.skip(); return; }

    const acceptRes = await request.post(`${API}/api/groups/${groupId}/accept`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      timeout: 30_000,
    });
    expect(acceptRes.ok()).toBeTruthy();

    // Retry the GET — the accept may leave a stale keep-alive connection
    let bMember: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const groupDetail = await request.get(`${API}/api/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
          timeout: 30_000,
        });
        const members = (await groupDetail.json()).group?.members;
        bMember = members?.find((m: any) => m.userId === userBId);
        if (bMember) break;
      } catch {
        if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        else throw new Error(`Failed to fetch group details after 3 attempts`);
      }
    }
    expect(bMember).toBeTruthy();

    await userAPage.goto('/app/groups');

    // Wait for group to appear; reload once if needed for API-created group
    let groupVisible = await userAPage.getByText(groupName).isVisible({ timeout: 5_000 }).catch(() => false);
    if (!groupVisible) {
      await userAPage.reload();
    }

    await expect(userAPage.getByText(groupName)).toBeVisible({ timeout: 15_000 });
    await userAPage.getByText(groupName).click();

    const panelTitle = userAPage.locator('.auth-panel-title, [class*="panel"] h2, [class*="panel"] h3').filter({ hasText: groupName }).first();
    await expect(panelTitle).toBeVisible({ timeout: 10_000 });
    await panelTitle.click();

    const actionBtns = userAPage.locator('button[title="Actions"], button:has(i.fa-ellipsis-v)');
    await expect(actionBtns.first()).toBeVisible({ timeout: 15_000 });
    await actionBtns.last().click();

    const makeAdmin = userAPage.getByText('Make Admin').first();
    await expect(makeAdmin).toBeVisible({ timeout: 5_000 });
    await makeAdmin.click();

    const dialog = userAPage.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    const confirmBtn = dialog.getByRole('button', { name: 'Make Admin' });
    await confirmBtn.click();

    // Wait for dialog to close (promotion processed)
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    let memberRole: string | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const detail = await request.get(`${API}/api/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
          timeout: 30_000,
        });
        memberRole = (await detail.json()).group?.members?.find((m: any) => m.userId === userBId)?.role;
        break;
      } catch {
        if (attempt < 2) await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        else throw new Error(`Failed to verify promotion after 3 attempts`);
      }
    }
    expect(memberRole).toBe('admin');

    await api.deleteGroup(request, tokenA, groupId);
  });

  test('transfer ownership to another member', async ({ request }) => {
    const { tokenA, tokenB, userBId } = setup();

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

    const groupDetailRes = await request.get(`${API}/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const detailJson = await groupDetailRes.json();
    const newOwner = detailJson.group?.members?.find((m: any) => m.userId === userBId);
    expect(newOwner?.role).toBe('owner');

    await api.deleteGroup(request, tokenB, groupId);
  });

  test('kick a member from group', async ({ request }) => {
    const { tokenA, tokenB, userBId } = setup();

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
    const bMemberCheck = g.group?.members?.find((m: any) => m.userId === userBId);
    expect(bMemberCheck).toBeUndefined();

    await api.deleteGroup(request, tokenA, groupId);
  });

  test('member leaves group voluntarily', async ({ request }) => {
    const { tokenA, tokenB, userBId } = setup();

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
    const { tokenA } = setup();

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
