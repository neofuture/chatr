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

async function main() {
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

  // ── Seed data: friend relationship + groups ──────────────────────────────
  console.log('\nSeeding data...');
  let friendshipId = '';
  let groupId = '';
  let group2Id = '';

  try {
    const frRes = await api.post('/api/friends/request', { headers: h(tokenA), data: { addresseeId: userBId } });
    const frData = await frRes.json();
    friendshipId = frData.friendship?.id || frData.id || '';
    if (friendshipId) {
      await api.post(`/api/friends/${friendshipId}/accept`, { headers: h(tokenB) });
      console.log('  Created friendship');
    }
  } catch (e) { console.log('  Friend setup skipped (may already exist)'); }

  try {
    const grRes = await api.post('/api/groups', {
      headers: h(tokenA),
      data: { name: 'Project Alpha', description: 'Team collaboration space', memberIds: [userBId] },
    });
    const grData = await grRes.json();
    groupId = grData.group?.id || grData.id || '';
    if (groupId) {
      await api.post(`/api/groups/${groupId}/accept`, { headers: h(tokenB) });
      console.log('  Created group "Project Alpha"');
    }
  } catch (e) { console.log('  Group setup skipped'); }

  try {
    const g2 = await api.post('/api/groups', {
      headers: h(tokenA),
      data: { name: 'Design Team', description: 'UI/UX discussion', memberIds: [userBId] },
    });
    const g2Data = await g2.json();
    group2Id = g2Data.group?.id || g2Data.id || '';
    if (group2Id) {
      await api.post(`/api/groups/${group2Id}/accept`, { headers: h(tokenB) });
      console.log('  Created group "Design Team"');
    }
  } catch (e) { /* fine */ }

  const browser = await chromium.launch({ headless: true });

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE VIEWPORT — used for everything except dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  // Anonymous pages (landing, login) — mobile
  console.log('\nLanding & Login (mobile)...');
  const aCtx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 3, isMobile: true, hasTouch: true, baseURL: FRONTEND });
  const a = await aCtx.newPage();
  await a.goto('/');
  await a.waitForTimeout(2500);
  await shot(a, '01-landing-page');
  await a.goto('/login');
  await a.waitForTimeout(2000);
  await shot(a, '02-login');
  await aCtx.close();

  // Authenticated mobile context
  console.log('\nApp screens (mobile)...');
  const mCtx = await browser.newContext({
    storageState: AUTH_A,
    viewport: MOBILE,
    deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    baseURL: FRONTEND,
  });
  const m = await mCtx.newPage();

  // 3. Conversations list — wait for sync to finish
  await m.goto('/app');
  await m.waitForSelector('text=Syncing', { state: 'hidden', timeout: 15_000 }).catch(() => {});
  await m.waitForSelector('text=Loading', { state: 'hidden', timeout: 15_000 }).catch(() => {});
  await m.waitForTimeout(4000);
  await shot(m, '03-conversations');

  // 4. Chat view — target Simon James FRIEND conversation (has rich media)
  //    "Simon James" appears in group previews too, so find the one with the Friend badge
  const friendRow = m.locator('text=Simon James').filter({ has: m.locator('text=Friend') }).first();
  const friendRowAlt = m.locator('text=Friend').first();
  let chatOpened = false;

  for (const row of [friendRow, friendRowAlt]) {
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      await row.click();
      await m.waitForTimeout(4000);
      await shot(m, '04-chat-view');
      await m.evaluate(() => {
        const container = document.querySelector('[class*="messages"], [class*="chat-body"], main, [role="log"]');
        if (container) container.scrollTop = 0;
      });
      await m.waitForTimeout(2000);
      await shot(m, '04b-chat-view-top');
      await m.goBack();
      await m.waitForTimeout(2000);
      chatOpened = true;
      break;
    }
  }

  if (!chatOpened) {
    // Fallback: click the 3rd "Simon James" occurrence (after the two group previews)
    const simons = m.locator('text=Simon James');
    const count = await simons.count();
    if (count >= 3) {
      await simons.nth(2).click();
      await m.waitForTimeout(4000);
      await shot(m, '04-chat-view');
      await m.goBack();
      await m.waitForTimeout(2000);
    }
  }

  // 5. Friends
  await m.goto('/app/friends');
  await m.waitForSelector('text=Loading', { state: 'hidden', timeout: 10_000 }).catch(() => {});
  await m.waitForTimeout(3000);
  await shot(m, '05-friends');

  // 6. Groups
  await m.goto('/app/groups');
  await m.waitForSelector('text=Loading', { state: 'hidden', timeout: 10_000 }).catch(() => {});
  await m.waitForTimeout(3000);
  await shot(m, '06-groups');

  // 7. Settings
  await m.goto('/app/settings');
  await m.waitForTimeout(2500);
  await shot(m, '07-settings');

  // 8. Profile
  await m.goto('/app/profile');
  await m.waitForTimeout(2500);
  await shot(m, '08-profile');

  // 11. Widget demo — skip here, handled in dedicated widget section below

  // 12. Docs
  await m.goto('/docs');
  await m.waitForTimeout(2500);
  await shot(m, '12-docs');

  // 13. Email templates
  await m.goto('/email-preview');
  await m.waitForTimeout(2000);
  await shot(m, '13-email-templates');

  await mCtx.close();

  // ═══════════════════════════════════════════════════════════════════════════
  // THEMES — mobile
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\nThemes (mobile)...');
  const tCtx = await browser.newContext({
    storageState: AUTH_A,
    viewport: MOBILE,
    deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    baseURL: FRONTEND,
  });
  const tp = await tCtx.newPage();

  await tp.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await tp.goto('/app');
  await tp.waitForTimeout(3000);
  await shot(tp, '18-dark-theme');

  await tp.addInitScript(() => localStorage.setItem('theme', 'light'));
  await tp.goto('/app');
  await tp.waitForTimeout(3000);
  await shot(tp, '19-light-theme');

  await tCtx.close();

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD — wide desktop (only exception)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\nDashboard (desktop)...');
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

  // ═══════════════════════════════════════════════════════════════════════════
  // WIDGET — full interactive demo (anonymous guest + Carl replies)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\nWidget demo...');

  // Anonymous mobile context for the widget visitor
  const wCtx = await browser.newContext({
    viewport: MOBILE,
    deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    baseURL: FRONTEND,
  });
  const w = await wCtx.newPage();

  await w.goto('/widget-demo');
  await w.waitForTimeout(4000);

  // Click the widget bubble to open it
  await w.waitForSelector('#chatr-widget-btn', { timeout: 10_000 }).catch(() => console.log('  Widget button not found after 10s'));
  const bubble = w.locator('#chatr-widget-btn');
  const bubbleVisible = await bubble.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('  Widget bubble visible:', bubbleVisible);
  if (bubbleVisible) {
    await bubble.click();
    await w.waitForTimeout(1500);

    // Screenshot: widget intro form (greeting + name input)
    await shot(w, '11-widget-intro');

    // Fill in the name and message
    await w.waitForTimeout(1000);
    const nameInput = w.locator('#_Ni');
    const msgInput = w.locator('#_Fm');
    const startBtn = w.locator('#_Ws');

    // Wait for the form to render (support agent fetch + DOM creation)
    await w.waitForSelector('#_Ni', { timeout: 8000 }).catch(() => {});
    const nameCount = await nameInput.count();
    const nameVisible = nameCount > 0;
    console.log('  Name input count:', nameCount, 'visible:', await nameInput.isVisible().catch(() => false));

    if (nameVisible) {
      await nameInput.fill('Alex');
      await msgInput.fill("Hi! I'm interested in using Chatr for our customer support. What features does it include?");
      await w.waitForTimeout(500);

      // Screenshot: filled form
      await shot(w, '11b-widget-form-filled');

      // Click Start Chat
      await startBtn.click();
      await w.waitForTimeout(6000);

      // Screenshot: widget in chat mode with sent message
      await shot(w, '11c-widget-chat');

      // Now Carl replies via socket — use a blank page to connect and send messages
      console.log('  Carl replying via socket...');

      // First find the guest conversation via REST
      const convRes = await api.get('/api/users/conversations', { headers: h(tokenA) });
      const convData = await convRes.json().catch(() => ({ conversations: [] }));
      const guestConv = (convData.conversations || []).find((c: any) =>
        c.otherUser?.firstName === 'Alex' ||
        c.otherUser?.displayName?.includes('Alex') ||
        c.otherUser?.username?.includes('Alex') ||
        c.lastMessage?.content?.includes('interested in using Chatr')
      );
      const guestUserId = guestConv?.otherUser?.id || guestConv?.otherUserId;

      if (guestUserId) {
        // Open a blank page and use socket.io via the browser to connect as Carl
        const carlCtx = await browser.newContext({ viewport: DESKTOP, baseURL: FRONTEND });
        const carl = await carlCtx.newPage();
        await carl.goto('about:blank');

        // Load socket.io from the backend and connect as Carl
        await carl.addScriptTag({ url: `${API.replace('localhost', '127.0.0.1')}/socket.io/socket.io.js` });
        await carl.waitForTimeout(1000);

        await carl.evaluate(({ apiUrl, token, recipientId }) => {
          return new Promise<void>((resolve) => {
            const sock = (window as any).io(apiUrl, { auth: { token }, transports: ['websocket', 'polling'] });
            sock.on('connect', () => {
              sock.emit('message:send', { recipientId, content: "Hey Alex! Great to hear from you 😊 Chatr includes real-time messaging, voice notes, file sharing, group chats, and this embeddable widget. Everything is free — just drop in one line of code!", type: 'text' });
              setTimeout(() => {
                sock.emit('message:send', { recipientId, content: "You can also customise the colours, theme, and greeting to match your brand. Want me to set up a demo for you?", type: 'text' });
                setTimeout(() => { sock.disconnect(); resolve(); }, 1500);
              }, 1500);
            });
            sock.on('connect_error', () => { resolve(); });
            setTimeout(() => { resolve(); }, 10000);
          });
        }, { apiUrl: API, token: tokenA, recipientId: guestUserId });

        console.log('  Carl sent 2 replies via socket');
        await carlCtx.close();
      } else {
        console.log('  Guest conversation not found in API. Conversations:', (convData.conversations || []).map((c: any) => c.otherUser?.firstName || c.otherUser?.username || 'unknown').join(', '));
      }

      // Back to the widget — wait for replies to arrive
      await w.waitForTimeout(4000);

      // Screenshot: widget with full conversation (guest message + Carl's replies)
      await shot(w, '11d-widget-conversation');
    }
  }

  await wCtx.close();
  await browser.close();

  // ── Cleanup seeded data ──────────────────────────────────────────────────
  console.log('\nCleaning up...');
  try {
    if (groupId) {
      await api.delete(`/api/groups/${groupId}`, { headers: h(tokenA) });
      console.log('  Deleted group "Project Alpha"');
    }
    if (group2Id) {
      await api.delete(`/api/groups/${group2Id}`, { headers: h(tokenA) });
      console.log('  Deleted group "Design Team"');
    }
  } catch (e) { /* best effort */ }

  try {
    if (friendshipId) {
      await api.delete(`/api/friends/${friendshipId}`, { headers: h(tokenA) });
      console.log('  Removed friendship');
    }
  } catch (e) { /* best effort */ }

  await api.dispose();

  const count = fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length;
  console.log(`\nDone! ${count} screenshots in ./screenshots/`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
