import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import {
  getOrCreateConversation,
  findConversation,
  acceptConversation,
  declineConversation,
  nukeConversation,
  nukeByParticipants,
  areFriends,
  getBlockBetween,
  getConnectedUserIds,
} from '../lib/conversation';

describe('Conversation Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation if one exists', async () => {
      const existing = { id: 'conv-1', participantA: 'aaa', participantB: 'bbb', status: 'accepted' };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(existing);

      const result = await getOrCreateConversation('bbb', 'aaa');
      expect(result).toEqual(existing);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should create accepted conversation when users are friends', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({ id: 'fs-1', status: 'accepted' });
      (prisma.conversation.create as jest.Mock).mockResolvedValue({
        id: 'conv-new', participantA: 'aaa', participantB: 'bbb', initiatorId: 'bbb', status: 'accepted',
      });

      const result = await getOrCreateConversation('bbb', 'aaa');
      expect(result.status).toBe('accepted');
      expect(prisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'accepted' }) })
      );
    });

    it('should create pending conversation when users are not friends', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.conversation.create as jest.Mock).mockResolvedValue({
        id: 'conv-new', participantA: 'aaa', participantB: 'bbb', initiatorId: 'bbb', status: 'pending',
      });

      const result = await getOrCreateConversation('bbb', 'aaa');
      expect(result.status).toBe('pending');
    });

    it('should sort participant IDs consistently', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.conversation.create as jest.Mock).mockResolvedValue({
        id: 'conv-new', participantA: 'aaa', participantB: 'zzz', initiatorId: 'zzz', status: 'pending',
      });

      await getOrCreateConversation('zzz', 'aaa');
      expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
        where: { participantA_participantB: { participantA: 'aaa', participantB: 'zzz' } },
      });
    });
  });

  describe('findConversation', () => {
    it('should return conversation if it exists', async () => {
      const convo = { id: 'conv-1', participantA: 'aaa', participantB: 'bbb' };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(convo);

      const result = await findConversation('bbb', 'aaa');
      expect(result).toEqual(convo);
    });

    it('should return null if no conversation exists', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await findConversation('aaa', 'bbb');
      expect(result).toBeNull();
    });
  });

  describe('acceptConversation', () => {
    it('should return null if conversation not found', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await acceptConversation('conv-x', 'user-1')).toBeNull();
    });

    it('should return existing conversation if already accepted', async () => {
      const convo = { id: 'conv-1', status: 'accepted', initiatorId: 'user-2', participantA: 'user-1', participantB: 'user-2' };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(convo);

      const result = await acceptConversation('conv-1', 'user-1');
      expect(result!.status).toBe('accepted');
      expect(prisma.conversation.update).not.toHaveBeenCalled();
    });

    it('should return null if user is the initiator (cannot accept own request)', async () => {
      const convo = { id: 'conv-1', status: 'pending', initiatorId: 'user-1', participantA: 'user-1', participantB: 'user-2' };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(convo);

      expect(await acceptConversation('conv-1', 'user-1')).toBeNull();
    });

    it('should return null if user is not a participant', async () => {
      const convo = { id: 'conv-1', status: 'pending', initiatorId: 'user-2', participantA: 'user-2', participantB: 'user-3' };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(convo);

      expect(await acceptConversation('conv-1', 'user-outsider')).toBeNull();
    });

    it('should accept and return updated conversation', async () => {
      const convo = { id: 'conv-1', status: 'pending', initiatorId: 'user-2', participantA: 'user-1', participantB: 'user-2' };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(convo);
      (prisma.conversation.update as jest.Mock).mockResolvedValue({ ...convo, status: 'accepted' });

      const result = await acceptConversation('conv-1', 'user-1');
      expect(result!.status).toBe('accepted');
    });
  });

  describe('declineConversation', () => {
    it('should return null if conversation not found', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await declineConversation('conv-x', 'user-1')).toBeNull();
    });

    it('should return null if user is the initiator', async () => {
      const convo = { id: 'conv-1', initiatorId: 'user-1', participantA: 'user-1', participantB: 'user-2' };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(convo);
      expect(await declineConversation('conv-1', 'user-1')).toBeNull();
    });

    it('should return null if user is not a participant', async () => {
      const convo = { id: 'conv-1', initiatorId: 'user-2', participantA: 'user-2', participantB: 'user-3' };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(convo);
      expect(await declineConversation('conv-1', 'user-outsider')).toBeNull();
    });

    it('should delete messages and conversation, return participant info', async () => {
      const convo = { id: 'conv-1', initiatorId: 'user-2', participantA: 'user-1', participantB: 'user-2' };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(convo);
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
      (prisma.conversation.delete as jest.Mock).mockResolvedValue(convo);

      const result = await declineConversation('conv-1', 'user-1');
      expect(result).toEqual({ participantA: 'user-1', participantB: 'user-2', initiatorId: 'user-2' });
      expect(prisma.message.deleteMany).toHaveBeenCalled();
      expect(prisma.conversation.delete).toHaveBeenCalledWith({ where: { id: 'conv-1' } });
    });
  });

  describe('nukeConversation', () => {
    it('should return null if conversation not found', async () => {
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await nukeConversation('conv-x', 'user-1')).toBeNull();
    });

    it('should return null if user is not a participant', async () => {
      const convo = { id: 'conv-1', participantA: 'user-2', participantB: 'user-3' };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(convo);
      expect(await nukeConversation('conv-1', 'user-outsider')).toBeNull();
    });

    it('should delete messages and conversation', async () => {
      const convo = { id: 'conv-1', participantA: 'user-1', participantB: 'user-2' };
      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(convo);
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });
      (prisma.conversation.delete as jest.Mock).mockResolvedValue(convo);

      const result = await nukeConversation('conv-1', 'user-1');
      expect(result).toEqual({ participantA: 'user-1', participantB: 'user-2' });
    });
  });

  describe('nukeByParticipants', () => {
    it('should delete messages and conversations between two users', async () => {
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
      (prisma.conversation.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await nukeByParticipants('zzz', 'aaa');
      expect(result).toEqual({ participantA: 'aaa', participantB: 'zzz' });
      expect(prisma.message.deleteMany).toHaveBeenCalled();
      expect(prisma.conversation.deleteMany).toHaveBeenCalled();
    });
  });

  describe('areFriends', () => {
    it('should return true when friendship exists', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({ id: 'fs-1', status: 'accepted' });
      expect(await areFriends('user-1', 'user-2')).toBe(true);
    });

    it('should return false when no friendship', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue(null);
      expect(await areFriends('user-1', 'user-2')).toBe(false);
    });
  });

  describe('getBlockBetween', () => {
    it('should return blocked:false when no block exists', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue(null);
      expect(await getBlockBetween('user-1', 'user-2')).toEqual({ blocked: false });
    });

    it('should return blocked:true with blockerId', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({ requesterId: 'user-1' });
      expect(await getBlockBetween('user-1', 'user-2')).toEqual({ blocked: true, blockerId: 'user-1' });
    });
  });

  describe('getConnectedUserIds', () => {
    it('should aggregate friends, accepted convos, and pending convos', async () => {
      (prisma.friendship.findMany as jest.Mock)
        .mockResolvedValueOnce([{ requesterId: 'me', addresseeId: 'friend-1' }])
        .mockResolvedValueOnce([]);
      (prisma.conversation.findMany as jest.Mock)
        .mockResolvedValueOnce([{ participantA: 'convo-user', participantB: 'me' }])
        .mockResolvedValueOnce([{ participantA: 'me', participantB: 'pending-user', initiatorId: 'me' }]);

      const result = await getConnectedUserIds('me');
      expect(result.all.has('friend-1')).toBe(true);
      expect(result.all.has('convo-user')).toBe(true);
      expect(result.all.has('pending-user')).toBe(true);
      expect(result.pendingInitiatedByMe.has('pending-user')).toBe(true);
      expect(result.pendingInitiatedByMe.has('friend-1')).toBe(false);
    });

    it('should exclude blocked users', async () => {
      (prisma.friendship.findMany as jest.Mock)
        .mockResolvedValueOnce([{ requesterId: 'me', addresseeId: 'friend-1' }])
        .mockResolvedValueOnce([{ requesterId: 'me', addresseeId: 'friend-1' }]);
      (prisma.conversation.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getConnectedUserIds('me');
      expect(result.all.has('friend-1')).toBe(false);
    });
  });
});
