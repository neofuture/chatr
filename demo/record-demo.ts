/**
 * Split-screen demo — Carl (left) & Simon (right).
 *
 * Each phone has a persistent name badge so the viewer always
 * knows who is who. Title cards use both names prominently.
 * Pacing is varied and organic with reading pauses.
 *
 * Output: 1920×1080 (16:9) MP4.
 */
import { chromium, devices, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const FRONTEND = process.env.E2E_FRONTEND_URL || 'http://localhost:3000';
const BACKEND  = process.env.E2E_BACKEND_URL  || 'http://localhost:3001';
const BYPASS   = process.env.TEST_OTP_BYPASS   || '000000';
const DIR_A    = path.join(__dirname, '.tmp-carl');
const DIR_B    = path.join(__dirname, '.tmp-simon');
const OUTPUT   = path.join(__dirname, 'demo.mp4');
const ASSETS   = path.join(__dirname, '..', 'e2e', 'assets');

const CARL_CREDS  = { email: 'carlfearby@me.com',  password: 'Vertinero2835!' };
const SIMON_CREDS = { email: 'neofuture@gmail.com', password: 'Vertinero2835!' };

// ── Helpers ──────────────────────────────────────────────────────────────────

const wait = (ms: number) => new Promise(r => setTimeout(r, ms * (0.9 + Math.random() * 0.3)));

async function scroll(pg: Page, dist: number, dur = 1200) {
  await pg.evaluate(`new Promise(function(r){var s=window.scrollY,d=${dist},t=${dur},st=performance.now();(function f(n){var e=n-st,p=Math.min(e/t,1),q=p<.5?2*p*p:-1+(4-2*p)*p;window.scrollTo(0,s+d*q);p<1?requestAnimationFrame(f):r()})(st)})`);
}

async function tap(pg: Page, loc: any, timeout = 2000) {
  if (await loc.isVisible({ timeout }).catch(() => false)) {
    await loc.click({ force: true }).catch(() => {});
    return true;
  }
  return false;
}

async function humanType(pg: Page, text: string) {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // Occasional micro-pause mid-word (thinking)
    if (i > 0 && i % (8 + Math.floor(Math.random() * 6)) === 0) await wait(150 + Math.random() * 200);
    const d = ch === ' ' ? 50 + Math.random() * 40 : 22 + Math.random() * 50;
    await pg.keyboard.type(ch, { delay: d });
  }
}

async function apiLogin(pg: Page, creds: typeof CARL_CREDS) {
  const r = await pg.request.post(`${BACKEND}/api/auth/login`, {
    data: { email: creds.email, password: creds.password, loginVerificationCode: BYPASS },
  });
  return (await r.json()) as { token: string; user: any };
}

async function injectAuth(pg: Page, auth: { token: string; user: any }) {
  await pg.evaluate(`localStorage.setItem('token',${JSON.stringify(auth.token)});localStorage.setItem('user',${JSON.stringify(JSON.stringify(auth.user))})`);
}

/** Inject a floating name badge that persists across navigations */
async function injectNameBadge(pg: Page, name: string, color: string) {
  await pg.addInitScript(`
    (function(){
      function addBadge(){
        if(document.getElementById('demo-badge'))return;
        var d=document.createElement('div');d.id='demo-badge';
        d.style.cssText='position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:999999;background:${color};color:#fff;padding:4px 16px;border-radius:20px;font:bold 13px -apple-system,system-ui,sans-serif;letter-spacing:0.5px;box-shadow:0 2px 8px rgba(0,0,0,0.3);pointer-events:none;opacity:0.9';
        d.textContent='${name}';document.body.appendChild(d);
      }
      if(document.body)addBadge();
      else document.addEventListener('DOMContentLoaded',addBadge);
      new MutationObserver(addBadge).observe(document,{childList:true,subtree:true});
    })()
  `);
}

/** Title card shown on BOTH screens */
async function chapter(carl: Page, simon: Page, emoji: string, title: string, subtitle = '') {
  const html = (name: string, clr: string) => `<!DOCTYPE html><html><body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#f8fafc;font-family:-apple-system,system-ui,sans-serif;text-align:center;padding:30px;box-sizing:border-box">
    <div style="font-size:42px;margin-bottom:14px">${emoji}</div>
    <div style="font-size:24px;font-weight:800;letter-spacing:-0.5px;margin-bottom:${subtitle ? '10' : '0'}px">${title}</div>
    ${subtitle ? `<div style="font-size:13px;opacity:0.45;max-width:260px;line-height:1.5">${subtitle}</div>` : ''}
    <div style="position:fixed;top:8px;left:50%;transform:translateX(-50%);background:${clr};color:#fff;padding:4px 16px;border-radius:20px;font:bold 13px -apple-system,system-ui,sans-serif;letter-spacing:0.5px;box-shadow:0 2px 8px rgba(0,0,0,0.3);opacity:0.9">${name}</div>
  </body></html>`;
  await Promise.all([
    carl.setContent(html('Carl', '#3b82f6'), { waitUntil: 'load' }),
    simon.setContent(html('Simon', '#10b981'), { waitUntil: 'load' }),
  ]);
  await wait(3200);
}

async function go(pg: Page, route: string) {
  await pg.goto(`${FRONTEND}${route}`, { waitUntil: 'networkidle', timeout: 15_000 });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎬 Recording split-screen demo...\n');
  fs.mkdirSync(DIR_A, { recursive: true });
  fs.mkdirSync(DIR_B, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const VW = 540, VH = 960;
  const ctxOpts = (dir: string) => ({
    ...devices['iPhone 14'],
    viewport: { width: VW, height: VH },
    locale: 'en-GB',
    colorScheme: 'dark' as const,
    recordVideo: { dir, size: { width: VW, height: VH } },
  });

  const ctxA = await browser.newContext(ctxOpts(DIR_A));
  const ctxB = await browser.newContext(ctxOpts(DIR_B));
  const carl  = await ctxA.newPage();
  const simon = await ctxB.newPage();

  // Persistent name badges (blue for Carl, green for Simon)
  await injectNameBadge(carl, 'Carl', '#3b82f6');
  await injectNameBadge(simon, 'Simon', '#10b981');

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  console.log('  Setting up...');
  await carl.request.post(`${BACKEND}/api/test/mode`, {
    headers: { 'Content-Type': 'application/json' }, data: { enabled: true },
  });

  const authA = await apiLogin(carl, CARL_CREDS);
  const authB = await apiLogin(simon, SIMON_CREDS);
  if (!authA.token || !authB.token) throw new Error('Login failed');

  // Restore Carl's profile images if missing
  try {
    const me = await (await carl.request.get(`${BACKEND}/api/users/me`, {
      headers: { Authorization: `Bearer ${authA.token}` },
    })).json();
    if (!me.profileImage || !me.coverImage) {
      const up = path.join(__dirname, '..', 'backend', 'uploads');
      const profiles = fs.readdirSync(path.join(up, 'profiles'))
        .filter(f => f.startsWith(authA.user?.id) && !f.includes('-sm') && !f.includes('-md')).sort().reverse();
      const covers = fs.readdirSync(path.join(up, 'covers'))
        .filter(f => f.startsWith(authA.user?.id) && !f.includes('-sm')).sort().reverse();
      const pImg = profiles[0] ? `/uploads/profiles/${profiles[0]}` : null;
      const cImg = covers[0]   ? `/uploads/covers/${covers[0]}`     : null;
      if (pImg || cImg) {
        await carl.request.post(`${BACKEND}/api/test/restore-images`, {
          headers: { Authorization: `Bearer ${authA.token}`, 'Content-Type': 'application/json' },
          data: { ...(pImg ? { profileImage: pImg } : {}), ...(cImg ? { coverImage: cImg } : {}) },
        });
      }
    }
  } catch {}

  await go(carl, '/');   await injectAuth(carl, authA);
  await go(simon, '/');  await injectAuth(simon, authB);
  console.log('  Ready.\n');

  // ═══════════════════════════════════════════════════════════════════════════
  //  INTRO
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '💬', 'Chatr Demo', 'A real-time messaging platform built with Next.js, Socket.IO & Prisma');
  await wait(500);

  // ═══════════════════════════════════════════════════════════════════════════
  //  1 — LANDING PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '🏠', 'Landing Page', 'Both users browse the marketing site');
  console.log('  1. Landing page');

  await Promise.all([go(carl, '/'), go(simon, '/')]);
  await wait(3000);
  // Carl scrolls faster (impatient), Simon takes his time
  await scroll(carl, 350, 1800);  await wait(800);
  await scroll(simon, 300, 2200); await wait(1400);
  await scroll(carl, 400, 1600);  await wait(600);
  await scroll(simon, 400, 2000); await wait(1800);
  await scroll(carl, 500, 2000);  await wait(1200);
  await scroll(simon, 500, 2200); await wait(2000);
  await Promise.all([
    carl.evaluate(`window.scrollTo({top:0,behavior:'smooth'})`),
    simon.evaluate(`window.scrollTo({top:0,behavior:'smooth'})`),
  ]);
  await wait(1500);

  // ═══════════════════════════════════════════════════════════════════════════
  //  2 — ENTER THE APP
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '🔐', 'Login', 'Authenticated — entering the app');
  console.log('  2. Login');

  await Promise.all([go(carl, '/app'), go(simon, '/app')]);
  await wait(3000);

  // ═══════════════════════════════════════════════════════════════════════════
  //  3 — CONVERSATIONS + SEARCH
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '💬', 'Conversations', 'Chat list, unread badges & search');
  console.log('  3. Conversations');

  await Promise.all([go(carl, '/app'), go(simon, '/app')]);
  await wait(2500);

  // Carl searches
  const chatSearch = carl.getByPlaceholder(/Search messages/i).first();
  if (await chatSearch.isVisible({ timeout: 2000 }).catch(() => false)) {
    await chatSearch.click(); await wait(400);
    await humanType(carl, 'weekend');
    await wait(2500);
    await chatSearch.fill('');
    await wait(1000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  4 — REAL-TIME DM
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '⚡', 'Real-Time Chat', 'Typing indicators & instant message delivery');
  console.log('  4. DM messaging');

  // Both open DM with each other
  const carlDM = carl.locator('button').filter({ hasText: /simon|Simon/i }).first();
  const simonDM = simon.locator('button').filter({ hasText: /carl|Carl/i }).first();
  await Promise.all([tap(carl, carlDM, 3000), tap(simon, simonDM, 3000)]);
  await wait(3000);

  const carlInput = carl.locator('textarea[placeholder*="Message"]').first();
  const simonInput = simon.locator('textarea[placeholder*="Message"]').first();

  // Simon types first — Carl sees the typing indicator
  if (await simonInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await simonInput.click({ force: true }); await wait(300);
    await humanType(simon, 'Hey! Are you free this weekend?');
    await wait(2000); // Let Carl's screen show the indicator
    await tap(simon, simon.locator('button[title="Send message"]'));
    await wait(3500); // Watch it arrive on Carl's side
  }

  // Carl reads it... pauses... then replies
  await wait(1500);
  if (await carlInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await carlInput.click({ force: true }); await wait(600);
    await humanType(carl, 'Yeah! What did you have in mind?');
    await wait(1500);
    await tap(carl, carl.locator('button[title="Send message"]'));
    await wait(3000);
  }

  // Simon sees it and responds quickly
  if (await simonInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await simonInput.click({ force: true }); await wait(400);
    await humanType(simon, 'Maybe lunch then the beach? 🏖️');
    await wait(1200);
    await tap(simon, simon.locator('button[title="Send message"]'));
    await wait(3000);
  }

  // Carl sends an enthusiastic reply
  if (await carlInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await carlInput.click({ force: true }); await wait(300);
    await humanType(carl, 'Perfect, count me in! 🍕');
    await wait(800);
    await tap(carl, carl.locator('button[title="Send message"]'));
    await wait(2500);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  5 — EMOJI & FILES
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '📎', 'Media Sharing', 'Emoji picker, images & audio files');
  console.log('  5. Emoji + files');

  // Make sure Carl is in the DM
  await go(carl, '/app'); await wait(800);
  await tap(carl, carlDM, 3000); await wait(2000);

  // Emoji picker
  const emojiBtn = carl.locator('button[title="Emoji"], button:has(i.fa-smile)').first();
  if (await tap(carl, emojiBtn, 2000)) {
    await wait(3500);
    await tap(carl, emojiBtn);
    await wait(800);
  }

  // Send an image
  const fileInput = carl.locator('input[type="file"]').first();
  if (await fileInput.count().then((c: number) => c > 0).catch(() => false)) {
    const imgPath = path.join(ASSETS, 'test-image.png');
    if (fs.existsSync(imgPath)) {
      await fileInput.setInputFiles(imgPath);
      await wait(2500);
      const sendBtn = carl.locator('button').filter({ hasText: /Send file/i }).first();
      if (await tap(carl, sendBtn, 3000)) await wait(3000);
    }

    // Send audio
    const audioPath = path.join(ASSETS, 'test-audio.wav');
    if (fs.existsSync(audioPath)) {
      await fileInput.setInputFiles(audioPath);
      await wait(2500);
      const sendBtn = carl.locator('button').filter({ hasText: /Send file/i }).first();
      if (await tap(carl, sendBtn, 3000)) await wait(3000);
    }
  }

  // Simon sees the files arrive
  await wait(2000);

  // ═══════════════════════════════════════════════════════════════════════════
  //  6 — FRIENDS
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '👥', 'Friends', 'Search users, manage requests & blocked list');
  console.log('  6. Friends');

  await Promise.all([go(carl, '/app/friends'), go(simon, '/app/friends')]);
  await wait(3000);

  // Carl searches for Simon
  const friendSearch = carl.getByPlaceholder(/Search people/i).first();
  if (await friendSearch.isVisible({ timeout: 2000 }).catch(() => false)) {
    await friendSearch.click(); await wait(400);
    await humanType(carl, 'simon');
    await wait(3000);
    await friendSearch.fill('');
    await wait(1000);
  }

  // Browse tabs on Carl's side
  for (const label of ['Requests', 'Blocked', 'Friends']) {
    const tab = carl.locator('button').filter({ hasText: label }).first();
    if (await tap(carl, tab, 1500)) await wait(2000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  7 — CREATE GROUP
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '🏗️', 'Create a Group', 'Carl creates a group and adds Simon');
  console.log('  7. Create group');

  await Promise.all([go(carl, '/app/groups'), go(simon, '/app/groups')]);
  await wait(2000);

  const createBtn = carl.locator('button').filter({ hasText: /new group|create/i }).first()
    .or(carl.locator('button[title="Create group"]').first())
    .or(carl.locator('button:has(i.fa-plus)').first());
  if (await tap(carl, createBtn, 2000)) {
    await wait(1800);

    const nameInput = carl.getByPlaceholder(/group name/i).first();
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.click(); await wait(300);
      await humanType(carl, 'Weekend Plans');
      await wait(1500);
    }

    const memberSearch = carl.getByPlaceholder(/search.*member|add.*member|search.*friend/i).first();
    if (await memberSearch.isVisible({ timeout: 1500 }).catch(() => false)) {
      await memberSearch.click(); await wait(300);
      await humanType(carl, 'simon');
      await wait(2500);
      await tap(carl, carl.locator('button').filter({ hasText: /Simon/ }).first(), 2000);
      await wait(1500);
    }

    const confirmBtn = carl.getByRole('button', { name: /create group/i }).first();
    if (await tap(carl, confirmBtn, 2000)) await wait(3500);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  8 — GROUP CHAT
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '👥', 'Group Chat', 'Real-time messaging with multiple people');
  console.log('  8. Group chat');

  // Refresh both so the group appears
  await Promise.all([go(carl, '/app/groups'), go(simon, '/app/groups')]);
  await wait(2500);

  // Both open the group
  const carlGroup = carl.locator('button').filter({ hasText: /Weekend Plans/i }).first();
  const simonGroup = simon.locator('button').filter({ hasText: /Weekend Plans/i }).first();
  await tap(carl, carlGroup, 3000); await wait(1200);
  await tap(simon, simonGroup, 3000); await wait(2500);

  // Carl sends first group message
  const gInputC = carl.locator('textarea[placeholder*="Message"]').first();
  if (await gInputC.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gInputC.click({ force: true }); await wait(400);
    await humanType(carl, 'Welcome to the group! 🎉');
    await wait(1200);
    await tap(carl, carl.locator('button[title="Send message"]'));
    await wait(3500);
  }

  // Simon replies
  const gInputS = simon.locator('textarea[placeholder*="Message"]').first();
  if (await gInputS.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gInputS.click({ force: true }); await wait(500);
    await humanType(simon, 'Hey! Excited for Saturday 🏖️');
    await wait(1000);
    await tap(simon, simon.locator('button[title="Send message"]'));
    await wait(3500);
  }

  // Carl sends another
  if (await gInputC.isVisible({ timeout: 2000 }).catch(() => false)) {
    await gInputC.click({ force: true }); await wait(400);
    await humanType(carl, "Let's meet at noon?");
    await wait(800);
    await tap(carl, carl.locator('button[title="Send message"]'));
    await wait(3000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  9 — PROFILE
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '👤', 'Profile', 'Cover photos, avatars & inline editing with save indicators');
  console.log('  9. Profile');

  await Promise.all([go(carl, '/app/profile'), go(simon, '/app/profile')]);
  await wait(3500);
  await Promise.all([scroll(carl, 180, 900), scroll(simon, 180, 1100)]);
  await wait(2000);

  // Carl edits display name — shows saving/saved indicator
  const dnBtn = carl.locator('[data-testid="field-displayName"] button').first();
  if (await tap(carl, dnBtn, 2000)) {
    await wait(500);
    const dnInput = carl.locator('[data-testid="field-displayName"] input').first();
    if (await dnInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dnInput.fill('');
      await humanType(carl, 'Carl Fearby');
      await wait(800);
      await dnInput.blur();
      await wait(3000); // See the save indicator
    }
  }

  // Edit first name
  const fnBtn = carl.locator('[data-testid="field-firstName"] button').first();
  if (await tap(carl, fnBtn, 1500)) {
    await wait(400);
    const fnInput = carl.locator('[data-testid="field-firstName"] input').first();
    if (await fnInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fnInput.fill('');
      await humanType(carl, 'Carl');
      await fnInput.blur();
      await wait(2500);
    }
  }

  // Gender
  const genderBtn = carl.locator('[data-testid="field-gender"] button').first();
  if (await tap(carl, genderBtn, 1500)) {
    const genderSelect = carl.locator('[data-testid="field-gender"] select').first();
    if (await genderSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await genderSelect.selectOption('male');
      await wait(2500);
    }
  }

  // Scroll to account section
  await Promise.all([scroll(carl, 250, 1000), scroll(simon, 250, 1000)]);
  await wait(2000);

  // ═══════════════════════════════════════════════════════════════════════════
  //  10 — SETTINGS & DARK/LIGHT MODE
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '⚙️', 'Settings', 'Dark mode, light mode & privacy controls');
  console.log('  10. Settings');

  await Promise.all([go(carl, '/app/settings'), go(simon, '/app/settings')]);
  await wait(3000);
  await scroll(carl, 200, 800);
  await wait(1500);

  // Carl toggles to light mode
  const toggle = carl.locator('label:has(input[type="checkbox"])').first();
  if (await tap(carl, toggle, 2000)) await wait(3000);

  // Quick tour in light mode
  for (const route of ['/app', '/app/friends', '/app/groups', '/app/profile']) {
    await go(carl, route);
    await wait(1800);
  }

  // Switch back to dark
  await go(carl, '/app/settings'); await wait(1000);
  await tap(carl, toggle, 2000);
  await wait(2000);

  // ═══════════════════════════════════════════════════════════════════════════
  //  11 — NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '🧭', 'Navigation', 'Bottom tabs for quick access everywhere');
  console.log('  11. Navigation');

  await Promise.all([go(carl, '/app'), go(simon, '/app')]);
  await wait(1800);

  // Carl taps through all nav tabs
  for (const label of ['FRIENDS', 'GROUPS']) {
    const nav = carl.locator('nav a').filter({ hasText: new RegExp(label, 'i') }).first();
    if (await tap(carl, nav, 1500)) await wait(1500);
  }
  if (await tap(carl, carl.locator('nav a').nth(3), 1500)) await wait(1500);
  const chatsNav = carl.locator('nav a').filter({ hasText: /CHATS/i }).first();
  if (await tap(carl, chatsNav, 1500)) await wait(1500);

  // Simon also taps around
  for (const label of ['GROUPS', 'FRIENDS']) {
    const nav = simon.locator('nav a').filter({ hasText: new RegExp(label, 'i') }).first();
    if (await tap(simon, nav, 1500)) await wait(1200);
  }
  const simChats = simon.locator('nav a').filter({ hasText: /CHATS/i }).first();
  if (await tap(simon, simChats, 1500)) await wait(1500);

  // ═══════════════════════════════════════════════════════════════════════════
  //  12 — TYPING ON CHAT LIST + CLOSING
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '✨', 'Live Indicators', 'Typing status visible on the conversations list');
  console.log('  12. Typing on chat list');

  await Promise.all([go(carl, '/app'), go(simon, '/app')]);
  await wait(2500);

  // Simon opens DM and types — Carl sees typing indicator on his chat list
  const simonDM2 = simon.locator('button').filter({ hasText: /carl|Carl/i }).first();
  if (await tap(simon, simonDM2, 2000)) {
    await wait(1500);
    const sInput = simon.locator('textarea[placeholder*="Message"]').first();
    if (await sInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sInput.click({ force: true });
      await sInput.fill('How about 12pm at the pier?');
      await wait(5000); // Carl sees typing indicator on chat list
      // Simon sends it
      await tap(simon, simon.locator('button[title="Send message"]'));
      await wait(3000);
    }
  }

  // Carl opens the DM to see the new message
  const carlDM2 = carl.locator('button').filter({ hasText: /simon|Simon/i }).first();
  await tap(carl, carlDM2, 2000);
  await wait(4000);

  // ═══════════════════════════════════════════════════════════════════════════
  //  OUTRO
  // ═══════════════════════════════════════════════════════════════════════════
  await chapter(carl, simon, '💬', 'Chatr', 'Real-time • Groups • Friends • Profiles • Themes');
  await wait(1500);

  // ── Finalize ───────────────────────────────────────────────────────────────
  console.log('\n  Finalizing...');
  const videoPathA = await carl.video()?.path();
  const videoPathB = await simon.video()?.path();
  await carl.close();  await ctxA.close();
  await simon.close(); await ctxB.close();
  await browser.close();

  // Cleanup demo group
  try {
    const tmp = await chromium.launch({ headless: true });
    const tc = await tmp.newContext(); const tp = await tc.newPage();
    const gRes = await tp.request.get(`${BACKEND}/api/groups`, { headers: { Authorization: `Bearer ${authA.token}` } });
    const gData = await gRes.json();
    const dg = (gData?.groups || []).find((g: any) => g.name === 'Weekend Plans');
    if (dg) await tp.request.delete(`${BACKEND}/api/groups/${dg.id}`, { headers: { Authorization: `Bearer ${authA.token}` } }).catch(() => {});
    await tc.close(); await tmp.close();
  } catch {}

  // Find video files
  const findWebm = (dir: string, hint?: string) => {
    if (hint && fs.existsSync(hint)) return hint;
    if (!fs.existsSync(dir)) return '';
    const f = fs.readdirSync(dir).filter(x => x.endsWith('.webm'));
    return f.length ? path.join(dir, f[0]) : '';
  };
  const webmA = findWebm(DIR_A, videoPathA || undefined);
  const webmB = findWebm(DIR_B, videoPathB || undefined);
  if (!webmA || !webmB) { console.error('❌ Missing video files'); process.exit(1); }

  try {
    const d = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${webmA}"`, { encoding: 'utf8' });
    console.log(`  Raw: ${parseFloat(d).toFixed(1)}s each`);
  } catch {}

  console.log('  Compositing 1920×1080...');
  try {
    execSync([
      `ffmpeg -y -i "${webmA}" -i "${webmB}"`,
      `-filter_complex "`,
      `[0:v]scale=540:960,pad=960:1080:210:60:color=#0f172a[left];`,
      `[1:v]scale=540:960,pad=960:1080:210:60:color=#0f172a[right];`,
      `[left][right]hstack"`,
      `-c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart "${OUTPUT}"`,
    ].join(' '), { stdio: 'inherit' });
    console.log(`\n✅ ${OUTPUT}`);
  } catch (e) {
    console.error('❌ ffmpeg failed:', e);
  }

  fs.rmSync(DIR_A, { recursive: true, force: true });
  fs.rmSync(DIR_B, { recursive: true, force: true });
}

main().catch(err => { console.error('❌ Failed:', err); process.exit(1); });
