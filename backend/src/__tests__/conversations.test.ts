import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  invalidateConversationCache: jest.fn().mockResolvedValue(undefined),
  getSocketId: jest.fn().mockResolvedValue(null),
}));

jest.mock('../lib/conversation', () => ({
  acceptConversation: jest.fn(),
  declineConversation: jest.fn(),
  nukeConversation: jest.fn(),
  nukeByParticipants: jest.fn(),
}));

jest.mock('../routes/widget', () => ({
  deleteGuestUser: jest.fn().mockResolvedValue(undefined),
}));

import conversationsRouter from '../routes/conversations';
import { PrismaClient } from '@prisma/client';
import { acceptConversation, declineConversation, nukeConversation, nukeByParticipants } from '../lib/conversation';
import { invalidateConversationCache } from '../lib/redis';

const redisModule = require('../lib/redis');
const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use('/api/conversations', conversationsRouter);

describe('Conversation Routes', () => {
  let authToken: string;
  const testUserId = 'user-abc-123';

  beforeAll(() => {
    authToken = jwt.sign(
      { userId: testUserId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (redisModule.isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
    (redisModule.invalidateConversationCache as jest.Mock).mockResolvedValue(undefined);
    (redisModule.getSocketId as jest.Mock).mockResolvedValue(null);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/conversations/:id/accept', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/conversations/conv-1/accept');
      expect(response.status).toBe(401);
    });

    it('should accept a conversation successfully', async () => {
      (acceptConversation as jest.Mock).mockResolvedValue({
        id: 'conv-1',
        participantA: testUserId,
        participantB: 'user-other',
        initiatorId: 'user-other',
      });

      const response = await request(app)
        .post('/api/conversations/conv-1/accept')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('conversation');
      expect(response.body.conversation.id).toBe('conv-1');
      expect(acceptConversation).toHaveBeenCalledWith('conv-1', testUserId);
      expect(invalidateConversationCache).toHaveBeenCalledTimes(2);
    });

    it('should return 403 when not authorised', async () => {
      (acceptConversation as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/conversations/conv-1/accept')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('Not authorised');
    });

    it('should return 500 on internal error', async () => {
      (acceptConversation as jest.Mock).mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/conversations/conv-1/accept')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/conversations/:id/decline', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/conversations/conv-1/decline');
      expect(response.status).toBe(401);
    });

    it('should decline a conversation successfully', async () => {
      (declineConversation as jest.Mock).mockResolvedValue({
        id: 'conv-1',
        participantA: testUserId,
        participantB: 'user-other',
        initiatorId: 'user-other',
      });

      const response = await request(app)
        .post('/api/conversations/conv-1/decline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(declineConversation).toHaveBeenCalledWith('conv-1', testUserId);
      expect(invalidateConversationCache).toHaveBeenCalledTimes(2);
    });

    it('should return 403 when not authorised', async () => {
      (declineConversation as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/conversations/conv-1/decline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('Not authorised');
    });

    it('should return 500 on internal error', async () => {
      (declineConversation as jest.Mock).mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/conversations/conv-1/decline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/conversations/:id/nuke', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/conversations/conv-1/nuke');
      expect(response.status).toBe(401);
    });

    it('should nuke a conversation successfully', async () => {
      (nukeConversation as jest.Mock).mockResolvedValue({
        id: 'conv-1',
        participantA: testUserId,
        participantB: 'user-other',
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .post('/api/conversations/conv-1/nuke')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(nukeConversation).toHaveBeenCalledWith('conv-1', testUserId);
      expect(invalidateConversationCache).toHaveBeenCalledTimes(2);
    });

    it('should delete guest users after nuking', async () => {
      const { deleteGuestUser } = require('../routes/widget');

      (nukeConversation as jest.Mock).mockResolvedValue({
        id: 'conv-1',
        participantA: testUserId,
        participantB: 'guest-user',
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'guest-user' }]);

      await request(app)
        .post('/api/conversations/conv-1/nuke')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteGuestUser).toHaveBeenCalledWith('guest-user');
    });

    it('should return 403 when not authorised', async () => {
      (nukeConversation as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/conversations/conv-1/nuke')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('Not authorised');
    });
  });

  describe('POST /api/conversations/nuke-by-user/:recipientId', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/conversations/nuke-by-user/user-other');
      expect(response.status).toBe(401);
    });

    it('should nuke by user successfully', async () => {
      (nukeByParticipants as jest.Mock).mockResolvedValue({
        participantA: testUserId,
        participantB: 'user-other',
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .post('/api/conversations/nuke-by-user/user-other')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(nukeByParticipants).toHaveBeenCalledWith(testUserId, 'user-other');
    });

    it('should return 500 when nuke fails', async () => {
      (nukeByParticipants as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/conversations/nuke-by-user/user-other')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to nuke');
    });
  });
});
