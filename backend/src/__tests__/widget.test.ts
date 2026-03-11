import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  invalidateConversationCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

const redisModule = require('../lib/redis');

import widgetRouter from '../routes/widget';

const app = express();
app.use(express.json());
app.use('/api/widget', widgetRouter);

const prisma = new PrismaClient();

describe('Widget Routes', () => {
  const supportAgentId = 'agent-support-001';

  beforeEach(() => {
    jest.clearAllMocks();
    (redisModule.isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── GET /api/widget/support-agent ───────────────────────────────────────────

  describe('GET /api/widget/support-agent', () => {
    it('should return support agent info', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: supportAgentId,
        displayName: 'Support Agent',
        username: '@support',
        profileImage: 'https://example.com/img.png',
      });

      const response = await request(app)
        .get('/api/widget/support-agent')
        .expect(200);

      expect(response.body.id).toBe(supportAgentId);
      expect(response.body.displayName).toBe('Support Agent');
      expect(response.body.username).toBe('@support');
    });

    it('should return 404 when no support agent configured', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/widget/support-agent')
        .expect(404);

      expect(response.body.error).toContain('No support agent');
    });

    it('should use username as displayName fallback', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: supportAgentId,
        displayName: null,
        username: '@support',
        profileImage: null,
      });

      const response = await request(app)
        .get('/api/widget/support-agent')
        .expect(200);

      expect(response.body.displayName).toBe('@support');
    });

    it('should handle internal errors', async () => {
      (prisma.user.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/widget/support-agent')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  // ── POST /api/widget/guest-session ──────────────────────────────────────────

  describe('POST /api/widget/guest-session', () => {
    it('should return 400 when guestName is missing', async () => {
      const response = await request(app)
        .post('/api/widget/guest-session')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('guestName is required');
    });

    it('should return 400 when guestName is blank', async () => {
      const response = await request(app)
        .post('/api/widget/guest-session')
        .send({ guestName: '   ' })
        .expect(400);

      expect(response.body.error).toContain('guestName is required');
    });

    it('should return 503 when no support agent available', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/widget/guest-session')
        .send({ guestName: 'Visitor' })
        .expect(503);

      expect(response.body.error).toContain('unavailable');
    });

    it('should create a new guest session', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'guest-new-123',
        username: 'widget_123_abc',
        displayName: 'Visitor',
      });

      const response = await request(app)
        .post('/api/widget/guest-session')
        .send({ guestName: 'Visitor' })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('guestId');
      expect(response.body.guestName).toBe('Visitor');
      expect(response.body.supportAgentId).toBe(supportAgentId);
    });

    it('should resume an existing guest session', async () => {
      const existingGuestId = 'guest-existing-456';
      (prisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: supportAgentId })
        .mockResolvedValueOnce({ id: existingGuestId, username: 'widget_old', displayName: 'Old Name' });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: existingGuestId,
        username: 'widget_old',
        displayName: 'Updated Name',
      });

      const response = await request(app)
        .post('/api/widget/guest-session')
        .send({ guestName: 'Updated Name', guestId: existingGuestId })
        .expect(200);

      expect(response.body.guestId).toBe(existingGuestId);
      expect(response.body.guestName).toBe('Updated Name');
    });

    it('should handle internal errors', async () => {
      (prisma.user.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/widget/guest-session')
        .send({ guestName: 'Visitor' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  // ── GET /api/widget/history ─────────────────────────────────────────────────

  describe('GET /api/widget/history', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/widget/history');
      expect(response.status).toBe(401);
    });

    it('should return 403 if not a guest user', async () => {
      const guestId = 'not-a-guest';
      const token = jwt.sign({ userId: guestId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: false });

      const response = await request(app)
        .get('/api/widget/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toContain('Not a guest');
    });

    it('should return message history for a guest', async () => {
      const guestId = 'guest-hist-123';
      const token = jwt.sign({ userId: guestId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });
      (prisma.message.findMany as jest.Mock).mockResolvedValue([
        { id: 'msg-1', senderId: guestId, recipientId: supportAgentId, content: 'Hello', type: 'text', createdAt: new Date() },
        { id: 'msg-2', senderId: supportAgentId, recipientId: guestId, content: 'Hi!', type: 'text', createdAt: new Date() },
      ]);

      const response = await request(app)
        .get('/api/widget/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(2);
    });

    it('should return empty messages when no support agent', async () => {
      const guestId = 'guest-no-agent';
      const token = jwt.sign({ userId: guestId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/widget/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.messages).toEqual([]);
    });
  });

  // ── POST /api/widget/end-chat ───────────────────────────────────────────────

  describe('POST /api/widget/end-chat', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/widget/end-chat');
      expect(response.status).toBe(401);
    });

    it('should return 403 if not a guest user', async () => {
      const userId = 'regular-user';
      const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: userId, isGuest: false });

      const response = await request(app)
        .post('/api/widget/end-chat')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toContain('Not a guest');
    });

    it('should end chat successfully and create system message', async () => {
      const guestId = 'guest-end-123';
      const token = jwt.sign({ userId: guestId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: guestId,
        isGuest: true,
        displayName: 'Visitor',
      });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });
      (prisma.message.create as jest.Mock).mockResolvedValue({ id: 'sys-msg' });

      const response = await request(app)
        .post('/api/widget/end-chat')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            senderId: guestId,
            recipientId: supportAgentId,
            type: 'system',
          }),
        })
      );
    });

    it('should succeed even without a support agent', async () => {
      const guestId = 'guest-no-agent';
      const token = jwt.sign({ userId: guestId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: guestId,
        isGuest: true,
        displayName: 'Visitor',
      });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/widget/end-chat')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(prisma.message.create).not.toHaveBeenCalled();
    });
  });
});
