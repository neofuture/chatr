import { test, expect } from '@playwright/test';
import * as api from './helpers/api';

const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const BYPASS_CODE = process.env.TEST_OTP_BYPASS || '000000';
const TS = Date.now();

const TEST_REG_USER = {
  email: `e2e_reg_${TS}@test.local`,
  password: 'E2eTest123!',
  username: `e2ereg${TS}`,
  firstName: 'E2E',
  lastName: 'Registrant',
  gender: 'male',
};

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('User Registration', () => {
  let createdUserId: string | null = null;

  test.afterAll(async ({ request }) => {
    if (createdUserId) {
      await request.delete(`${API}/api/test/user/${createdUserId}`).catch(() => {});
    }
  });

  test('register a new user via API, verify email, and login', async ({ request }) => {
    // Step 1: Register
    const regResult = await api.registerUser(request, TEST_REG_USER);
    expect(regResult.userId || regResult.user?.id).toBeTruthy();
    createdUserId = regResult.userId || regResult.user?.id;

    // Step 2: Verify email with bypass code
    const verifyResult = await api.verifyEmail(request, createdUserId!);
    expect(verifyResult.token || verifyResult.message).toBeTruthy();

    // Step 3: Login with the new user
    const loginStep1 = await request.post(`${API}/api/auth/login`, {
      data: { email: TEST_REG_USER.email, password: TEST_REG_USER.password },
    });
    const login1 = await loginStep1.json();

    let token: string;
    if (login1.token) {
      token = login1.token;
    } else {
      // May require login verification code
      const loginStep2 = await request.post(`${API}/api/auth/login`, {
        data: {
          email: TEST_REG_USER.email,
          password: TEST_REG_USER.password,
          loginVerificationCode: BYPASS_CODE,
        },
      });
      const login2 = await loginStep2.json();
      expect(login2.token).toBeTruthy();
      token = login2.token;
    }

    // Step 4: Verify profile data
    const me = await api.getMe(request, token);
    expect(me.email).toBe(TEST_REG_USER.email);
    expect(me.firstName).toBe(TEST_REG_USER.firstName);
    expect(me.lastName).toBe(TEST_REG_USER.lastName);
    expect(me.gender).toBe(TEST_REG_USER.gender);
    expect(me.emailVerified).toBe(true);
  });

  test('register via browser UI panel', async ({ page }) => {
    await page.goto('/');

    // Open register panel — desktop uses avatar dropdown, mobile uses hamburger
    const userMenu = page.getByLabel('User menu');
    if (await userMenu.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await userMenu.click();
      await page.getByText('Register').click();
    } else {
      await page.locator('button[class*="hamburger"]').click();
      await page.getByRole('button', { name: /Register/i }).click();
    }

    // Auth panel should show registration form
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible({ timeout: 5_000 });

    // Fill registration form
    const ts2 = Date.now();
    const uiUser = {
      email: `e2e_ui_${ts2}@test.local`,
      firstName: 'UITest',
      lastName: 'Person',
      username: `e2eui${ts2}`,
      password: 'UITest123!',
      phone: '+447940147138',
    };

    await page.getByPlaceholder('First name').fill(uiUser.firstName);
    await page.getByPlaceholder('Last name').fill(uiUser.lastName);
    await page.getByPlaceholder('you@example.com').fill(uiUser.email);
    await page.getByPlaceholder(/\+447911|07911/).fill(uiUser.phone);

    // Username should auto-generate; we can set our own
    const usernameInput = page.locator('input[placeholder="username"]');
    await usernameInput.fill(uiUser.username);
    await page.waitForTimeout(1500);

    // Fill passwords
    const passwordInputs = page.locator('input[placeholder="••••••••"]');
    await passwordInputs.nth(0).fill(uiUser.password);
    await passwordInputs.nth(1).fill(uiUser.password);

    // Submit
    await page.getByRole('button', { name: /Sign Up/i }).click();

    // Should show email verification screen
    await expect(
      page.getByText(/verification|verify|code/i).first()
    ).toBeVisible({ timeout: 15_000 });

    // Enter bypass OTP
    const otpInput = page.locator('[data-testid="otp-input"], input[maxlength="6"], input[placeholder*="code"]').first();
    if (await otpInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await otpInput.fill(BYPASS_CODE);

      const verifyBtn = page.getByRole('button', { name: /verify|confirm|submit/i });
      if (await verifyBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await verifyBtn.click();
      }
    }

    // Should eventually get to the app or show success
    const navigatedToApp = await page.waitForURL(/\/app/, { timeout: 15_000 }).then(() => true).catch(() => false);
    const showsSuccess = await page.getByText(/success|verified|welcome/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
    expect(navigatedToApp || showsSuccess).toBeTruthy();

    // Clean up: find the created user and delete
    try {
      const ctx = await page.context();
      const storageState = await ctx.storageState();
      const localStorage = storageState.origins?.[0]?.localStorage ?? [];
      const userStr = localStorage.find(s => s.name === 'user')?.value;
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.id) {
          await page.request.delete(`${API}/api/test/user/${user.id}`).catch(() => {});
        }
      }
    } catch {}
  });
});
