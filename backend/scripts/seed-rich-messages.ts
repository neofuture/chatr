import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedRichMessages() {
  const userA = await prisma.user.findFirst({ where: { username: { contains: 'carlfearby' } } });
  const userB = await prisma.user.findFirst({ where: { username: { contains: 'simonjames' } } });

  if (!userA || !userB) {
    console.log('ERROR: Could not find carlfearby and simonjames');
    return { codeBlockId: '', replyTargetId: '' };
  }

  // 1. Code block from Simon to Carl
  const codeBlock = await prisma.message.create({
    data: {
      senderId: userB.id,
      recipientId: userA.id,
      content: 'Here is the API endpoint:\n\n```typescript\napp.post(\'/api/messages\', async (req, res) => {\n  const { recipientId, content } = req.body;\n  const message = await prisma.message.create({\n    data: { senderId: req.user.id, recipientId, content },\n  });\n  io.to(recipientId).emit(\'message:new\', message);\n  res.json(message);\n});\n```',
      type: 'text',
      status: 'delivered',
    },
  });
  console.log(`  Created code block message: ${codeBlock.id.slice(0, 8)}`);

  // 2. Carl replies to the code block
  const reply = await prisma.message.create({
    data: {
      senderId: userA.id,
      recipientId: userB.id,
      content: 'Looks clean! Should we add rate limiting to this endpoint?',
      type: 'text',
      status: 'delivered',
    },
  });
  console.log(`  Created reply message: ${reply.id.slice(0, 8)}`);

  // 3. Add reactions to the code block
  await prisma.messageReaction.createMany({
    data: [
      { messageId: codeBlock.id, userId: userA.id, emoji: '🔥' },
      { messageId: codeBlock.id, userId: userB.id, emoji: '👍' },
    ],
  });
  console.log('  Added reactions to code block');

  // 4. Simon sends a quoted reply to Carl's message
  await prisma.message.create({
    data: {
      senderId: userB.id,
      recipientId: userA.id,
      content: 'Absolutely, lets add a sliding window rate limiter — 10 requests per second per user should be safe.',
      type: 'text',
      status: 'delivered',
      replyToId: reply.id,
      replyToContent: reply.content,
      replyToSenderName: userA.displayName || userA.firstName || 'Carl Fearby',
      replyToType: 'text',
    },
  });
  console.log('  Created quoted reply');

  // 5. Carl sends + edits a message
  const toEdit = await prisma.message.create({
    data: {
      senderId: userA.id,
      recipientId: userB.id,
      content: 'Deployed to staging — security audit panel and commit intelligence are live.',
      type: 'text',
      status: 'delivered',
      editedAt: new Date(),
    },
  });
  await prisma.messageEditHistory.create({
    data: {
      message: { connect: { id: toEdit.id } },
      editedBy: { connect: { id: userA.id } },
      previousContent: 'Deploying to staging now',
    },
  });
  console.log('  Created edited message');

  // 6. Simon sends final message (unread for Carl)
  await prisma.message.create({
    data: {
      senderId: userB.id,
      recipientId: userA.id,
      content: 'All good here, merging the PR now 🚀',
      type: 'text',
      status: 'sent',
    },
  });
  console.log('  Created unread message for badge');

  await prisma.$disconnect();
  return { codeBlockId: codeBlock.id, replyTargetId: reply.id };
}

if (require.main === module) {
  seedRichMessages().then(() => process.exit(0));
}
