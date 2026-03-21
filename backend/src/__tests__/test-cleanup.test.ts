import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

const redisModule = require('../lib/redis');

import testCleanupRouter from '../routes/test-cleanup';
import { isTestMode, setTestMode } from '../lib/testMode';

jest.mock('../lib/testMode', () => ({
  isTestMode: jest.fn(),
  setTestMode: jest.fn().mockResolvedValue(true),
}));

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use('/api/test', testCleanupRouter);

const testUserId = 'user-cleanup-100';
const recipientId = 'user-recipient-200';

function makeToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '24h' });
}

const authToken = makeToken(testUserId);

describe('Test Cleanup Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redisModule.isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── POST /api/test/mode ─────────────────────────────────────────────────────

  describe('POST /api/test/mode', () => {
    it('should return 404 in production', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const res = await request(app)
        .post('/api/test/mode')
        .send({ enabled: true });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
      process.env.NODE_ENV = origEnv;
    });

    it('should return 400 when enabled is not boolean', async () => {
      const res = await request(app)
        .post('/api/test/mode')
        .send({ enabled: 'yes' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('enabled (boolean) required');
    });

    it('should return 400 when enabled is missing', async () => {
      const res = await request(app)
        .post('/api/test/mode')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('enabled (boolean) required');
    });

    it('should enable test mode', async () => {
      (setTestMode as jest.Mock).mockReturnValue(true);

      const res = await request(app)
        .post('/api/test/mode')
        .send({ enabled: true });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, testMode: true });
      expect(setTestMode).toHaveBeenCalledWith(true);
    });

    it('should disable test mode', async () => {
      (setTestMode as jest.Mock).mockReturnValue(true);

      const res = await request(app)
        .post('/api/test/mode')
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, testMode: false });
      expect(setTestMode).toHaveBeenCalledWith(false);
    });
  });

  // ── POST /api/test/cleanup ──────────────────────────────────────────────────

  describe('POST /api/test/cleanup', () => {
    it('should return 404 when test mode is off', async () => {
      (isTestMode as jest.Mock).mockReturnValue(false);

      const res = await request(app)
        .post('/api/test/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ recipientId });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });

    it('should return 401 without auth token', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);

      const res = await request(app)
        .post('/api/test/cleanup')
        .send({ recipientId });

      expect(res.status).toBe(401);
    });

    it('should return 400 when recipientId is missing', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);

      const res = await request(app)
        .post('/api/test/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('recipientId required');
    });

    it('should delete test DM messages matching E2E patterns', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);

      const dmMessages = [
        { id: 'msg-1', content: 'Hello world', fileName: null },
        { id: 'msg-2', content: 'Regular message', fileName: null },
        { id: 'msg-3', content: 'E2E test msg 123', fileName: null },
        { id: 'msg-4', content: 'some content', fileName: 'test-image.png' },
        { id: 'msg-5', content: 'Voice message', fileName: 'voice-12345.wav' },
      ];
      (prisma.message.findMany as jest.Mock).mockResolvedValue(dmMessages);
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({ count: 4 });
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.group.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .post('/api/test/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ recipientId });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.messagesDeleted).toBe(4);
      expect(prisma.message.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['msg-1', 'msg-3', 'msg-4', 'msg-5'] } },
      });
    });

    it('should skip non-matching messages', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);

      const dmMessages = [
        { id: 'msg-safe', content: 'Normal user message', fileName: null },
      ];
      (prisma.message.findMany as jest.Mock).mockResolvedValue(dmMessages);
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.group.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .post('/api/test/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ recipientId });

      expect(res.status).toBe(200);
      expect(res.body.messagesDeleted).toBe(0);
    });

    it('should clean up empty conversations after deleting messages', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);

      (prisma.message.findMany as jest.Mock).mockResolvedValue([
        { id: 'msg-1', content: 'Hello test', fileName: null },
      ]);
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([{ id: 'conv-1' }]);
      (prisma.message.count as jest.Mock) = jest.fn().mockResolvedValue(0);
      (prisma.conversation.delete as jest.Mock).mockResolvedValue({});
      (prisma.group.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .post('/api/test/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ recipientId });

      expect(res.status).toBe(200);
      expect(prisma.conversation.delete).toHaveBeenCalledWith({ where: { id: 'conv-1' } });
    });

    it('should not delete conversation when messages remain', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);

      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([{ id: 'conv-1' }]);
      (prisma.message.count as jest.Mock) = jest.fn().mockResolvedValue(5);
      (prisma.group.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .post('/api/test/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ recipientId });

      expect(res.status).toBe(200);
      expect(prisma.conversation.delete).not.toHaveBeenCalled();
    });

    it('should delete test groups by name prefix', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);

      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.group.findMany as jest.Mock).mockResolvedValue([
        { id: 'grp-1' }, { id: 'grp-2' },
      ]);
      (prisma.groupMessage.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });
      (prisma.groupMember.deleteMany as jest.Mock).mockResolvedValue({ count: 4 });
      (prisma.group.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post('/api/test/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ recipientId });

      expect(res.status).toBe(200);
      expect(res.body.groupsDeleted).toBe(2);
      expect(prisma.groupMessage.deleteMany).toHaveBeenCalledWith({
        where: { groupId: { in: ['grp-1', 'grp-2'] } },
      });
      expect(prisma.groupMember.deleteMany).toHaveBeenCalledWith({
        where: { groupId: { in: ['grp-1', 'grp-2'] } },
      });
      expect(prisma.group.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['grp-1', 'grp-2'] } },
      });
    });

    it('should return 500 on database error', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);
      (prisma.message.findMany as jest.Mock).mockRejectedValue(new Error('db down'));

      const res = await request(app)
        .post('/api/test/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ recipientId });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Cleanup failed');
    });
  });

  // ── POST /api/test/restore-images ───────────────────────────────────────────

  describe('POST /api/test/restore-images', () => {
    it('should return 404 when test mode is off', async () => {
      (isTestMode as jest.Mock).mockReturnValue(false);

      const res = await request(app)
        .post('/api/test/restore-images')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ profileImage: 'http://img/pic.jpg' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });

    it('should return 401 without auth token', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);

      const res = await request(app)
        .post('/api/test/restore-images')
        .send({ profileImage: 'http://img/pic.jpg' });

      expect(res.status).toBe(401);
    });

    it('should restore profileImage', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/test/restore-images')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ profileImage: 'http://img/pic.jpg' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { profileImage: 'http://img/pic.jpg' },
      });
    });

    it('should restore coverImage', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/test/restore-images')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ coverImage: 'http://img/cover.jpg' });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { coverImage: 'http://img/cover.jpg' },
      });
    });

    it('should restore both images', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/test/restore-images')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ profileImage: 'http://img/pic.jpg', coverImage: 'http://img/cover.jpg' });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { profileImage: 'http://img/pic.jpg', coverImage: 'http://img/cover.jpg' },
      });
    });

    it('should allow null values for clearing images', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/test/restore-images')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ profileImage: null });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { profileImage: null },
      });
    });

    it('should skip update when no image fields provided', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);

      const res = await request(app)
        .post('/api/test/restore-images')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      (isTestMode as jest.Mock).mockReturnValue(true);
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .post('/api/test/restore-images')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ profileImage: 'http://img/pic.jpg' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Restore failed');
    });
  });
});
