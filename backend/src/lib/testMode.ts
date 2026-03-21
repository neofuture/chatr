/**
 * Runtime E2E test mode toggle.
 *
 * When active (via POST /api/test/mode { enabled: true }):
 *  - OTP bypass code "000000" is accepted
 *  - SMS/email sending is suppressed
 *  - Rate limiting on auth routes is relaxed
 *  - Test cleanup endpoints become available
 *
 * Persisted in Redis so it survives backend restarts (tsx watch).
 * Disabled by default. Only toggleable when NODE_ENV !== 'production'.
 */

import { redis } from './redis';

let _enabled = false;

const TEST_BYPASS_CODE = '000000';
const REDIS_KEY = 'chatr:test_mode';

export function isTestMode(): boolean {
  return _enabled && process.env.NODE_ENV !== 'production';
}

export async function setTestMode(enabled: boolean): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') return false;
  _enabled = enabled;
  try { await redis.set(REDIS_KEY, enabled ? '1' : '0', 'EX', 3600); } catch { /* best-effort */ }
  console.log(`🧪 E2E test mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
  return true;
}

export async function restoreTestMode(): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;
  try {
    const val = await redis.get(REDIS_KEY);
    if (val === '1') {
      _enabled = true;
      console.log('🧪 E2E test mode RESTORED from Redis');
    }
  } catch { /* ignore */ }
}

export function getTestBypassCode(): string | null {
  return isTestMode() ? TEST_BYPASS_CODE : null;
}
