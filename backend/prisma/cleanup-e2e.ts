/**
 * cleanup-e2e.ts
 *
 * Surgically removes ONLY identifiable E2E test data.
 * NEVER deletes real user messages, conversations, or groups.
 *
 * Usage:  npm run cleanup:e2e   (from backend/)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_EMAILS = ['carlfearby@me.com', 'neofuture@gmail.com'];

// Exact prefixes for groups created by E2E tests
const E2E_GROUP_PREFIXES = [
  'UI Group ',
  'Admin Test ',
  'Ownership Test ',
  'Kick Test ',
  'Leave Test ',
  'Delete Test ',
  'E2E GrpMsg ',
  'E2E Group ',
  'ProfileGrp ',
  'Test Group ',
];

// Content patterns for DM messages created by E2E tests (regex-safe prefixes)
const E2E_DM_CONTENT_PATTERNS = [
  'Hello ',         // "Hello <base36>"
  'Unsend ',        // "Unsend <base36>"
  'E2E test msg ',  // "E2E test msg <ts>"
];

// Messages that start with "Link https://example.com " are also E2E
const E2E_DM_LINK_PREFIX = 'Link https://example.com ';

// File names created by the E2E asset generator
const E2E_FILE_NAMES = ['test-image.png', 'test-audio.wav', 'test-file.txt'];

// Group message content patterns
const E2E_GROUP_MSG_PATTERNS = [
  'Group msg ',
  'Realtime group ',
  'Check https://example.com ',
];

async function main() {
  console.log('🧹 E2E Cleanup — targeting ONLY test data…\n');

  // ── 1. Resolve test user IDs ────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true, email: true, username: true },
  });

  if (users.length < 2) {
    console.error('❌ Could not find both test users. Found:', users.map(u => u.email));
    process.exit(1);
  }

  const carl = users.find(u => u.email === 'carlfearby@me.com')!;
  const simon = users.find(u => u.email === 'neofuture@gmail.com')!;

  console.log(`  Carl:  ${carl.id} (${carl.username})`);
  console.log(`  Simon: ${simon.id} (${simon.username})\n`);

  // ── 2. Delete ONLY E2E-pattern DM messages between the two test users ──────
  const dmBetween = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: carl.id, recipientId: simon.id },
        { senderId: simon.id, recipientId: carl.id },
      ],
    },
    select: { id: true, content: true, fileName: true },
  });

  const testMsgIds = dmBetween
    .filter(m => {
      const c = m.content;
      if (E2E_DM_CONTENT_PATTERNS.some(p => c.startsWith(p))) return true;
      if (c.startsWith(E2E_DM_LINK_PREFIX)) return true;
      if (m.fileName && E2E_FILE_NAMES.includes(m.fileName)) return true;
      if (c === 'Voice message' && m.fileName?.startsWith('voice-')) return true;
      return false;
    })
    .map(m => m.id);

  if (testMsgIds.length > 0) {
    const del = await prisma.message.deleteMany({ where: { id: { in: testMsgIds } } });
    console.log(`  ✓ Deleted ${del.count} E2E test DM messages (kept ${dmBetween.length - testMsgIds.length} real messages)`);
  } else {
    console.log(`  ✓ No E2E test DM messages found`);
  }

  // ── 3. Delete E2E test groups (by name prefix only) ─────────────────────────
  const testGroups = await prisma.group.findMany({
    where: {
      OR: E2E_GROUP_PREFIXES.map(prefix => ({
        name: { startsWith: prefix },
      })),
    },
    select: { id: true, name: true },
  });

  if (testGroups.length > 0) {
    const groupIds = testGroups.map(g => g.id);
    await prisma.groupMessage.deleteMany({ where: { groupId: { in: groupIds } } });
    await prisma.groupMember.deleteMany({ where: { groupId: { in: groupIds } } });
    const gDel = await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
    console.log(`  ✓ Deleted ${gDel.count} test groups`);
  } else {
    console.log(`  ✓ No test groups found`);
  }

  // ── 4. Ensure friendship is in 'accepted' state ────────────────────────────
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: carl.id, addresseeId: simon.id },
        { requesterId: simon.id, addresseeId: carl.id },
      ],
    },
  });

  for (const f of friendships) {
    if (f.status !== 'accepted') {
      await prisma.friendship.update({ where: { id: f.id }, data: { status: 'accepted' } });
      console.log(`  ✓ Restored friendship to 'accepted' (was '${f.status}')`);
    }
  }
  if (friendships.every(f => f.status === 'accepted')) {
    console.log(`  ✓ Friendship already in 'accepted' state`);
  }

  // ── 5. Restore profiles (only fields E2E tests modify) ─────────────────────
  await prisma.user.update({
    where: { id: carl.id },
    data: { displayName: null, firstName: 'Carl', gender: null },
  });
  await prisma.user.update({
    where: { id: simon.id },
    data: { displayName: null, firstName: 'Simon', gender: null },
  });
  console.log(`  ✓ Restored test user profiles`);

  // ── 6. Restore privacy settings ────────────────────────────────────────────
  const defaultPrivacy = {
    privacyOnlineStatus: 'everyone',
    privacyPhone: 'nobody',
    privacyEmail: 'nobody',
    privacyFullName: 'everyone',
    privacyGender: 'nobody',
    privacyJoinedDate: 'everyone',
  };
  await prisma.user.update({ where: { id: carl.id }, data: defaultPrivacy });
  await prisma.user.update({ where: { id: simon.id }, data: defaultPrivacy });
  console.log(`  ✓ Restored privacy settings`);

  console.log('\n✅ E2E cleanup complete — only test data was removed.\n');
}

main()
  .catch(e => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
