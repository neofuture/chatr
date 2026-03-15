/**
 * Cleans up data seeded by take-screenshots.ts:
 * - Guest users (widget visitors like "Alex", "Me", "John Smith")
 * - Conversations with guest users
 * - Messages sent by the screenshot script (identifiable by content)
 * - Orphaned groups created by repeated runs
 * - Reactions/edits on seeded messages
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEEDED_DM_CONTENT = [
  'Here is the API endpoint I wrote',
  'What do you think about adding voice messages to the widget',
  'That would be amazing! Voice notes in the widget would set us apart',
  'Dashboard is deployed to staging',
  'security audit panel and commit intelligence',
  'Hey Alex! Great to hear from you',
  'customise the colours, theme, and greeting',
  "Hi! I'm interested in using Chatr",
  'interested in using Chatr for our customer support',
];

const SEEDED_GROUP_NAMES = ['Project Alpha', 'Design Team'];

const SEEDED_GROUP_CONTENT = [
  'sprint review is at 3pm today',
  'pushed the latest build to staging',
  'typing indicators look fantastic',
];

async function main() {
  console.log('Cleaning up screenshot-seeded data...\n');

  // 1. Delete guest users and their conversations/messages (cascade handles messages)
  const guests = await prisma.user.findMany({ where: { isGuest: true }, select: { id: true, username: true, firstName: true } });
  if (guests.length > 0) {
    console.log(`Found ${guests.length} guest users:`);
    for (const g of guests) {
      console.log(`  - ${g.firstName || g.username} (${g.id})`);
    }
    // Delete conversations involving guests
    const guestIds = guests.map(g => g.id);
    const convos = await prisma.conversation.deleteMany({
      where: { OR: [{ participantA: { in: guestIds } }, { participantB: { in: guestIds } }] },
    });
    console.log(`  Deleted ${convos.count} guest conversations`);

    // Delete messages to/from guests
    const msgs = await prisma.message.deleteMany({
      where: { OR: [{ senderId: { in: guestIds } }, { recipientId: { in: guestIds } }] },
    });
    console.log(`  Deleted ${msgs.count} guest messages`);

    // Delete the guest users
    const del = await prisma.user.deleteMany({ where: { id: { in: guestIds } } });
    console.log(`  Deleted ${del.count} guest users`);
  } else {
    console.log('No guest users found');
  }

  // 2. Delete seeded DM messages (by content match)
  let dmDeleted = 0;
  for (const content of SEEDED_DM_CONTENT) {
    const result = await prisma.message.deleteMany({
      where: { content: { contains: content } },
    });
    dmDeleted += result.count;
  }
  console.log(`\nDeleted ${dmDeleted} seeded DM messages`);

  // 3. Delete seeded groups (by name)
  for (const name of SEEDED_GROUP_NAMES) {
    const groups = await prisma.group.findMany({ where: { name } });
    for (const group of groups) {
      await prisma.groupMessage.deleteMany({ where: { groupId: group.id } });
      await prisma.groupMember.deleteMany({ where: { groupId: group.id } });
      await prisma.group.delete({ where: { id: group.id } });
      console.log(`Deleted group "${name}" (${group.id})`);
    }
  }

  // 4. Delete seeded group messages by content
  let gmDeleted = 0;
  for (const content of SEEDED_GROUP_CONTENT) {
    const result = await prisma.groupMessage.deleteMany({
      where: { content: { contains: content } },
    });
    gmDeleted += result.count;
  }
  console.log(`Deleted ${gmDeleted} seeded group messages`);

  // 5. Clean up orphaned reactions on deleted messages
  const orphanReactions = await prisma.messageReaction.deleteMany({
    where: { message: { deletedAt: { not: null } } },
  });
  if (orphanReactions.count > 0) {
    console.log(`Deleted ${orphanReactions.count} orphaned reactions`);
  }

  // Summary
  const totalMessages = await prisma.message.count();
  const totalGroups = await prisma.group.count();
  const totalUsers = await prisma.user.count();
  console.log(`\nDatabase now: ${totalUsers} users, ${totalMessages} messages, ${totalGroups} groups`);
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
