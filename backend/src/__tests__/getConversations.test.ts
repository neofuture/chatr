import { PrismaClient } from '@prisma/client';

jest.mock('../lib/redis', () => ({
  getCachedConversations: jest.fn(),
  setCachedConversations: jest.fn(),
}));

jest.mock('../services/summaryEngine', () => ({
  maybeRegenerateDMSummary: jest.fn(),
}));

const redisModule = require('../lib/redis');
const summaryModule = require('../services/summaryEngine');

import { getConversations } from '../lib/getConversations';

const prisma = new PrismaClient();

describe('getConversations', () => {
  const currentUserId = 'user-current-123';
  const partnerId = 'user-partner-456';

  const partnerUser = {
    id: partnerId,
    username: '@partner',
    displayName: 'Partner',
    firstName: 'Part',
    lastName: 'Ner',
    profileImage: null,
    lastSeen: new Date(),
    isBot: false,
    isGuest: false,
  };

  const conversation = {
    id: 'conv-1',
    participantA: currentUserId,
    participantB: partnerId,
    initiatorId: currentUserId,
    status: 'accepted',
    summary: 'A great conversation',
    summaryMessageCount: 10,
    summaryGeneratedAt: new Date(),
  };

  const lastMessage = {
    id: 'msg-1',
    content: 'Hello!',
    type: 'text',
    createdAt: new Date('2025-06-01T12:00:00Z'),
    senderId: partnerId,
    isRead: false,
    fileType: null,
    partner_id: partnerId,
  };

  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AI_BOT_USER_ID;

    (redisModule.getCachedConversations as jest.Mock).mockResolvedValue(null);
    (redisModule.setCachedConversations as jest.Mock).mockResolvedValue(undefined);

    // groupBy is not in the shared mock, so attach it
    if (!(prisma.message as any).groupBy) {
      (prisma.message as any).groupBy = jest.fn();
    }
    ((prisma.message as any).groupBy as jest.Mock).mockResolvedValue([]);
  });

  afterAll(async () => {
    process.env = originalEnv;
    await prisma.$disconnect();
  });

  function setupPrismaForPartners(
    overrides: {
      partners?: { partner_id: string }[];
      users?: typeof partnerUser[];
      conversations?: typeof conversation[];
      friendships?: any[];
      blocks?: any[];
      lastMessages?: typeof lastMessage[];
      unreadCounts?: any[];
    } = {},
  ) {
    const {
      partners = [{ partner_id: partnerId }],
      users = [partnerUser],
      conversations: convos = [],
      friendships = [],
      blocks = [],
      lastMessages = [],
      unreadCounts = [],
    } = overrides;

    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce(partners)
      .mockResolvedValueOnce(lastMessages);
    (prisma.user.findMany as jest.Mock).mockResolvedValueOnce(users);
    (prisma.conversation.findMany as jest.Mock).mockResolvedValueOnce(convos);
    (prisma.friendship.findMany as jest.Mock)
      .mockResolvedValueOnce(friendships)
      .mockResolvedValueOnce(blocks);
    ((prisma.message as any).groupBy as jest.Mock).mockResolvedValueOnce(unreadCounts);
  }

  it('should return cached data from Redis when available', async () => {
    const cachedResult = { conversations: [{ id: partnerId, username: '@partner' }] };
    (redisModule.getCachedConversations as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(cachedResult),
    );

    const result = await getConversations(currentUserId);

    expect(result).toEqual(cachedResult);
    expect(redisModule.getCachedConversations).toHaveBeenCalledWith(currentUserId);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('should query Prisma when cache miss', async () => {
    setupPrismaForPartners({
      lastMessages: [lastMessage],
      unreadCounts: [{ senderId: partnerId, _count: 3 }],
    });

    const result = await getConversations(currentUserId);

    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].id).toBe(partnerId);
    expect(result.conversations[0].lastMessage).toBeTruthy();
    expect(result.conversations[0].unreadCount).toBe(3);
  });

  it('should include conversation metadata fields', async () => {
    setupPrismaForPartners({
      conversations: [conversation],
      friendships: [
        { id: 'fr-1', requesterId: currentUserId, addresseeId: partnerId, status: 'accepted' },
      ],
      lastMessages: [lastMessage],
    });

    const result = await getConversations(currentUserId);

    const conv = result.conversations[0];
    expect(conv.conversationId).toBe('conv-1');
    expect(conv.conversationStatus).toBe('accepted');
    expect(conv.isInitiator).toBe(true);
    expect(conv.isFriend).toBe(true);
    expect(conv.friendshipId).toBe('fr-1');
    expect(conv.isBlocked).toBe(false);
    expect(conv.blockedByMe).toBe(false);
    expect(conv.summary).toBe('A great conversation');
  });

  it('should handle empty results when no conversation partners', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

    const result = await getConversations(currentUserId);

    expect(result).toEqual({ conversations: [] });
    expect(redisModule.setCachedConversations).toHaveBeenCalledWith(
      currentUserId,
      JSON.stringify({ conversations: [] }),
    );
  });

  it('should set cache after querying Prisma', async () => {
    setupPrismaForPartners();

    await getConversations(currentUserId);

    expect(redisModule.setCachedConversations).toHaveBeenCalledWith(
      currentUserId,
      expect.any(String),
    );
    const cachedPayload = JSON.parse(
      (redisModule.setCachedConversations as jest.Mock).mock.calls[0][1],
    );
    expect(cachedPayload.conversations).toHaveLength(1);
  });

  it('should trigger summary regeneration when conversation exists', async () => {
    setupPrismaForPartners({ conversations: [conversation] });

    await getConversations(currentUserId);

    expect(summaryModule.maybeRegenerateDMSummary).toHaveBeenCalledWith(
      conversation.id,
      currentUserId,
      partnerId,
      conversation.summaryMessageCount,
      conversation.summaryGeneratedAt,
    );
  });

  it('should handle blocked users correctly', async () => {
    setupPrismaForPartners({
      blocks: [{ requesterId: currentUserId, addresseeId: partnerId, status: 'blocked' }],
    });

    const result = await getConversations(currentUserId);

    expect(result.conversations[0].isBlocked).toBe(true);
    expect(result.conversations[0].blockedByMe).toBe(true);
  });

  it('should handle Redis cache read errors gracefully', async () => {
    (redisModule.getCachedConversations as jest.Mock).mockRejectedValueOnce(
      new Error('Redis down'),
    );
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([]);

    const result = await getConversations(currentUserId);

    expect(result).toEqual({ conversations: [] });
  });

  it('should format lastMessage fields correctly', async () => {
    setupPrismaForPartners({ lastMessages: [lastMessage] });

    const result = await getConversations(currentUserId);

    const lm = result.conversations[0].lastMessage;
    expect(lm).toEqual({
      id: 'msg-1',
      content: 'Hello!',
      type: 'text',
      createdAt: lastMessage.createdAt,
      senderId: partnerId,
      isRead: false,
      fileType: null,
    });
    expect(result.conversations[0].lastMessageAt).toEqual(lastMessage.createdAt);
  });

  it('should set null lastMessage and lastMessageAt when no messages', async () => {
    setupPrismaForPartners();

    const result = await getConversations(currentUserId);

    expect(result.conversations[0].lastMessage).toBeNull();
    expect(result.conversations[0].lastMessageAt).toBeNull();
  });

  it('should handle being blocked by another user (blockedMeIds path)', async () => {
    setupPrismaForPartners({
      blocks: [{ requesterId: partnerId, addresseeId: currentUserId, status: 'blocked' }],
    });

    const result = await getConversations(currentUserId);

    expect(result.conversations[0].isBlocked).toBe(true);
    expect(result.conversations[0].blockedByMe).toBe(false);
  });

  describe('AI bot injection', () => {
    const botId = 'bot-ai-001';
    const botUser = {
      id: botId,
      username: '@ai-bot',
      displayName: 'AI Assistant',
      firstName: 'AI',
      lastName: 'Bot',
      profileImage: '/images/default.jpg',
      lastSeen: new Date(),
      isBot: true,
      isGuest: false,
    };

    beforeEach(() => {
      process.env.AI_BOT_USER_ID = botId;
    });

    it('should inject bot at top for male user with female bot image', async () => {
      setupPrismaForPartners();
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ gender: 'male' })
        .mockResolvedValueOnce(botUser);

      const result = await getConversations(currentUserId);

      expect(result.conversations).toHaveLength(2);
      expect(result.conversations[0].id).toBe(botId);
      expect(result.conversations[0].profileImage).toBe('/images/ai/female-sm.jpg');
    });

    it('should inject bot with male image for female user', async () => {
      setupPrismaForPartners();
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ gender: 'female' })
        .mockResolvedValueOnce(botUser);

      const result = await getConversations(currentUserId);

      expect(result.conversations[0].profileImage).toBe('/images/ai/male-sm.jpg');
    });

    it('should inject bot with "them" image for null gender', async () => {
      setupPrismaForPartners();
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ gender: null })
        .mockResolvedValueOnce(botUser);

      const result = await getConversations(currentUserId);

      expect(result.conversations[0].profileImage).toBe('/images/ai/them-sm.jpg');
    });

    it('should not inject bot when bot user not found in DB', async () => {
      setupPrismaForPartners();
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ gender: 'male' })
        .mockResolvedValueOnce(null);

      const result = await getConversations(currentUserId);

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].id).toBe(partnerId);
    });

    it('should move existing bot to top with custom image when already in list', async () => {
      setupPrismaForPartners({
        partners: [{ partner_id: partnerId }, { partner_id: botId }],
        users: [partnerUser, botUser as any],
      });
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ gender: 'male' });

      const result = await getConversations(currentUserId);

      expect(result.conversations[0].id).toBe(botId);
      expect(result.conversations[0].profileImage).toBe('/images/ai/female-sm.jpg');
      expect(result.conversations.filter((c: any) => c.id === botId)).toHaveLength(1);
    });
  });
});
