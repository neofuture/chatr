import { test as teardown, request } from '@playwright/test';
import { apiLogin, TEST_USERS } from './helpers/auth';
import * as api from './helpers/api';

/**
 * Post-test cleanup. Removes ONLY identifiable E2E test data.
 *
 * SAFETY RULES:
 *  - NEVER call nukeByUser / nukeConversation — those wipe real messages
 *  - Only delete messages whose content matches known E2E patterns (via /api/test/cleanup)
 *  - Only delete groups whose names match known test prefixes
 *  - Restore profiles, images & settings to pre-test state (safe — no data loss)
 */

teardown('cleanup', async () => {
  const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
  const ctx = await request.newContext({ baseURL: API });

  try {
    const resultA = await apiLogin(ctx, TEST_USERS.userA);
    const resultB = await apiLogin(ctx, TEST_USERS.userB);
    const tokenA = resultA.token;
    const tokenB = resultB.token;
    const userAId = resultA.user.id;
    const userBId = resultB.user.id;

    // ── Surgically delete test messages via pattern-matching endpoint ───
    await api.cleanupTestData(ctx, tokenA, userBId).catch(() => {});

    // ── Delete test groups by name prefix ─────────────────────────────────
    const testPrefixes = [
      'UI Group ', 'Admin Test ', 'Ownership Test ', 'Kick Test ',
      'Leave Test ', 'Delete Test ', 'E2E GrpMsg ', 'E2E Group ',
      'ProfileGrp ', 'Test Group ',
    ];

    for (const token of [tokenA, tokenB]) {
      const groups = await api.getGroups(ctx, token);
      for (const g of groups) {
        if (testPrefixes.some(p => g.name?.startsWith(p))) {
          await api.deleteGroup(ctx, tokenA, g.id).catch(() =>
            api.deleteGroup(ctx, tokenB, g.id).catch(() => {})
          );
        }
      }
    }

    // ── Unblock users in case a test left them blocked ────────────────────
    await api.unblockUser(ctx, tokenA, userBId).catch(() => {});
    await api.unblockUser(ctx, tokenB, userAId).catch(() => {});

    // ── Restore profiles (only fields E2E tests modify) ───────────────────
    await api.updateProfile(ctx, tokenA, {
      displayName: null, firstName: 'Carl', gender: null,
    }).catch(() => {});
    await api.updateProfile(ctx, tokenB, {
      displayName: null, firstName: 'Simon', gender: null,
    }).catch(() => {});

    // ── Restore privacy settings ──────────────────────────────────────────
    const defaultPrivacy = {
      privacyOnlineStatus: 'everyone',
      privacyPhone: 'nobody',
      privacyEmail: 'nobody',
      privacyFullName: 'everyone',
      privacyGender: 'nobody',
      privacyJoinedDate: 'everyone',
    };
    await api.updateSettings(ctx, tokenA, defaultPrivacy).catch(() => {});
    await api.updateSettings(ctx, tokenB, defaultPrivacy).catch(() => {});

    console.log('✅ E2E teardown: cleaned up all test data surgically');
  } catch (err) {
    console.warn('⚠️  E2E teardown encountered errors (non-fatal):', err);
  } finally {
    // Disable test mode so normal operation resumes
    await ctx.post(`${API}/api/test/mode`, {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ enabled: false }),
    }).catch(() => {});
    await ctx.dispose();
  }
});
