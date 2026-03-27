import type { Page, APIRequestContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const BYPASS_CODE = process.env.TEST_OTP_BYPASS || '000000';

/**
 * Read token and userId from a storage-state file written by global-setup.
 * Avoids calling apiLogin (and its cookie side-effects) in test code.
 */
export function readStoredAuth(user: 'a' | 'b') {
  const statePath = path.join(__dirname, '..', '.auth', `user-${user}.json`);
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const origin = state.origins?.find((o: any) => o.origin.includes('localhost'));
  return {
    token: origin?.localStorage?.find((e: any) => e.name === 'token')?.value as string,
    userId: JSON.parse(origin?.localStorage?.find((e: any) => e.name === 'user')?.value || '{}').id as string,
  };
}

export interface TestUser {
  email: string;
  password: string;
  username: string;
}

export const TEST_USERS = {
  userA: {
    email: 'carlfearby@me.com',
    password: 'Vertinero2835!',
    username: '@carlfearby',
  },
  userB: {
    email: 'neofuture@gmail.com',
    password: 'Vertinero2835!',
    username: '@simonjames',
  },
} satisfies Record<string, TestUser>;

/**
 * Log in via the API (no browser needed) and return { token, user }.
 * Uses the TEST_OTP_BYPASS code to skip real OTP delivery.
 * Uses longer timeouts to handle parallel test load.
 */
export async function apiLogin(request: APIRequestContext, user: TestUser, retries = 3): Promise<{ token: string; user: Record<string, any> }> {
  const timeout = 30_000;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Send bypass code upfront so the backend test-mode fast-path
      // returns a token in a single round-trip.
      const res = await request.post(`${API}/api/auth/login`, {
        data: {
          email: user.email,
          password: user.password,
          loginVerificationCode: BYPASS_CODE,
        },
        timeout,
      });
      const body = await res.json();

      if (body.token) return body;

      // Bypass didn't fire (test mode may not be enabled yet) — fall back
      // to the 2-step flow for non-test-mode compatibility.
      if (body.requiresLoginVerification || body.userId) {
        const step2 = await request.post(`${API}/api/auth/login`, {
          data: {
            email: user.email,
            password: user.password,
            loginVerificationCode: BYPASS_CODE,
          },
          timeout,
        });
        const body2 = await step2.json();
        if (body2.token) return body2;
        throw new Error(`Login step 2 failed: ${JSON.stringify(body2)}`);
      }

      throw new Error(`Login failed: ${JSON.stringify(body)}`);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('apiLogin: unreachable');
}

/**
 * Log in via the browser UI — opens auth panel from nav, fills login form, submits the OTP bypass code.
 * Returns the page with the user fully authenticated.
 */
export async function browserLogin(page: Page, user: TestUser) {
  await page.goto('/login');

  // Fill credentials on the login page
  await page.getByPlaceholder(/email|username/i).fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole('button', { name: /sign\s*in/i }).click();

  // Wait for OTP screen
  await page.waitForSelector('[data-testid="otp-input"], input[maxlength="6"], input[placeholder*="code"]', { timeout: 10_000 });

  // Fill the bypass code
  const otpInput = page.locator('[data-testid="otp-input"], input[maxlength="6"], input[placeholder*="code"]').first();
  await otpInput.fill(BYPASS_CODE);

  // Submit if there's a verify button
  const verifyBtn = page.getByRole('button', { name: /verify|confirm|submit/i });
  if (await verifyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await verifyBtn.click();
  }

  // Wait for redirect to app
  await page.waitForURL(/\/app/, { timeout: 15_000 });
}

/**
 * Set auth state in page's localStorage (use after apiLogin).
 * This is faster than browserLogin for most tests.
 */
export async function injectAuth(page: Page, loginResult: { token: string; user: Record<string, any> }) {
  await page.addInitScript((data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }, loginResult);
}
