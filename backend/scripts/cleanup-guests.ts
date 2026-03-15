import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEEDED_DM_CONTENT = [
  'Here is the API endpoint',
  'rate limiting to this endpoint',
  'sliding window rate limiter',
  'Deploying to staging now',
  'Deployed to staging',
  'security audit panel and commit intelligence',
  'merging the PR now',
];

const SEEDED_GROUP_MSG_CONTENT = [
  'Sprint review at 3pm today',
  'all 1,300 tests passing',
  'The new typing indicators look fantastic',
  'Reviewing the PR now',
  'Hey team! The sprint review',
  'pushed the latest build to staging',
  'pushed the widget palette designer',
  'Great work! Ill review the PR',
  'Customers can customise colours',
];

async function main() {
  console.log('Cleaning up screenshot data...\n');

  // 1. Remove all guest users and their data
  const guests = await prisma.user.findMany({
    where: { isGuest: true },
    select: { id: true, username: true, firstName: true },
  });
  console.log(`Found ${guests.length} guest users`);

  if (guests.length > 0) {
    const guestIds = guests.map(g => g.id);

    await prisma.messageReaction.deleteMany({
      where: { message: { OR: [{ senderId: { in: guestIds } }, { recipientId: { in: guestIds } }] } },
    });
    await prisma.messageEditHistory.deleteMany({
      where: { message: { OR: [{ senderId: { in: guestIds } }, { recipientId: { in: guestIds } }] } },
    });
    const msgDel = await prisma.message.deleteMany({
      where: { OR: [{ senderId: { in: guestIds } }, { recipientId: { in: guestIds } }] },
    });
    console.log(`  Deleted ${msgDel.count} guest messages`);

    const convDel = await prisma.conversation.deleteMany({
      where: { OR: [{ participantA: { in: guestIds } }, { participantB: { in: guestIds } }] },
    });
    console.log(`  Deleted ${convDel.count} guest conversations`);

    const userDel = await prisma.user.deleteMany({ where: { id: { in: guestIds } } });
    console.log(`  Deleted ${userDel.count} guest users`);
  }

  // 2. Remove seeded DM messages by content
  let seededDel = 0;
  for (const pattern of SEEDED_DM_CONTENT) {
    // Delete reactions on matching messages first
    const matchingMsgs = await prisma.message.findMany({
      where: { content: { contains: pattern } },
      select: { id: true },
    });
    if (matchingMsgs.length > 0) {
      const msgIds = matchingMsgs.map(m => m.id);
      await prisma.messageReaction.deleteMany({ where: { messageId: { in: msgIds } } });
      await prisma.messageEditHistory.deleteMany({ where: { messageId: { in: msgIds } } });
    }
    const del = await prisma.message.deleteMany({
      where: { content: { contains: pattern } },
    });
    seededDel += del.count;
  }
  if (seededDel > 0) console.log(`Deleted ${seededDel} seeded DM messages`);

  // Remove orphaned conversations (where a participant user no longer exists)
  const allConvs = await prisma.conversation.findMany({
    select: { id: true, participantA: true, participantB: true },
  });
  const orphanIds: string[] = [];
  for (const c of allConvs) {
    const userA = await prisma.user.findUnique({ where: { id: c.participantA }, select: { id: true } });
    const userB = await prisma.user.findUnique({ where: { id: c.participantB }, select: { id: true } });
    if (!userA || !userB) orphanIds.push(c.id);
  }
  if (orphanIds.length > 0) {
    // Delete messages in orphaned conversations first
    for (const cid of orphanIds) {
      const conv = allConvs.find(c => c.id === cid)!;
      await prisma.message.deleteMany({
        where: { OR: [
          { senderId: conv.participantA, recipientId: conv.participantB },
          { senderId: conv.participantB, recipientId: conv.participantA },
        ]},
      });
    }
    const orphanDel = await prisma.conversation.deleteMany({ where: { id: { in: orphanIds } } });
    console.log(`Deleted ${orphanDel.count} orphaned conversations`);
  }

  // Remove seeded group messages by content
  let groupMsgDel = 0;
  for (const pattern of SEEDED_GROUP_MSG_CONTENT) {
    try {
      const del = await (prisma as any).groupMessage.deleteMany({
        where: { content: { contains: pattern } },
      });
      groupMsgDel += del.count;
    } catch {}
  }
  if (groupMsgDel > 0) console.log(`Deleted ${groupMsgDel} seeded group messages`);

  // 4. Remove ALL groups named "Project Alpha" or "Design Team"
  for (const name of ['Project Alpha', 'Design Team']) {
    try {
      const groups = await prisma.group.findMany({ where: { name }, select: { id: true } });
      for (const g of groups) {
        await (prisma as any).groupMessage.deleteMany({ where: { groupId: g.id } }).catch(() => {});
        await prisma.groupMember.deleteMany({ where: { groupId: g.id } });
      }
      const del = await prisma.group.deleteMany({ where: { name } });
      if (del.count > 0) console.log(`Deleted ${del.count} "${name}" group(s)`);
    } catch {}
  }

  // Summary
  const stats = {
    users: await prisma.user.count(),
    messages: await prisma.message.count(),
    groups: await prisma.group.count(),
    conversations: await prisma.conversation.count(),
  };
  console.log(`\nDatabase: ${stats.users} users, ${stats.messages} messages, ${stats.groups} groups, ${stats.conversations} conversations`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
