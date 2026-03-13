import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';

type TwoUserFixtures = {
  userAPage: Page;
  userBPage: Page;
  userAContext: BrowserContext;
  userBContext: BrowserContext;
};

/**
 * Fixture that provides two fully-authenticated browser pages.
 * Use for tests that need real-time interaction between two users
 * (messaging, friend requests, group invites, etc.).
 */
export const test = base.extend<TwoUserFixtures>({
  userAContext: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(__dirname, '..', '.auth', 'user-a.json'),
    });
    await use(ctx);
    await ctx.close();
  },
  userBContext: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(__dirname, '..', '.auth', 'user-b.json'),
    });
    await use(ctx);
    await ctx.close();
  },
  userAPage: async ({ userAContext }, use) => {
    const page = await userAContext.newPage();
    await use(page);
    await page.close();
  },
  userBPage: async ({ userBContext }, use) => {
    const page = await userBContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect };
