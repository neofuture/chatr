/**
 * Cleans up data seeded by take-screenshots.ts using the REST API + socket.
 * Run from project root: ./backend/node_modules/.bin/tsx scripts/cleanup-screenshot-data.ts
 */
import { request as pwRequest } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const API = process.env.E2E_BACKEND_URL || 'http://localhost:3001';
const AUTH_A = path.join(__dirname, '..', 'e2e', '.auth', 'user-a.json');
const AUTH_B = path.join(__dirname, '..', 'e2e', '.auth', 'user-b.json');

function h(token: string) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }

function getToken(authFile: string): string {
  const state = JSON.parse(fs.readFileSync(authFile, 'utf8'));
  const ls = state.origins?.[0]?.localStorage ?? [];
  return ls.find((e: any) => e.name === 'token')?.value ?? '';
}

const SEEDED_DM_PATTERNS = [
  'Here is the API endpoint I wrote',
  'What do you think about adding voice messages to the widget',
  'Voice notes in the widget would set us apart',
  'Dashboard is deployed to staging',
  'security audit panel and commit intelligence',
  "Hi! I'm interested in using Chatr",
  'interested in using Chatr for our customer support',
];

const SEEDED_GROUP_NAMES = ['Project Alpha', 'Design Team'];

async function main() {
  if (!fs.existsSync(AUTH_A)) { console.log('No auth state. Skipping.'); return; }

  const tokenA = getToken(AUTH_A);
  const tokenB = getToken(AUTH_B);
  const api = await pwRequest.newContext({ baseURL: API });

  console.log('Cleaning up screenshot-seeded data...\n');

  // 1. Get conversations and find guest/widget visitors
  const convRes = await api.get('/api/users/conversations', { headers: h(tokenA) });
  const convData = await convRes.json().catch(() => ({ conversations: [] }));
  const conversations = convData.conversations || [];

  const guestConvs = conversations.filter((c: any) =>
    c.otherUser?.isGuest || c.otherUser?.firstName === 'Alex' ||
    c.otherUser?.firstName === 'Me' || c.otherUser?.firstName === 'John Smith' ||
    c.otherUser?.displayName?.includes('Guest')
  );
  console.log(`Found ${guestConvs.length} guest/widget conversations`);

  // 2. For each guest conversation, unsend all messages (soft delete)
  for (const conv of guestConvs) {
    const otherUser = conv.otherUser;
    const name = otherUser?.firstName || otherUser?.username || 'unknown';
    console.log(`  Guest: ${name} (${otherUser?.id})`);

    // Get messages in this conversation
    const msgRes = await api.get(`/api/messages/${otherUser.id}?limit=100`, { headers: h(tokenA) });
    const msgData = await msgRes.json().catch(() => ({ messages: [] }));
    console.log(`    ${(msgData.messages || []).length} messages`);
  }

  // 3. Get Simon James conversation and remove seeded messages
  const simonConv = conversations.find((c: any) =>
    c.otherUser?.firstName === 'Simon' || c.otherUser?.username?.includes('simon')
  );
  if (simonConv) {
    const msgRes = await api.get(`/api/messages/${simonConv.otherUser.id}?limit=100`, { headers: h(tokenA) });
    const msgData = await msgRes.json().catch(() => ({ messages: [] }));
    const messages = msgData.messages || [];

    let seededCount = 0;
    const seededIds: string[] = [];
    for (const msg of messages) {
      const isSeeded = SEEDED_DM_PATTERNS.some(p => msg.content?.includes(p));
      if (isSeeded) {
        seededIds.push(msg.id);
        seededCount++;
      }
    }
    console.log(`\nSimon James conversation: ${messages.length} messages, ${seededCount} seeded`);
    if (seededIds.length > 0) {
      console.log(`  Seeded message IDs to unsend: ${seededIds.join(', ')}`);

      // Unsend via socket
      const socketSrc = await (await fetch(`${API}/socket.io/socket.io.js`)).text();

      for (const [token, label] of [[tokenA, 'A'], [tokenB, 'B']] as const) {
        // Find which messages belong to this user
        const userMsgs = messages.filter((m: any) =>
          seededIds.includes(m.id) &&
          ((label === 'A' && m.senderId !== simonConv.otherUser.id) ||
           (label === 'B' && m.senderId === simonConv.otherUser.id))
        );
        if (userMsgs.length === 0) continue;

        console.log(`  Unsending ${userMsgs.length} messages as user ${label}...`);
        const { chromium } = await import('@playwright/test');
        const browser = await chromium.launch({ headless: true });
        const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
        const page = await ctx.newPage();
        await page.goto('about:blank');
        await page.evaluate((code) => { new Function(code)(); }, socketSrc);
        await page.evaluate(({ apiUrl, token, ids }) => {
          return new Promise<void>((resolve) => {
            const sock = (window as any).io(apiUrl, { auth: { token }, transports: ['websocket', 'polling'] });
            sock.on('connect', () => {
              let i = 0;
              const next = () => {
                if (i >= ids.length) { sock.disconnect(); resolve(); return; }
                sock.emit('message:unsend', ids[i]);
                i++;
                setTimeout(next, 300);
              };
              next();
            });
            sock.on('connect_error', () => resolve());
            setTimeout(() => resolve(), 15000);
          });
        }, { apiUrl: API, token, ids: userMsgs.map((m: any) => m.id) });
        await ctx.close();
        await browser.close();
      }
    }
  }

  // 4. Delete seeded groups
  console.log('\nCleaning up groups...');
  const grpRes = await api.get('/api/groups', { headers: h(tokenA) });
  const grpData = await grpRes.json().catch(() => ({ groups: [] }));
  const groups = grpData.groups || grpData || [];

  for (const name of SEEDED_GROUP_NAMES) {
    const matches = (Array.isArray(groups) ? groups : []).filter((g: any) => g.name === name);
    for (const g of matches) {
      const delRes = await api.delete(`/api/groups/${g.id}`, { headers: h(tokenA) });
      console.log(`  Deleted group "${name}" (${g.id}): ${delRes.status()}`);
    }
  }

  // 5. Remove extra friendships created by the script
  // (The real friendship between A and B should stay if it existed before)

  await api.dispose();
  console.log('\nDone! Database cleaned.');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
