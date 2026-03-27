import { chromium, type Page, type BrowserContext, type APIRequestContext, request as pwRequest } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const FRONTEND = process.env.E2E_FRONTEND_URL || 'http://localhost:3000';
const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const AUTH_A = path.join(__dirname, '..', 'e2e', '.auth', 'user-a.json');
const AUTH_B = path.join(__dirname, '..', 'e2e', '.auth', 'user-b.json');
const OUT = path.join(__dirname, '..', 'screenshots');

function h(token: string) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }

function getToken(authFile: string): string {
  const state = JSON.parse(fs.readFileSync(authFile, 'utf8'));
  const ls = state.origins?.[0]?.localStorage ?? [];
  return ls.find((e: any) => e.name === 'token')?.value ?? '';
}

function getUserId(authFile: string): string {
  const state = JSON.parse(fs.readFileSync(authFile, 'utf8'));
  const ls = state.origins?.[0]?.localStorage ?? [];
  const userStr = ls.find((e: any) => e.name === 'user')?.value ?? '{}';
  return JSON.parse(userStr).id ?? '';
}

async function shot(page: Page, name: string, fullPage = false) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`  ${name}.png${fullPage ? ' (full page)' : ''}`);
}

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

let _socketSrc: string | null = null;
async function loadSocketIO(page: Page) {
  if (!_socketSrc) _socketSrc = await (await fetch(`${API}/socket.io/socket.io.js`)).text();
  await page.evaluate((code) => { new Function(code)(); }, _socketSrc);
}

type SocketResult = { messageId?: string; messageIds?: string[] };

async function connectAndRun(
  browser: any, apiUrl: string, token: string, fn: string,
): Promise<SocketResult> {
  const ctx = await browser.newContext({ viewport: DESKTOP, baseURL: FRONTEND });
  const page = await ctx.newPage();
  await page.goto('about:blank');
  await loadSocketIO(page);
  const result = await page.evaluate(
    ({ apiUrl, token, fn }) => {
      return new Promise<any>((resolve) => {
        const sock = (window as any).io(apiUrl, { auth: { token }, transports: ['websocket', 'polling'] });
        sock.on('connect', async () => {
          try {
            const run = new Function('sock', 'resolve', fn);
            run(sock, resolve);
          } catch (e) { resolve({}); }
        });
        sock.on('connect_error', () => resolve({}));
        setTimeout(() => resolve({}), 10000);
      });
    },
    { apiUrl, token, fn },
  ).catch(() => ({}));
  await ctx.close().catch(() => {});
  await new Promise(r => setTimeout(r, 500));
  return result;
}

/**
 * Start continuous typing events from user B targeting user A.
 * Returns a cleanup function to stop and close the context.
 */
async function startTyping(browser: any, token: string, recipientId: string, durationMs = 20000) {
  const ctx = await browser.newContext({ viewport: DESKTOP, baseURL: FRONTEND });
  const page = await ctx.newPage();
  await page.goto('about:blank');
  await loadSocketIO(page);
  page.evaluate(({ apiUrl, token, recipientId, durationMs }) => {
    return new Promise<void>((resolve) => {
      const sock = (window as any).io(apiUrl, { auth: { token }, transports: ['websocket', 'polling'] });
      sock.on('connect', () => {
        sock.emit('typing:start', { recipientId });
        const iv = setInterval(() => sock.emit('typing:start', { recipientId }), 1500);
        setTimeout(() => { clearInterval(iv); sock.disconnect(); resolve(); }, durationMs);
      });
      sock.on('connect_error', () => resolve());
      setTimeout(() => resolve(), durationMs + 5000);
    });
  }, { apiUrl: API, token, recipientId, durationMs }).catch(() => {});
  return async () => { await ctx.close().catch(() => {}); };
}


