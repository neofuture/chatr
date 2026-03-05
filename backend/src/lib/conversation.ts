import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function sortIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export interface ConversationResult {
  id: string;
  participantA: string;
  participantB: string;
  initiatorId: string;
  status: 'pending' | 'accepted';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Look up or create a Conversation between two users.
 * - If the users are friends (accepted friendship), conversation is auto-accepted.
 * - Otherwise it starts as 'pending' (message request).
 */
export async function getOrCreateConversation(
  senderId: string,
  recipientId: string
): Promise<ConversationResult> {
  const [pA, pB] = sortIds(senderId, recipientId);

  // Check for existing conversation
  const existing = await prisma.conversation.findUnique({
    where: { participantA_participantB: { participantA: pA, participantB: pB } },
  });
  if (existing) return existing as ConversationResult;

  // Check friendship to decide initial status
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { requesterId: senderId, addresseeId: recipientId },
        { requesterId: recipientId, addresseeId: senderId },
      ],
    },
  });

  const status = friendship ? 'accepted' : 'pending';

  const created = await prisma.conversation.create({
    data: {
      participantA: pA,
      participantB: pB,
      initiatorId: senderId,
      status,
    },
  });

  return created as ConversationResult;
}

/**
 * Look up a conversation between two users (without creating).
 */
export async function findConversation(
  userA: string,
  userB: string
): Promise<ConversationResult | null> {
  const [pA, pB] = sortIds(userA, userB);
  const row = await prisma.conversation.findUnique({
    where: { participantA_participantB: { participantA: pA, participantB: pB } },
  });
  return (row as ConversationResult) ?? null;
}

/**
 * Accept a message request. Only the non-initiator can accept.
 * Returns the updated conversation, or null if not authorised / not found.
 */
export async function acceptConversation(
  conversationId: string,
  userId: string
): Promise<ConversationResult | null> {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!convo) return null;
  if (convo.status === 'accepted') return convo as ConversationResult;

  // Only the non-initiator (the recipient of the request) can accept
  if (convo.initiatorId === userId) return null;

  // Verify user is actually a participant
  if (convo.participantA !== userId && convo.participantB !== userId) return null;

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'accepted' },
  });
  return updated as ConversationResult;
}

/**
 * Decline / delete a message request. Only the non-initiator can decline.
 * Also deletes all messages between the two participants.
 * Returns the deleted conversation info, or null if not authorised / not found.
 */
export async function declineConversation(
  conversationId: string,
  userId: string
): Promise<{ participantA: string; participantB: string; initiatorId: string } | null> {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!convo) return null;
  if (convo.initiatorId === userId) return null;
  if (convo.participantA !== userId && convo.participantB !== userId) return null;

  // Delete all messages between the two participants
  await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: convo.participantA, recipientId: convo.participantB },
        { senderId: convo.participantB, recipientId: convo.participantA },
      ],
    },
  });

  await prisma.conversation.delete({ where: { id: conversationId } });
  return { participantA: convo.participantA, participantB: convo.participantB, initiatorId: convo.initiatorId };
}

/**
 * Nuke a conversation — delete conversation + all messages between two users.
 * Either participant can nuke. Used for testing / full reset.
 */
export async function nukeConversation(
  conversationId: string,
  userId: string
): Promise<{ participantA: string; participantB: string } | null> {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!convo) return null;
  if (convo.participantA !== userId && convo.participantB !== userId) return null;

  await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: convo.participantA, recipientId: convo.participantB },
        { senderId: convo.participantB, recipientId: convo.participantA },
      ],
    },
  });

  await prisma.conversation.delete({ where: { id: conversationId } });
  return { participantA: convo.participantA, participantB: convo.participantB };
}

/**
 * Nuke all data between two users by their IDs — conversation record + all messages.
 * Works even if no Conversation record exists (just deletes messages).
 */
export async function nukeByParticipants(
  userId: string,
  otherId: string
): Promise<{ participantA: string; participantB: string } | null> {
  const [pA, pB] = sortIds(userId, otherId);

  await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: pA, recipientId: pB },
        { senderId: pB, recipientId: pA },
      ],
    },
  });

  await prisma.conversation.deleteMany({
    where: { participantA: pA, participantB: pB },
  });

  return { participantA: pA, participantB: pB };
}

/**
 * Check if two users are friends (accepted friendship).
 */
export async function areFriends(userA: string, userB: string): Promise<boolean> {
  const row = await prisma.friendship.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });
  return !!row;
}

/**
 * Check if either user has blocked the other.
 * Returns the ID of the blocker if a block exists, or null if not blocked.
 */
export async function getBlockBetween(
  userA: string,
  userB: string
): Promise<{ blocked: true; blockerId: string } | { blocked: false }> {
  const row = await prisma.friendship.findFirst({
    where: {
      status: 'blocked',
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
    select: { requesterId: true },
  });
  if (row) return { blocked: true, blockerId: row.requesterId };
  return { blocked: false };
}

/**
 * Get all user IDs that are "connected" to a given user —
 * either through an accepted friendship, an accepted conversation,
 * or a pending conversation (both directions — broadcasts need to
 * reach the recipient, and the recipient needs to see the sender).
 *
 * Use the returned `pendingInitiatedByMe` set to suppress presence
 * for users the caller sent a request to (they shouldn't see those
 * recipients' status until accepted).
 */
export async function getConnectedUserIds(userId: string): Promise<{
  all: Set<string>;
  pendingInitiatedByMe: Set<string>;
}> {
  const [friendships, acceptedConvos, pendingConvos, blockedRows] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    }),
    prisma.conversation.findMany({
      where: {
        status: 'accepted',
        OR: [{ participantA: userId }, { participantB: userId }],
      },
      select: { participantA: true, participantB: true },
    }),
    prisma.conversation.findMany({
      where: {
        status: 'pending',
        OR: [{ participantA: userId }, { participantB: userId }],
      },
      select: { participantA: true, participantB: true, initiatorId: true },
    }),
    prisma.friendship.findMany({
      where: {
        status: 'blocked',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    }),
  ]);

  const blockedIds = new Set<string>();
  for (const b of blockedRows) {
    blockedIds.add(b.requesterId === userId ? b.addresseeId : b.requesterId);
  }

  const all = new Set<string>();
  const pendingInitiatedByMe = new Set<string>();

  for (const f of friendships) {
    const otherId = f.requesterId === userId ? f.addresseeId : f.requesterId;
    if (!blockedIds.has(otherId)) all.add(otherId);
  }
  for (const c of acceptedConvos) {
    const otherId = c.participantA === userId ? c.participantB : c.participantA;
    if (!blockedIds.has(otherId)) all.add(otherId);
  }
  for (const p of pendingConvos) {
    const otherId = p.participantA === userId ? p.participantB : p.participantA;
    if (!blockedIds.has(otherId)) {
      all.add(otherId);
      if (p.initiatorId === userId) {
        pendingInitiatedByMe.add(otherId);
      }
    }
  }

  return { all, pendingInitiatedByMe };
}
