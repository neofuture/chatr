import { PrismaClient } from '@prisma/client';
import { getCachedConversations, setCachedConversations } from './redis';
import { maybeRegenerateDMSummary } from '../services/summaryEngine';

const prisma = new PrismaClient();

export async function getConversations(currentUserId: string) {
  // Try Redis cache first
  try {
    const cached = await getCachedConversations(currentUserId);
    if (cached) return JSON.parse(cached);
  } catch {}

  const partners: { partner_id: string }[] = await prisma.$queryRaw`
    SELECT DISTINCT
      CASE WHEN "senderId" = ${currentUserId} THEN "recipientId" ELSE "senderId" END AS partner_id
    FROM "Message"
    WHERE ("senderId" = ${currentUserId} OR "recipientId" = ${currentUserId})
      AND "deletedAt" IS NULL
  `;
  const conversationPartnerIds = partners.map(p => p.partner_id);

  if (conversationPartnerIds.length === 0) {
    const result = { conversations: [] };
    setCachedConversations(currentUserId, JSON.stringify(result)).catch(() => {});
    return result;
  }

  const [users, convos, friendships, blocks, lastMessages, unreadCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: conversationPartnerIds } },
      select: {
        id: true, username: true, displayName: true,
        firstName: true, lastName: true,
        profileImage: true, lastSeen: true, isBot: true, isGuest: true,
      },
    }),
    prisma.conversation.findMany({
      where: {
        OR: [
          { participantA: currentUserId },
          { participantB: currentUserId },
        ],
      },
    }),
    prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: currentUserId, addresseeId: { in: conversationPartnerIds } },
          { addresseeId: currentUserId, requesterId: { in: conversationPartnerIds } },
        ],
      },
    }),
    prisma.friendship.findMany({
      where: {
        status: 'blocked',
        OR: [
          { requesterId: currentUserId, addresseeId: { in: conversationPartnerIds } },
          { addresseeId: currentUserId, requesterId: { in: conversationPartnerIds } },
        ],
      },
      select: { requesterId: true, addresseeId: true },
    }),
    prisma.$queryRaw<any[]>`
      SELECT DISTINCT ON (partner_id) *
      FROM (
        SELECT
          m.id, m.content, m.type, m."createdAt", m."senderId", m."isRead", m."fileType",
          CASE WHEN m."senderId" = ${currentUserId} THEN m."recipientId" ELSE m."senderId" END AS partner_id
        FROM "Message" m
        WHERE m."deletedAt" IS NULL
          AND (m."senderId" = ${currentUserId} OR m."recipientId" = ${currentUserId})
          AND (
            (m."senderId" = ${currentUserId} AND m."recipientId" = ANY(${conversationPartnerIds}))
            OR (m."recipientId" = ${currentUserId} AND m."senderId" = ANY(${conversationPartnerIds}))
          )
      ) sub
      ORDER BY partner_id, "createdAt" DESC
    `,
    prisma.message.groupBy({
      by: ['senderId'],
      where: {
        recipientId: currentUserId,
        isRead: false,
        deletedAt: null,
        senderId: { in: conversationPartnerIds },
      },
      _count: true,
    }),
  ]);

  const convoMap = new Map(convos.map(c => {
    const otherId = c.participantA === currentUserId ? c.participantB : c.participantA;
    return [otherId, c];
  }));

  const friendIds = new Set(friendships.map(f =>
    f.requesterId === currentUserId ? f.addresseeId : f.requesterId
  ));
  const friendshipIdMap = new Map<string, string>();
  for (const f of friendships) {
    const otherId = f.requesterId === currentUserId ? f.addresseeId : f.requesterId;
    friendshipIdMap.set(otherId, f.id);
  }

  const blockedByMeIds = new Set<string>();
  const blockedMeIds = new Set<string>();
  for (const b of blocks) {
    if (b.requesterId === currentUserId) blockedByMeIds.add(b.addresseeId);
    else blockedMeIds.add(b.requesterId);
  }

  const lastMessageMap = new Map(lastMessages.map(m => [m.partner_id, m]));
  const unreadMap = new Map(unreadCounts.map(u => [u.senderId, u._count]));

  const withMessages = users.map((user) => {
    const lastMessage = lastMessageMap.get(user.id) ?? null;
    const unreadCount = unreadMap.get(user.id) ?? 0;
    const convo = convoMap.get(user.id);

    if (convo) {
      maybeRegenerateDMSummary(convo.id, currentUserId, user.id, convo.summaryMessageCount, convo.summaryGeneratedAt);
    }

    return {
      ...user,
      lastMessage: lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.content,
        type: lastMessage.type,
        createdAt: lastMessage.createdAt,
        senderId: lastMessage.senderId,
        isRead: lastMessage.isRead,
        fileType: lastMessage.fileType,
      } : null,
      unreadCount,
      lastMessageAt: lastMessage?.createdAt ?? null,
      conversationId: convo?.id ?? null,
      conversationStatus: (convo?.status as 'pending' | 'accepted') ?? null,
      isInitiator: convo ? convo.initiatorId === currentUserId : false,
      isFriend: friendIds.has(user.id),
      friendshipId: friendshipIdMap.get(user.id) ?? null,
      isBlocked: blockedByMeIds.has(user.id) || blockedMeIds.has(user.id),
      blockedByMe: blockedByMeIds.has(user.id),
      summary: convo?.summary ?? null,
    };
  });

  // Inject AI bot at top
  const AI_BOT_ID = process.env.AI_BOT_USER_ID;
  let conversations = withMessages;
  if (AI_BOT_ID) {
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { gender: true },
    });
    const gender = currentUser?.gender ?? null;
    const botImagePath =
      gender === 'male'   ? '/images/ai/female-sm.jpg' :
      gender === 'female' ? '/images/ai/male-sm.jpg'   :
                            '/images/ai/them-sm.jpg';

    const botAlreadyPresent = withMessages.some(c => c.id === AI_BOT_ID);
    if (!botAlreadyPresent) {
      const botUser = await prisma.user.findUnique({
        where: { id: AI_BOT_ID },
        select: {
          id: true, username: true, displayName: true,
          firstName: true, lastName: true,
          profileImage: true, lastSeen: true, isBot: true, isGuest: true,
        },
      });
      if (botUser) {
        const botEntry = {
          ...botUser,
          profileImage: botImagePath,
          lastMessage: null,
          unreadCount: 0,
          lastMessageAt: null,
          conversationId: null,
          conversationStatus: 'accepted' as 'accepted' | 'pending',
          isInitiator: false,
          isFriend: false,
          friendshipId: null,
          isBlocked: false,
          blockedByMe: false,
          summary: null,
        };
        conversations = [botEntry as unknown as typeof withMessages[0], ...withMessages];
      }
    } else {
      const botEntry = { ...withMessages.find(c => c.id === AI_BOT_ID)!, profileImage: botImagePath };
      conversations = [botEntry, ...withMessages.filter(c => c.id !== AI_BOT_ID)];
    }
  }

  const result = { conversations };
  setCachedConversations(currentUserId, JSON.stringify(result)).catch(() => {});
  return result;
}