async function main() {
  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR OLD SCREENSHOTS — prevent stale files from persisting
  // ═══════════════════════════════════════════════════════════════════════════
  if (fs.existsSync(OUT)) {
    const stale = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
    for (const f of stale) fs.unlinkSync(path.join(OUT, f));
    console.log(`Cleared ${stale.length} old screenshots`);
  }
  fs.mkdirSync(OUT, { recursive: true });

  if (!fs.existsSync(AUTH_A) || !fs.existsSync(AUTH_B)) {
    console.error('No auth state. Run: npx playwright test --project=setup');
    process.exit(1);
  }

  const tokenA = getToken(AUTH_A);
  const tokenB = getToken(AUTH_B);
  const userAId = getUserId(AUTH_A);
  const userBId = getUserId(AUTH_B);

  const api = await pwRequest.newContext({ baseURL: API });
  const browser = await chromium.launch({ headless: true });

  // Ensure user A has isSupport=true for admin panel screenshots
  try {
    const tsx = path.join(__dirname, '..', 'backend', 'node_modules', '.bin', 'tsx');
    const { execSync: es } = await import('child_process');
    es(`${tsx} -e "const{prisma}=require('./src/lib/prisma');prisma.user.update({where:{id:'${userAId}'},data:{isSupport:true}}).then(()=>prisma.\\$disconnect())"`,
      { cwd: path.join(__dirname, '..', 'backend'), stdio: 'inherit', timeout: 10000 });
    console.log('  Set user A as support user');
  } catch { console.log('  isSupport flag: may already be set'); }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 0: CLEANUP — remove screenshot artifacts only, preserve real data
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ PHASE 0: Pre-cleanup ═══');
  const { execSync } = await import('child_process');
  try {
    const cleanupPath = path.join(__dirname, '..', 'backend', 'scripts', 'cleanup-guests.ts');
    const tsx = path.join(__dirname, '..', 'backend', 'node_modules', '.bin', 'tsx');
    if (fs.existsSync(cleanupPath)) {
      execSync(`${tsx} ${cleanupPath}`, { cwd: path.join(__dirname, '..', 'backend'), stdio: 'inherit' });
    }
  } catch (e) { console.log('  Pre-cleanup skipped:', (e as Error).message?.slice(0, 80)); }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: SEED — ensure friendship, group, and fresh DM content
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ PHASE 1: Seed data ═══');

  // Check if friendship already exists
  let friendshipIsNew = false;
  try {
    const frListRes = await api.get('/api/friends', { headers: h(tokenA) });
    const frList = await frListRes.json().catch(() => ({ friends: [] }));
    const existing = (frList.friends || frList || []).find((f: any) =>
      f.friendId === userBId || f.addresseeId === userBId || f.requesterId === userBId ||
      f.id === userBId || f.user?.id === userBId
    );
    if (existing) {
      console.log('  Friendship already exists (preserving)');
    } else {
      const frRes = await api.post('/api/friends/request', { headers: h(tokenA), data: { addresseeId: userBId } });
      const frData = await frRes.json();
      const fid = frData.friendship?.id || frData.id || '';
      if (fid) {
        await api.post(`/api/friends/${fid}/accept`, { headers: h(tokenB) });
        friendshipIsNew = true;
        console.log('  Created new friendship');
      }
    }
  } catch { console.log('  Friendship check: already exists'); }

  // Create ONE group
  let groupId = '';
  try {
    const r = await api.post('/api/groups', {
      headers: h(tokenA),
      data: { name: 'Project Alpha', description: 'Main team collaboration', memberIds: [userBId] },
    });
    groupId = (await r.json()).group?.id || '';
    if (groupId) {
      await api.post(`/api/groups/${groupId}/accept`, { headers: h(tokenB) });
      await new Promise(r => setTimeout(r, 2000));
      console.log('  Created "Project Alpha" group');
    }
  } catch { console.log('  Group creation skipped (may exist)'); }

  // Group messages
  if (groupId) {
    await connectAndRun(browser, API, tokenA, `
      sock.emit('group:message:send', {
        groupId: '${groupId}',
        content: 'Hey team! Sprint review at 3pm today. All 1,300 tests passing on the latest build.',
        type: 'text'
      });
      setTimeout(() => {
        sock.emit('group:message:send', {
          groupId: '${groupId}',
          content: 'Also pushed the widget palette designer to production. Customers can customise colours and copy the embed snippet.',
          type: 'text'
        });
        setTimeout(() => { sock.disconnect(); resolve({}); }, 2000);
      }, 1000);
    `);
    await new Promise(r => setTimeout(r, 1000));
    await connectAndRun(browser, API, tokenB, `
      sock.emit('group:message:send', {
        groupId: '${groupId}',
        content: 'Great work! The typing indicators look fantastic. Reviewing the PR now.',
        type: 'text'
      });
      setTimeout(() => { sock.disconnect(); resolve({}); }, 2000);
    `);
    console.log('  Group messages sent');
    await new Promise(r => setTimeout(r, 2000));
  }

  // Seed rich DM features directly via Prisma (reliable DB writes)
  console.log('  Seeding code block, reaction, reply via Prisma...');
  try {
    const { execSync } = await import('child_process');
    execSync(
      './backend/node_modules/.bin/tsx backend/scripts/seed-rich-messages.ts',
      { cwd: process.cwd(), stdio: 'inherit', timeout: 30000 }
    );
    console.log('  Rich message seeding complete');
  } catch (e) {
    console.log('  WARNING: Rich message seeding failed:', (e as Error).message?.slice(0, 100));
  }
  await new Promise(r => setTimeout(r, 2000));

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: SCREENSHOTS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ PHASE 2: Screenshots ═══');

  // ── 1. LANDING PAGE ────────────────────────────────────────────────────
  console.log('\n[1] Landing page...');
  const landCtx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 3, isMobile: true, hasTouch: true, baseURL: FRONTEND });
  const landPage = await landCtx.newPage();
  await landPage.goto('/');
  await landPage.waitForTimeout(2500);
  await shot(landPage, '01-landing-page');
  await landCtx.close();

  // ── 2. REGISTRATION ────────────────────────────────────────────────────
  console.log('\n[2] Registration...');
  const regCtx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 3, isMobile: true, hasTouch: true, baseURL: FRONTEND });
  const regPage = await regCtx.newPage();
  await regPage.goto('/');
  await regPage.waitForTimeout(2000);
  const createBtn = regPage.locator('text=Create Account').first();
  if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await createBtn.click();
    await regPage.waitForTimeout(2000);
    const regTab = regPage.locator('text=Register').first();
    if (await regTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await regTab.click();
      await regPage.waitForTimeout(1000);
    }
    const usernameInput = regPage.locator('input[name="username"], input[placeholder*="sername"]').first();
    const emailInput = regPage.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = regPage.locator('input[name="password"], input[type="password"]').first();
    if (await usernameInput.isVisible({ timeout: 2000 }).catch(() => false)) await usernameInput.fill('newuser');
    if (await emailInput.isVisible({ timeout: 1000 }).catch(() => false)) await emailInput.fill('newuser@example.com');
    if (await passwordInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await passwordInput.fill('MyStr0ng!Pass');
      await regPage.waitForTimeout(800);
    }
    await shot(regPage, '30-register-form');
  }
  await regCtx.close();

  // ── 3. LOGIN ───────────────────────────────────────────────────────────
  console.log('\n[3] Login...');
  const loginCtx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 3, isMobile: true, hasTouch: true, baseURL: FRONTEND });
  const loginPage = await loginCtx.newPage();
  await loginPage.goto('/login');
  await loginPage.waitForTimeout(2500);
  await shot(loginPage, '02-login');
  await loginCtx.close();

  // ── 4. MAIN AUTHENTICATED CONTEXT ──────────────────────────────────────
  console.log('\n[4] Main app...');
  const mCtx = await browser.newContext({
    storageState: AUTH_A, viewport: MOBILE,
    deviceScaleFactor: 3, isMobile: true, hasTouch: true, baseURL: FRONTEND,
  });
  const m = await mCtx.newPage();

  // Navigate to conversations and wait for full load
  await m.goto('/app');
  await m.waitForSelector('text=Syncing', { state: 'hidden', timeout: 15_000 }).catch(() => {});
  await m.waitForSelector('text=Loading', { state: 'hidden', timeout: 15_000 }).catch(() => {});
  await m.waitForTimeout(5000);

  // ── Conversation list (clean, no typing yet) ───────────────────────────
  await shot(m, '03-conversations');

  // ── START TYPING from Simon — keep it going for 30 seconds ─────────────
  console.log('\n[5] Typing indicators...');
  const stopTyping = await startTyping(browser, tokenB, userAId, 30000);

  // Wait for typing event to propagate and render
  await m.waitForTimeout(4000);
  await shot(m, '25-typing-chat-list');

  // ── Open DM with Simon (find by "Friend" badge) ───────────────────────
  // Try multiple locator strategies to find Simon's conversation row
  const simonRow = m.locator('[class*="conversation"], [class*="chat-row"], li, [role="listitem"]')
    .filter({ hasText: /Friend/ })
    .first();
  const fallbackRow = m.locator('text=Friend').first();

  let chatOpened = false;
  for (const row of [simonRow, fallbackRow]) {
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      await row.click();
      await m.waitForTimeout(3000);

      // Check if messages loaded (wait for any message content)
      const hasMessages = await m.locator('[role="article"], [class*="message-bubble"], [class*="MessageBubble"]').count() > 0;
      if (!hasMessages) {
        // Scroll or wait more
        await m.waitForTimeout(3000);
      }

      // Scroll to bottom — typing indicator + recent seeded messages (reactions, reply, code block, edit)
      await m.evaluate(() => {
        const c = document.querySelector('[class*="messages"], [class*="chat-body"], main, [role="log"]');
        if (c) c.scrollTop = c.scrollHeight;
      });
      await m.waitForTimeout(2000);
      await shot(m, '26-typing-in-chat');

      // Capture the reply, reactions, and edit in the seeded messages area
      // Scroll up slightly from bottom to show the code block + reactions + reply + edit
      await m.evaluate(() => {
        const c = document.querySelector('[class*="messages"], [class*="chat-body"], main, [role="log"]');
        if (c) c.scrollTop = Math.max(0, c.scrollHeight - c.clientHeight - 200);
      });
      await m.waitForTimeout(1500);
      await shot(m, '04-chat-view');

      // Capture code block specifically (scroll to find it)
      const codeBlock = m.locator('pre, code, [class*="code-block"], [class*="CodeBlock"]').first();
      if (await codeBlock.isVisible({ timeout: 3000 }).catch(() => false)) {
        await codeBlock.scrollIntoViewIfNeeded();
        await m.waitForTimeout(1000);
        await shot(m, '41-code-block');
      }

      // Capture reactions if visible
      const reactionBadge = m.locator('[class*="reaction"], [class*="Reaction"]').first();
      if (await reactionBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reactionBadge.scrollIntoViewIfNeeded();
        await m.waitForTimeout(1000);
        await shot(m, '42-reactions');
      }

      // Capture reply with quoted preview
      const replyPreview = m.locator('[class*="reply"], [class*="Reply"], [class*="quoted"]').first();
      if (await replyPreview.isVisible({ timeout: 2000 }).catch(() => false)) {
        await replyPreview.scrollIntoViewIfNeeded();
        await m.waitForTimeout(1000);
        await shot(m, '43-reply-thread');
      }

      // Scroll to top for older media-rich content (voice waveform, images, video, links)
      await m.evaluate(() => {
        const c = document.querySelector('[class*="messages"], [class*="chat-body"], main, [role="log"]');
        if (c) c.scrollTop = 0;
      });
      await m.waitForTimeout(2000);
      await shot(m, '04b-chat-view-top');

      // Emoji picker
      const emojiBtn = m.locator('i.fa-smile').first();
      if (await emojiBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emojiBtn.click();
        await m.waitForTimeout(1500);
        await shot(m, '22-emoji-picker');
        await m.keyboard.press('Escape');
        await m.waitForTimeout(500);
      }

      // Image lightbox
      const chatImage = m.locator('[role="article"] img[src*="upload"]').first();
      if (await chatImage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await chatImage.click({ force: true, timeout: 5000 }).catch(() => {});
        await m.waitForTimeout(2000);
        await shot(m, '32-image-lightbox');
        await m.keyboard.press('Escape');
        await m.waitForTimeout(500);
        const closeBtn = m.locator('[class*="lightbox"] button, [class*="Lightbox"] button, [aria-label="Close"]').first();
        if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) await closeBtn.click();
        await m.waitForTimeout(500);
      }

      await m.goBack();
      await m.waitForTimeout(2000);
      chatOpened = true;
      break;
    }
  }
  await stopTyping();

  // ── Search ─────────────────────────────────────────────────────────────
  console.log('\n[6] Search...');
  await m.goto('/app');
  await m.waitForSelector('text=Simon James, text=Luna, text=Project Alpha', { state: 'visible', timeout: 10_000 }).catch(() => {});
  await m.waitForTimeout(3000);
  const searchInput = m.locator('input[placeholder*="earch"]').first();
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.click();
    await m.waitForTimeout(500);
    await searchInput.pressSequentially('Si', { delay: 150 });
    await m.waitForTimeout(2000);
    const hasResults = await m.locator('text=Simon James').isVisible({ timeout: 3000 }).catch(() => false);
    if (hasResults) {
      await shot(m, '33-search-results');
    } else {
      console.log('  Search did not show results, skipping screenshot');
    }
    await searchInput.fill('');
    await m.waitForTimeout(1000);
  }

  // ── Friends ────────────────────────────────────────────────────────────
  console.log('\n[7] Friends...');
  await m.goto('/app/friends');
  await m.waitForSelector('text=Loading', { state: 'hidden', timeout: 10_000 }).catch(() => {});
  await m.waitForTimeout(3000);
  await shot(m, '05-friends');

  // (Friend requests / blocked tabs omitted — empty states look bad in presentations)

  // ── Groups ─────────────────────────────────────────────────────────────
  console.log('\n[8] Groups...');
  await m.goto('/app/groups');
  await m.waitForSelector('text=Loading', { state: 'hidden', timeout: 10_000 }).catch(() => {});
  await m.waitForSelector('text=Syncing', { state: 'hidden', timeout: 10_000 }).catch(() => {});
  await m.waitForTimeout(3000);
  await shot(m, '06-groups');

  // ── Group chat + members ───────────────────────────────────────────────
  console.log('\n[9] Group chat & members...');
  await m.goto('/app/groups');
  await m.waitForTimeout(3000);
  const grpRow = m.locator('text=Project Alpha').first();
  if (await grpRow.isVisible({ timeout: 3000 }).catch(() => false)) {
    await grpRow.click();
    await m.waitForTimeout(3000);
    await m.waitForSelector('text=Sprint review', { timeout: 10_000 }).catch(() => {});
    await m.waitForTimeout(2000);
    await shot(m, '23-group-chat');

    if (groupId) {
      await m.evaluate((gId) => {
        window.dispatchEvent(new CustomEvent('chatr:group-members-toggle', { detail: { groupId: gId, open: true } }));
      }, groupId);
      await m.waitForTimeout(2500);
      await shot(m, '34-group-members');
    }
    await m.goBack();
    await m.waitForTimeout(2000);
  }

  // ── Settings ───────────────────────────────────────────────────────────
  console.log('\n[10] Settings, Privacy, Storage...');
  await m.goto('/app/settings');
  await m.waitForTimeout(2500);
  await shot(m, '07-settings');

  await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await m.waitForTimeout(2000);
  await shot(m, '35-settings-storage');

  await m.evaluate(() => window.scrollTo(0, 0));
  await m.waitForTimeout(1000);
  const privBtn = m.locator('button', { hasText: 'Privacy' }).first();
  const privRow = m.locator('text=Privacy').first();
  if (await privBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await privBtn.click();
  } else if (await privRow.isVisible({ timeout: 2000 }).catch(() => false)) {
    await privRow.click();
  }
  await m.waitForTimeout(2500);
  await shot(m, '24-privacy-settings');

  // ── Profile ────────────────────────────────────────────────────────────
  await m.goto('/app/profile');
  await m.waitForTimeout(2500);
  await shot(m, '08-profile');

  // ── Admin (empty state — before widget creates guests) ────────────────
  console.log('\n[10b] Admin empty state...');
  {
    const admEmptyCtx = await browser.newContext({
      storageState: AUTH_A, viewport: { width: 504, height: 378 }, deviceScaleFactor: 3,
      baseURL: FRONTEND, ignoreHTTPSErrors: true,
    });
    const admEmpty = await admEmptyCtx.newPage();
    await admEmpty.goto('/app/admin');
    await admEmpty.waitForTimeout(4000);
    await shot(admEmpty, '44-admin-empty');
    await admEmptyCtx.close();
  }

  // ── Luna AI ────────────────────────────────────────────────────────────
  console.log('\n[11] Luna AI...');
  await m.goto('/app');
  await m.waitForTimeout(3000);
  const luna = m.locator('text=Luna').first();
  if (await luna.isVisible({ timeout: 3000 }).catch(() => false)) {
    await luna.click();
    await m.waitForTimeout(3000);
    await shot(m, '20-luna-chat');
    await m.goBack();
    await m.waitForTimeout(2000);
  }

  // ── Docs + Email preview ───────────────────────────────────────────────
  console.log('\n[12] Docs & Email templates...');
  await m.goto('/docs');
  await m.waitForTimeout(2500);
  await shot(m, '12-docs');

  await m.goto('/email-preview');
  await m.waitForTimeout(2000);
  await shot(m, '13-email-templates');

  await mCtx.close();

  // ── THEMES ─────────────────────────────────────────────────────────────
  console.log('\n[13] Themes...');
  const tCtx = await browser.newContext({
    storageState: AUTH_A, viewport: MOBILE,
    deviceScaleFactor: 3, isMobile: true, hasTouch: true, baseURL: FRONTEND,
  });
  const tp = await tCtx.newPage();

  // Dark theme
  await tp.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await tp.goto('/app');
  await tp.waitForSelector('text=Syncing', { state: 'hidden', timeout: 15_000 }).catch(() => {});
  await tp.waitForSelector('text=Loading', { state: 'hidden', timeout: 15_000 }).catch(() => {});
  await tp.waitForTimeout(4000);
  await shot(tp, '18-dark-theme');

  // Dark theme chat (click on the Friend row)
  const dkFriend = tp.locator('text=Friend').first();
  if (await dkFriend.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dkFriend.click();
    await tp.waitForTimeout(3000);
    await shot(tp, '27-dark-theme-chat');
    await tp.goBack();
    await tp.waitForTimeout(2000);
  }

  // Light theme
  await tp.addInitScript(() => localStorage.setItem('theme', 'light'));
  await tp.goto('/app');
  await tp.waitForSelector('text=Syncing', { state: 'hidden', timeout: 15_000 }).catch(() => {});
  await tp.waitForSelector('text=Loading', { state: 'hidden', timeout: 15_000 }).catch(() => {});
  await tp.waitForTimeout(4000);
  await shot(tp, '19-light-theme');

  // Light theme chat
  const ltFriend = tp.locator('text=Friend').first();
  if (await ltFriend.isVisible({ timeout: 3000 }).catch(() => false)) {
    await ltFriend.click();
    await tp.waitForTimeout(3000);
    await shot(tp, '36-light-theme-chat');
    await tp.goBack();
    await tp.waitForTimeout(2000);
  }

  await tCtx.close();

  // ── DASHBOARD (desktop) ────────────────────────────────────────────────
  console.log('\n[14] Dashboard...');
  const dCtx = await browser.newContext({ storageState: AUTH_A, viewport: DESKTOP, baseURL: FRONTEND });
  const d = await dCtx.newPage();
  await d.goto('/dashboard');
  await d.waitForSelector('text=Loading metrics', { state: 'hidden', timeout: 30_000 }).catch(() => {});
  await d.waitForTimeout(3000);
  await d.evaluate(() => window.scrollTo(0, 0));
  await d.waitForTimeout(500);
  await shot(d, '09-dashboard-full', true);
  await shot(d, '10-dashboard-top');
  await dCtx.close();

  // ── WIDGET PALETTE DESIGNER (desktop) ──────────────────────────────────
  console.log('\n[15] Widget palette designer...');
  const wDesktop = await browser.newContext({ viewport: DESKTOP, baseURL: FRONTEND });
  const wd = await wDesktop.newPage();
  await wd.goto('/widget-demo');
  await wd.waitForTimeout(3000);
  await shot(wd, '37-widget-palette-designer');
  await wd.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await wd.waitForTimeout(1500);
  await shot(wd, '38-widget-embed-snippet');
  await wDesktop.close();

  // ── WIDGET MOBILE INTERACTION ──────────────────────────────────────────
  console.log('\n[16] Widget mobile...');
  const wCtx = await browser.newContext({
    viewport: MOBILE, deviceScaleFactor: 3, isMobile: true, hasTouch: true, baseURL: FRONTEND,
  });
  const w = await wCtx.newPage();
  await w.goto('/widget-demo');
  await w.waitForTimeout(4000);

  await w.waitForSelector('#chatr-widget-btn', { timeout: 10_000 }).catch(() => {});
  const bubble = w.locator('#chatr-widget-btn');
  if (await bubble.isVisible({ timeout: 3000 }).catch(() => false)) {
    await bubble.click();
    await w.waitForTimeout(1500);
    await shot(w, '11-widget-intro');

    await w.waitForSelector('#_Ni', { timeout: 8000 }).catch(() => {});
    const nameInput = w.locator('#_Ni');
    const msgInput = w.locator('#_Fm');
    const startBtn = w.locator('#_Ws');

    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Sarah');
      await msgInput.fill('Hi! Can you tell me about your pricing plans and how to get started?');
      await w.waitForTimeout(500);
      await shot(w, '11b-widget-form-filled');

      await startBtn.click();
      await w.waitForTimeout(6000);
      await shot(w, '11c-widget-chat');

      // Agent (Carl) replies via socket
      const convRes = await api.get('/api/users/conversations', { headers: h(tokenA) });
      const convData = await convRes.json().catch(() => ({ conversations: [] }));
      const guestConv = (convData.conversations || []).find((c: any) =>
        c.otherUser?.firstName === 'Sarah' || c.otherUser?.displayName?.includes('Sarah') ||
        c.lastMessage?.content?.includes('pricing plans')
      );
      const guestUserId = guestConv?.otherUser?.id || guestConv?.otherUserId;

      if (guestUserId) {
        await connectAndRun(browser, API, tokenA, `
          sock.emit('message:send', {
            recipientId: '${guestUserId}',
            content: "Hi Sarah! Chatr is completely free — one line of code, no subscriptions, no per-seat charges. Want me to walk you through setup?",
            type: 'text'
          });
          setTimeout(() => { sock.disconnect(); resolve({}); }, 2000);
        `);
        console.log('  Agent reply sent');
        await w.waitForTimeout(8000);
      } else {
        await w.waitForTimeout(4000);
      }
      await shot(w, '11d-widget-conversation');
    }
  }
  await wCtx.close();

  // ── ADMIN: contacts list, then click contact for conversation ───────
  console.log('\n[17] Admin contacts & conversation...');
  const admCtx = await browser.newContext({
    storageState: AUTH_A, viewport: { width: 600, height: 450 }, deviceScaleFactor: 2,
    baseURL: FRONTEND, ignoreHTTPSErrors: true,
  });
  const adm = await admCtx.newPage();
  await adm.goto('/app/admin');
  await adm.waitForSelector('text=Loading', { state: 'hidden', timeout: 10_000 }).catch(() => {});
  await adm.waitForTimeout(3000);

  // Screenshot 1: contacts list (no contact selected)
  await shot(adm, '44-admin-empty');

  // Screenshot 2: click first contact to show the conversation
  const guestCard = adm.locator('[class*="card"]').first();
  if (await guestCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await guestCard.click();
    await adm.waitForTimeout(3000);
  }
  await shot(adm, '45-admin-contacts');
  await admCtx.close();

  await browser.close();

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: CLEANUP — remove only what we created, preserve real data
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══ PHASE 3: Cleanup ═══');

  // Only delete the group we created (NEVER delete friendship)
  try { if (groupId) { await api.delete(`/api/groups/${groupId}`, { headers: h(tokenA) }); console.log('  Deleted "Project Alpha"'); } } catch {}
  await api.dispose();

  // Deep cleanup: guests + seeded group messages only
  console.log('  Running deep cleanup...');
  try {
    const cleanupPath = path.join(__dirname, '..', 'backend', 'scripts', 'cleanup-guests.ts');
    const tsx = path.join(__dirname, '..', 'backend', 'node_modules', '.bin', 'tsx');
    if (fs.existsSync(cleanupPath)) {
      execSync(`${tsx} ${cleanupPath}`, { cwd: path.join(__dirname, '..', 'backend'), stdio: 'inherit' });
    }
  } catch (e) { console.log('  Cleanup note:', (e as Error).message?.slice(0, 80)); }

  const count = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length;
  console.log(`\nDone! ${count} screenshots in ./screenshots/`);
}

main().catch(err => { console.error('Failed:', err); process.exit(1); });
