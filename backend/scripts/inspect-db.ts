import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function go() {
  console.log('=== All Users ===');
  const users = await p.user.findMany({
    select: { id: true, username: true, firstName: true, lastName: true, displayName: true, isGuest: true },
    orderBy: { createdAt: 'asc' },
  });
  for (const u of users) {
    console.log(`  ${u.username?.padEnd(20)} fn="${u.firstName || ''}" ln="${u.lastName || ''}" dn="${u.displayName || ''}" guest=${u.isGuest} id=${u.id.slice(0, 8)}`);
  }

  console.log('\n=== Friendships ===');
  const friends = await p.friendship.findMany({
    include: {
      requester: { select: { username: true } },
      addressee: { select: { username: true } },
    },
  });
  for (const f of friends) {
    console.log(`  ${f.requester.username} -> ${f.addressee.username} [${f.status}] id=${f.id.slice(0, 8)}`);
  }

  console.log('\n=== Conversations (for Carl/user-a) ===');
  const convs = await p.conversation.findMany({
    include: {
      userA: { select: { id: true, username: true, firstName: true, isGuest: true } },
      userB: { select: { id: true, username: true, firstName: true, isGuest: true } },
    },
  });
  for (const c of convs) {
    const aName = c.userA ? `${c.userA.username}${c.userA.isGuest ? '[G]' : ''}` : `ORPHAN(${c.participantA.slice(0, 8)})`;
    const bName = c.userB ? `${c.userB.username}${c.userB.isGuest ? '[G]' : ''}` : `ORPHAN(${c.participantB.slice(0, 8)})`;
    const msgCount = await p.message.count({ where: { OR: [{ senderId: c.participantA, recipientId: c.participantB }, { senderId: c.participantB, recipientId: c.participantA }] } });
    console.log(`  ${aName.padEnd(20)} <-> ${bName.padEnd(20)} msgs=${msgCount} id=${c.id.slice(0, 8)}`);
  }

  console.log(`\nTotals: ${users.length} users, ${friends.length} friendships, ${convs.length} convs`);
  await p.$disconnect();
}
go();
