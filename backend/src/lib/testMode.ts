/**
 * Runtime E2E test mode toggle.
 *
 * When active (via POST /api/test/mode { enabled: true }):
 *  - OTP bypass code "000000" is accepted
 *  - SMS/email sending is suppressed
 *  - Rate limiting on auth routes is relaxed
 *  - Test cleanup endpoints become available
 *
 * Disabled by default. Only toggleable when NODE_ENV !== 'production'.
 */

let _enabled = false;

const TEST_BYPASS_CODE = '000000';

export function isTestMode(): boolean {
  return _enabled && process.env.NODE_ENV !== 'production';
}

export function setTestMode(enabled: boolean): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  _enabled = enabled;
  console.log(`🧪 E2E test mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
  return true;
}

export function getTestBypassCode(): string | null {
  return isTestMode() ? TEST_BYPASS_CODE : null;
}
