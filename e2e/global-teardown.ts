import { test as teardown, request } from '@playwright/test';
import { readStoredAuth } from './helpers/auth';
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
    const storedA = readStoredAuth('a');
    const storedB = readStoredAuth('b');
    const tokenA = storedA.token;
    const tokenB = storedB.token;
    const userAId = storedA.userId;
    const userBId = storedB.userId;

    // ── Surgically delete test messages via pattern-matching endpoint ───
    await api.cleanupTestData(ctx, tokenA, userBId).catch(() => {});

    // ── Delete test groups via cleanup-all endpoint ─────────────────────────
    await ctx.post(`${API}/api/test/cleanup-all`).catch(() => {});

    // ── Unblock users in case a test left them blocked ────────────────────
    await api.unblockUser(ctx, tokenA, userBId).catch(() => {});
    await api.unblockUser(ctx, tokenB, userAId).catch(() => {});

    // ── Restore profiles from pre-test snapshots (with retries) ────────────
    const snapshotA = api.loadProfileSnapshot('a');
    const snapshotB = api.loadProfileSnapshot('b');

    if (snapshotA) {
      await api.retryCleanup(() =>
        api.updateProfile(ctx, tokenA, api.pickProfileRestore(snapshotA))
      );
    }
    if (snapshotB) {
      await api.retryCleanup(() =>
        api.updateProfile(ctx, tokenB, api.pickProfileRestore(snapshotB))
      );
    }

    // ── Restore privacy settings from snapshots ────────────────────────────
    const privacyFieldsA = snapshotA ? {
      privacyOnlineStatus: snapshotA.privacyOnlineStatus ?? 'everyone',
      privacyPhone: snapshotA.privacyPhone ?? 'nobody',
      privacyEmail: snapshotA.privacyEmail ?? 'nobody',
      privacyFullName: snapshotA.privacyFullName ?? 'everyone',
      privacyGender: snapshotA.privacyGender ?? 'nobody',
      privacyJoinedDate: snapshotA.privacyJoinedDate ?? 'everyone',
    } : null;
    const privacyFieldsB = snapshotB ? {
      privacyOnlineStatus: snapshotB.privacyOnlineStatus ?? 'everyone',
      privacyPhone: snapshotB.privacyPhone ?? 'nobody',
      privacyEmail: snapshotB.privacyEmail ?? 'nobody',
      privacyFullName: snapshotB.privacyFullName ?? 'everyone',
      privacyGender: snapshotB.privacyGender ?? 'nobody',
      privacyJoinedDate: snapshotB.privacyJoinedDate ?? 'everyone',
    } : null;
    if (privacyFieldsA) await api.retryCleanup(() => api.updateSettings(ctx, tokenA, privacyFieldsA));
    if (privacyFieldsB) await api.retryCleanup(() => api.updateSettings(ctx, tokenB, privacyFieldsB));

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
