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
    const regResult = await api.registerUser(request, TEST_REG_USER);
    expect(regResult.userId || regResult.user?.id).toBeTruthy();
    createdUserId = regResult.userId || regResult.user?.id;

    const verifyResult = await api.verifyEmail(request, createdUserId!);
    expect(verifyResult.token || verifyResult.message).toBeTruthy();

    const loginStep1 = await request.post(`${API}/api/auth/login`, {
      data: { email: TEST_REG_USER.email, password: TEST_REG_USER.password },
    });
    const login1 = await loginStep1.json();

    let token: string;
    if (login1.token) {
      token = login1.token;
    } else {
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

    const me = await api.getMe(request, token);
    expect(me.email).toBe(TEST_REG_USER.email);
    expect(me.firstName).toBe(TEST_REG_USER.firstName);
    expect(me.lastName).toBe(TEST_REG_USER.lastName);
    expect(me.gender).toBe(TEST_REG_USER.gender);
    expect(me.emailVerified).toBe(true);
  });

  test('register via browser UI panel', async ({ page }) => {
    await page.goto('/');

    const userMenu = page.getByLabel('User menu');
    if (await userMenu.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await userMenu.click();
      await page.getByText('Register').click();
    } else {
      await page.locator('button[class*="hamburger"]').click();
      await page.getByRole('button', { name: /Register/i }).click();
    }

    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible({ timeout: 10_000 });

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

    const emailInput = page.locator('input[type="email"], input[placeholder*="@"], input[placeholder*="email"]').first();
    await emailInput.fill(uiUser.email);

    const phoneInput = page.locator('input[type="tel"], input[placeholder*="+44"], input[placeholder*="07"]').first();
    if (await phoneInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await phoneInput.fill(uiUser.phone);
    }

    // Fill passwords before username so the username check can run while we proceed
    const passwordInputs = page.locator('input[type="password"]');
    const pwCount = await passwordInputs.count();
    if (pwCount >= 2) {
      await passwordInputs.nth(pwCount - 2).fill(uiUser.password);
      await passwordInputs.nth(pwCount - 1).fill(uiUser.password);
    }

    // Fill username last — triggers 800ms debounced availability check
    const usernameInput = page.locator('input[placeholder="username"]');
    await expect(usernameInput).toBeVisible({ timeout: 5_000 });
    await usernameInput.clear();
    await usernameInput.fill(uiUser.username);

    // Wait for the username availability check to finish (spinner gone, check visible)
    const usernameCheck = usernameInput.locator('xpath=ancestor::div[contains(@class,"input-wrapper")]').locator('i.fa-check');
    await expect(usernameCheck).toBeVisible({ timeout: 20_000 });

    const signUpBtn = page.getByRole('button', { name: /Sign Up/i });
    await signUpBtn.scrollIntoViewIfNeeded();
    await signUpBtn.click();

    // If the form didn't submit (validation race), retry
    const emailVerifyHeading = page.getByText('Verify Your Email');
    for (let attempt = 0; attempt < 3; attempt++) {
      const visible = await emailVerifyHeading.isVisible({ timeout: 10_000 }).catch(() => false);
      if (visible) break;
      const canRetry = await signUpBtn.isVisible({ timeout: 1_000 }).catch(() => false);
      if (canRetry) await signUpBtn.click();
    }

    async function fillOtpAndSubmit() {
      const otpInputs = page.locator('input[inputmode="numeric"]');
      await expect(otpInputs.first()).toBeVisible({ timeout: 5_000 });
      await expect(otpInputs).toHaveCount(6, { timeout: 5_000 });

      // Fill each OTP input individually — click to focus, then type the digit
      const digits = BYPASS_CODE.split('');
      for (let i = 0; i < digits.length; i++) {
        await otpInputs.nth(i).click();
        await page.waitForTimeout(100);
        await page.keyboard.type(digits[i]);
        await page.waitForTimeout(250);
      }

      // Auto-submit fires after the 6th digit; wait for it to process
      await page.waitForTimeout(1500);

      // If auto-submit didn't fire, click verify manually
      const verifyBtn = page.getByRole('button', { name: /verify/i });
      const canClick = await verifyBtn.isEnabled({ timeout: 3_000 }).catch(() => false);
      if (canClick) {
        await verifyBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Step 1: Email verification — panel opens after registration API + 300ms delay
    await expect(emailVerifyHeading).toBeVisible({ timeout: 30_000 });
    await fillOtpAndSubmit();

    // Step 2: After email verification, wait for either /app navigation or phone verification
    const phoneVerifyHeading = page.getByText('Verify Phone Number');
    const nextStep = await Promise.race([
      page.waitForURL(/\/app/, { timeout: 20_000 }).then(() => 'app' as const),
      phoneVerifyHeading.waitFor({ state: 'visible', timeout: 20_000 }).then(() => 'phone' as const),
    ]).catch(() => 'timeout' as const);

    if (nextStep === 'phone') {
      await page.waitForTimeout(1000);
      await fillOtpAndSubmit();
      await page.waitForURL(/\/app/, { timeout: 20_000 }).catch(() => {});
    }

    const navigatedToApp = page.url().includes('/app') ||
      await page.waitForURL(/\/app/, { timeout: 5_000 }).then(() => true).catch(() => false);
    const showsSuccess = await page.getByText(/success|verified|welcome/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
    expect(navigatedToApp || showsSuccess).toBeTruthy();

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
