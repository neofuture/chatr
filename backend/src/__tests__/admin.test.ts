import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

import adminRouter from '../routes/admin';
import { isTokenBlacklisted } from '../lib/redis';

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

const supportUserId = 'user-support-1';
const regularUserId = 'user-regular-2';
const guestUserId = 'guest-widget-3';

function makeToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '24h' });
}

const supportToken = makeToken(supportUserId);
const regularToken = makeToken(regularUserId);

const mockGuest = {
  id: guestUserId,
  displayName: 'Test Visitor',
  contactEmail: 'visitor@example.com',
  createdAt: new Date('2026-03-27T10:00:00Z'),
  isGuest: true,
  sentMessages: [
    { id: 'msg-1', content: 'Hello, I need help', type: 'text', createdAt: new Date('2026-03-27T10:01:00Z') },
  ],
  _count: { sentMessages: 1, receivedMessages: 2 },
};

describe('Admin Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
  });

  describe('GET /api/admin/widget-contacts', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/admin/widget-contacts');
      expect(res.status).toBe(401);
    });

    it('should return 403 when user is not support', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: false });

      const res = await request(app)
        .get('/api/admin/widget-contacts')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Support access required');
    });

    it('should return empty array when no guests exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: true });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/admin/widget-contacts')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return contacts when guests exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: true });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockGuest]);

      const res = await request(app)
        .get('/api/admin/widget-contacts')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: guestUserId,
        name: 'Test Visitor',
        contactEmail: 'visitor@example.com',
        hasConversation: true,
        totalMessages: 3,
      });
      expect(res.body[0].firstMessage).toMatchObject({
        content: 'Hello, I need help',
      });
    });

    it('should query only guest users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: true });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/admin/widget-contacts')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isGuest: true } })
      );
    });
  });

  describe('GET /api/admin/widget-contacts/:guestId/messages', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`/api/admin/widget-contacts/${guestUserId}/messages`);
      expect(res.status).toBe(401);
    });

    it('should return 403 when user is not support', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: false });

      const res = await request(app)
        .get(`/api/admin/widget-contacts/${guestUserId}/messages`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when guest does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/admin/widget-contacts/nonexistent/messages')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Guest not found');
    });

    it('should return guest info and messages', async () => {
      const guest = { id: guestUserId, displayName: 'Test Visitor', contactEmail: 'visitor@example.com' };
      const messages = [
        {
          id: 'msg-1', content: 'Hello', type: 'text',
          senderId: guestUserId, recipientId: supportUserId,
          createdAt: new Date('2026-03-27T10:01:00Z'),
          sender: { displayName: 'Test Visitor', isGuest: true, isSupport: false },
        },
        {
          id: 'msg-2', content: 'Hi, how can I help?', type: 'text',
          senderId: supportUserId, recipientId: guestUserId,
          createdAt: new Date('2026-03-27T10:02:00Z'),
          sender: { displayName: 'Support Agent', isGuest: false, isSupport: true },
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(guest);
      (prisma.message.findMany as jest.Mock).mockResolvedValue(messages);

      const res = await request(app)
        .get(`/api/admin/widget-contacts/${guestUserId}/messages`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.guest).toMatchObject({ id: guestUserId, displayName: 'Test Visitor' });
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.messages[0].sender.isGuest).toBe(true);
      expect(res.body.messages[1].sender.isSupport).toBe(true);
    });
  });

  describe('DELETE /api/admin/widget-contacts/:guestId', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).delete(`/api/admin/widget-contacts/${guestUserId}`);
      expect(res.status).toBe(401);
    });

    it('should return 403 when user is not support', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: false });

      const res = await request(app)
        .delete(`/api/admin/widget-contacts/${guestUserId}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when guest does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/admin/widget-contacts/nonexistent')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Guest not found');
    });

    it('should delete guest and cascade delete messages and conversations', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: guestUserId, isGuest: true });
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
      (prisma.conversation.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: guestUserId });

      const res = await request(app)
        .delete(`/api/admin/widget-contacts/${guestUserId}`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(prisma.message.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ senderId: guestUserId }, { recipientId: guestUserId }] },
      });
      expect(prisma.conversation.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ participantA: guestUserId }, { participantB: guestUserId }] },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: guestUserId } });
    });
  });

  describe('POST /api/admin/widget-contacts/:guestId/reply', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post(`/api/admin/widget-contacts/${guestUserId}/reply`)
        .send({ content: 'Hello' });
      expect(res.status).toBe(401);
    });

    it('should return 403 when user is not support', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: false });

      const res = await request(app)
        .post(`/api/admin/widget-contacts/${guestUserId}/reply`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ content: 'Hello' });

      expect(res.status).toBe(403);
    });

    it('should return 400 when content is empty', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: true });

      const res = await request(app)
        .post(`/api/admin/widget-contacts/${guestUserId}/reply`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Message content is required');
    });

    it('should return 404 when guest does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/admin/widget-contacts/nonexistent/reply')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ content: 'Hello there' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Guest not found');
    });

    it('should create message and return it on success', async () => {
      const mockMessage = {
        id: 'msg-reply-1',
        senderId: supportUserId,
        recipientId: guestUserId,
        content: 'Hello, how can I help?',
        type: 'text',
        createdAt: new Date('2026-03-28T10:00:00Z'),
        sender: { displayName: 'Support Agent', isGuest: false, isSupport: true },
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: guestUserId, isGuest: true });
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue({ id: 'conv-1' });
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const res = await request(app)
        .post(`/api/admin/widget-contacts/${guestUserId}/reply`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ content: 'Hello, how can I help?' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatchObject({
        id: 'msg-reply-1',
        content: 'Hello, how can I help?',
        senderId: supportUserId,
        recipientId: guestUserId,
      });
    });

    it('should create conversation if none exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ isSupport: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: guestUserId, isGuest: true });
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.conversation.create as jest.Mock).mockResolvedValue({ id: 'new-conv' });
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-new', senderId: supportUserId, recipientId: guestUserId,
        content: 'Hi', type: 'text', createdAt: new Date(),
        sender: { displayName: 'Agent', isGuest: false, isSupport: true },
      });

      const res = await request(app)
        .post(`/api/admin/widget-contacts/${guestUserId}/reply`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({ content: 'Hi' });

      expect(res.status).toBe(200);
      expect(prisma.conversation.create).toHaveBeenCalled();
    });
  });
});
