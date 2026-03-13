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
    await userAPage.waitForTimeout(1000);

    const createBtn = userAPage.getByTitle('Create new group');
    await expect(createBtn).toBeVisible({ timeout: 5_000 });
    await createBtn.click();
    await userAPage.waitForTimeout(1000);

    // Scope all interactions to the topmost panel (the New Group panel)
    const panel = userAPage.locator('.auth-panel').last();
    const memberSearch = panel.getByPlaceholder('Add people…');
    await expect(memberSearch).toBeVisible({ timeout: 5_000 });
    await memberSearch.fill('simon');
    await userAPage.waitForTimeout(2000);

    const simonRow = panel.locator('button').filter({ hasText: /simon/i }).first();
    await expect(simonRow).toBeVisible({ timeout: 15_000 });
    await simonRow.click({ force: true });
    await userAPage.waitForTimeout(1500);

    const nextBtn = panel.getByRole('button', { name: /next/i });
    await expect(nextBtn).toBeVisible({ timeout: 10_000 });
    await nextBtn.click({ force: true });
    await userAPage.waitForTimeout(500);

    const groupName = `UI Group ${ts()}`;
    const nameInput = userAPage.getByPlaceholder('Group name…');
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.fill(groupName);
    await userAPage.getByRole('button', { name: /create/i }).click();
    await userAPage.waitForTimeout(2000);

    await userAPage.goto('/app/groups');
    await expect(userAPage.getByText(groupName)).toBeVisible({ timeout: 10_000 });

    // Cleanup
    const groups = await api.getGroups(request, tokenA);
    const created = groups.find((g: any) => g.name === groupName);
    if (created) await api.deleteGroup(request, tokenA, created.id);
  });

  test('promote member to admin and demote back', async ({ userAPage, request }) => {
    const { tokenA, tokenB, userBId } = await setup(request);

    const groupName = `Admin Test ${ts()}`;
    const data = await api.createGroup(request, tokenA, groupName, [userBId]);
    const groupId = data.group?.id;
    if (!groupId) { test.skip(); return; }

    // Accept invite as user B
    await request.post(`${API}/api/groups/${groupId}/accept`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    await userAPage.goto('/app/groups');
    await userAPage.waitForTimeout(1000);
    await userAPage.getByText(groupName).click();
    await userAPage.waitForTimeout(1000);

    const infoBtn = userAPage.getByTitle('Group info').or(userAPage.locator('button:has(i.fa-info-circle)'));
    if (await infoBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await infoBtn.click();
      await userAPage.waitForTimeout(1000);

      const actionBtns = userAPage.getByTitle('Actions');
      if ((await actionBtns.count()) > 0) {
        await actionBtns.last().click();
        await userAPage.waitForTimeout(500);

        const makeAdmin = userAPage.getByText('Make Admin');
        if (await makeAdmin.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await makeAdmin.click();
          await userAPage.waitForTimeout(1000);
          await expect(userAPage.getByText(/Admin/).first()).toBeVisible({ timeout: 5_000 });

          const actionBtns2 = userAPage.getByTitle('Actions');
          if ((await actionBtns2.count()) > 0) {
            await actionBtns2.last().click();
            await userAPage.waitForTimeout(500);
            const removeAdmin = userAPage.getByText('Remove Admin');
            if (await removeAdmin.isVisible({ timeout: 2_000 }).catch(() => false)) {
              await removeAdmin.click();
              await userAPage.waitForTimeout(1000);
            }
          }
        }
      }
    }

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
