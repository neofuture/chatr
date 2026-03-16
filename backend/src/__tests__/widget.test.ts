import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

const mockS3Send = jest.fn().mockResolvedValue({});
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn((args: any) => args),
}));

const redisModule = require('../lib/redis');

import widgetRouter, { deleteGuestUser, cleanupStaleGuests } from '../routes/widget';
import { setWidgetSocketIO } from '../routes/widget';

const app = express();
app.use(express.json());
app.use('/api/widget', widgetRouter);

const prisma = new PrismaClient();

function guestToken(guestId: string): string {
  return jwt.sign({ userId: guestId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
}

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

      expect(response.body).toEqual({
        id: supportAgentId,
        displayName: 'Support Agent',
        username: '@support',
        profileImage: 'https://example.com/img.png',
      });
    });

    it('should return 404 when no support agent configured', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/widget/support-agent')
        .expect(404);

      expect(response.body.error).toBe('No support agent configured');
    });

    it('should use username as displayName fallback when displayName is null', async () => {
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
      expect(response.body.profileImage).toBeNull();
    });

    it('should use username as displayName fallback when displayName is empty string', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: supportAgentId,
        displayName: '',
        username: '@support',
        profileImage: null,
      });

      const response = await request(app)
        .get('/api/widget/support-agent')
        .expect(200);

      expect(response.body.displayName).toBe('@support');
    });

    it('should return 500 on database error', async () => {
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

      expect(response.body.error).toBe('guestName is required');
    });

    it('should return 400 when guestName is blank', async () => {
      const response = await request(app)
        .post('/api/widget/guest-session')
        .send({ guestName: '   ' })
        .expect(400);

      expect(response.body.error).toBe('guestName is required');
    });

    it('should return 400 when guestName is empty string', async () => {
      const response = await request(app)
        .post('/api/widget/guest-session')
        .send({ guestName: '' })
        .expect(400);

      expect(response.body.error).toBe('guestName is required');
    });

    it('should return 503 when no support agent available', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/widget/guest-session')
        .send({ guestName: 'Visitor' })
        .expect(503);

      expect(response.body.error).toBe('Support is currently unavailable');
    });

    it('should create a new guest session and return JWT + guestId', async () => {
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
      expect(response.body.guestId).toBe('guest-new-123');
      expect(response.body.guestName).toBe('Visitor');
      expect(response.body.supportAgentId).toBe(supportAgentId);

      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET || 'test-secret') as any;
      expect(decoded.userId).toBe('guest-new-123');

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isGuest: true,
            emailVerified: true,
            privacyOnlineStatus: 'nobody',
          }),
        }),
      );
    });

    it('should truncate guestName to 60 chars', async () => {
      const longName = 'A'.repeat(100);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'guest-long',
        username: 'widget_long',
        displayName: 'A'.repeat(60),
      });

      await request(app)
        .post('/api/widget/guest-session')
        .send({ guestName: longName })
        .expect(200);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: 'A'.repeat(60),
          }),
        }),
      );
    });

    it('should resume an existing guest session and update displayName', async () => {
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
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existingGuestId },
          data: { displayName: 'Updated Name' },
        }),
      );
    });

    it('should create new guest when provided guestId not found', async () => {
      (prisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: supportAgentId })
        .mockResolvedValueOnce(null); // guestId lookup returns nothing
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'guest-brand-new',
        username: 'widget_new_abc',
        displayName: 'Visitor',
      });

      const response = await request(app)
        .post('/api/widget/guest-session')
        .send({ guestName: 'Visitor', guestId: 'nonexistent-guest' })
        .expect(200);

      expect(response.body.guestId).toBe('guest-brand-new');
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
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

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/widget/history')
        .set('Authorization', 'Bearer totally-invalid-jwt');
      expect([401, 403]).toContain(response.status);
    });

    it('should return 403 if user is not a guest', async () => {
      const userId = 'not-a-guest';
      const token = guestToken(userId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: userId, isGuest: false });

      const response = await request(app)
        .get('/api/widget/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBe('Not a guest session');
    });

    it('should return 403 if user not found', async () => {
      const token = guestToken('ghost-user');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/widget/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBe('Not a guest session');
    });

    it('should return message history between guest and agent', async () => {
      const guestId = 'guest-hist-123';
      const token = guestToken(guestId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });

      const mockMessages = [
        { id: 'msg-1', senderId: guestId, recipientId: supportAgentId, content: 'Hello', type: 'text', createdAt: new Date('2025-01-01T12:00:00Z') },
        { id: 'msg-2', senderId: supportAgentId, recipientId: guestId, content: 'Hi!', type: 'text', createdAt: new Date('2025-01-01T12:01:00Z') },
      ];
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const response = await request(app)
        .get('/api/widget/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(2);
      expect(response.body.messages[0].id).toBe('msg-1');
      expect(response.body.messages[1].id).toBe('msg-2');

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: { not: 'system' },
          }),
          orderBy: { createdAt: 'asc' },
          take: 100,
        }),
      );
    });

    it('should return empty messages when no support agent', async () => {
      const guestId = 'guest-no-agent';
      const token = guestToken(guestId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/widget/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.messages).toEqual([]);
      expect(prisma.message.findMany).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      const guestId = 'guest-err';
      const token = guestToken(guestId);

      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB failure'));

      const response = await request(app)
        .get('/api/widget/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  // ── POST /api/widget/upload ─────────────────────────────────────────────────

  describe('POST /api/widget/upload', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/widget/upload');
      expect(response.status).toBe(401);
    });

    it('should return 403 if not a guest user', async () => {
      const userId = 'regular-user';
      const token = guestToken(userId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: userId, isGuest: false });

      const response = await request(app)
        .post('/api/widget/upload')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBe('Not a guest session');
    });

    it('should return 400 when no file uploaded', async () => {
      const guestId = 'guest-upload-nofile';
      const token = guestToken(guestId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: true });

      const response = await request(app)
        .post('/api/widget/upload')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toBe('No file uploaded');
    });

    it('should return 503 when no support agent', async () => {
      const guestId = 'guest-upload-noagent';
      const token = guestToken(guestId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/widget/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('data', '{}')
        .attach('file', Buffer.from('fake image data'), {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(503);

      expect(response.body.error).toBe('Support unavailable');
    });

    it('should upload a file and create a message (image)', async () => {
      const guestId = 'guest-upload-ok';
      const token = guestToken(guestId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });

      const mockMessage = {
        id: 'msg-upload-1',
        senderId: guestId,
        recipientId: supportAgentId,
        content: 'http://localhost:3001/uploads/messages/widget-123.png',
        type: 'image',
        fileUrl: 'http://localhost:3001/uploads/messages/widget-123.png',
        fileName: 'photo.png',
        fileSize: 1024,
        fileType: 'image/png',
        createdAt: new Date(),
      };
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/api/widget/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake image data'), {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(response.body.message.id).toBe('msg-upload-1');
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            senderId: guestId,
            recipientId: supportAgentId,
            type: 'image',
            fileName: 'photo.png',
            fileType: 'image/png',
          }),
        }),
      );
    });

    it('should set type to file for non-image/non-video uploads', async () => {
      const guestId = 'guest-upload-pdf';
      const token = guestToken(guestId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-upload-pdf',
        senderId: guestId,
        recipientId: supportAgentId,
        content: 'url',
        type: 'file',
        fileUrl: 'url',
        fileName: 'doc.pdf',
        fileSize: 2048,
        fileType: 'application/pdf',
        createdAt: new Date(),
      });

      await request(app)
        .post('/api/widget/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake pdf'), {
          filename: 'doc.pdf',
          contentType: 'application/pdf',
        })
        .expect(200);

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'file' }),
        }),
      );
    });

    it('should set type to video for video uploads', async () => {
      const guestId = 'guest-upload-video';
      const token = guestToken(guestId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });
      (prisma.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-upload-vid',
        senderId: guestId,
        recipientId: supportAgentId,
        content: 'url',
        type: 'video',
        fileUrl: 'url',
        fileName: 'clip.mp4',
        fileSize: 4096,
        fileType: 'video/mp4',
        createdAt: new Date(),
      });

      await request(app)
        .post('/api/widget/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake video'), {
          filename: 'clip.mp4',
          contentType: 'video/mp4',
        })
        .expect(200);

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'video' }),
        }),
      );
    });

    it('should emit message:received via socket when _widgetIo is set', async () => {
      const guestId = 'guest-upload-socket';
      const token = guestToken(guestId);
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      setWidgetSocketIO({ to: mockTo } as any);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });

      const mockMessage = {
        id: 'msg-socket-1', senderId: guestId, recipientId: supportAgentId,
        content: 'http://localhost:3001/uploads/messages/widget-socket.png', type: 'image',
        fileUrl: 'http://localhost:3001/uploads/messages/widget-socket.png',
        fileName: 'photo.png', fileSize: 1024, fileType: 'image/png', createdAt: new Date(),
      };
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/api/widget/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake image data'), {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .expect(200);

      expect(mockTo).toHaveBeenCalledWith(`user:${supportAgentId}`);
      expect(mockEmit).toHaveBeenCalledWith('message:received', mockMessage);

      setWidgetSocketIO(null as any);
    });

    it('should return 500 on database error during upload', async () => {
      const guestId = 'guest-upload-err';
      const token = guestToken(guestId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: guestId, isGuest: true });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });
      (prisma.message.create as jest.Mock).mockRejectedValue(new Error('DB failure'));

      const response = await request(app)
        .post('/api/widget/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake image'), {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(500);

      expect(response.body.error).toBe('Upload failed');
    });
  });

  // ── POST /api/widget/end-chat ───────────────────────────────────────────────

  describe('POST /api/widget/end-chat', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/widget/end-chat');
      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post('/api/widget/end-chat')
        .set('Authorization', 'Bearer garbage-token');
      expect([401, 403]).toContain(response.status);
    });

    it('should return 403 if not a guest user', async () => {
      const userId = 'regular-user';
      const token = guestToken(userId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: userId, isGuest: false });

      const response = await request(app)
        .post('/api/widget/end-chat')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBe('Not a guest session');
    });

    it('should return 403 if user not found', async () => {
      const token = guestToken('ghost-user');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/widget/end-chat')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBe('Not a guest session');
    });

    it('should end chat, create system message, and return success', async () => {
      const guestId = 'guest-end-123';
      const token = guestToken(guestId);

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
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          senderId: guestId,
          recipientId: supportAgentId,
          content: 'Visitor has left the chat.',
          type: 'system',
        },
      });
    });

    it('should use "Guest" when displayName is null', async () => {
      const guestId = 'guest-no-name';
      const token = guestToken(guestId);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: guestId,
        isGuest: true,
        displayName: null,
      });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });
      (prisma.message.create as jest.Mock).mockResolvedValue({ id: 'sys-msg-2' });

      await request(app)
        .post('/api/widget/end-chat')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: 'Guest has left the chat.',
        }),
      });
    });

    it('should emit guest:left via socket when _widgetIo is set', async () => {
      const guestId = 'guest-end-socket';
      const token = guestToken(guestId);
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      setWidgetSocketIO({ to: mockTo } as any);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: guestId, isGuest: true, displayName: 'SocketGuest',
      });
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: supportAgentId });
      (prisma.message.create as jest.Mock).mockResolvedValue({ id: 'sys-msg-socket' });

      const response = await request(app)
        .post('/api/widget/end-chat')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockTo).toHaveBeenCalledWith(`user:${supportAgentId}`);
      expect(mockEmit).toHaveBeenCalledWith('guest:left', {
        guestId,
        guestName: 'SocketGuest',
        message: 'SocketGuest has left the chat.',
      });

      setWidgetSocketIO(null as any);
    });

    it('should return success even without a support agent', async () => {
      const guestId = 'guest-no-agent';
      const token = guestToken(guestId);

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

    it('should return 500 on database error', async () => {
      const guestId = 'guest-end-err';
      const token = guestToken(guestId);

      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB failure'));

      const response = await request(app)
        .post('/api/widget/end-chat')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  // ── Exported helper: deleteGuestUser ────────────────────────────────────────

  describe('deleteGuestUser()', () => {
    it('should delete messages, conversations, and user', async () => {
      const guestId = 'guest-to-delete';

      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
      (prisma.conversation.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.user.delete as jest.Mock).mockResolvedValue({ id: guestId });

      await deleteGuestUser(guestId);

      expect(prisma.message.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ senderId: guestId }, { recipientId: guestId }] },
      });
      expect(prisma.conversation.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ participantA: guestId }, { participantB: guestId }] },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: guestId } });
    });

    it('should not throw on error (logs and swallows)', async () => {
      (prisma.message.deleteMany as jest.Mock).mockRejectedValue(new Error('FK violation'));

      await expect(deleteGuestUser('bad-id')).resolves.toBeUndefined();
    });
  });

  // ── Exported helper: cleanupStaleGuests ─────────────────────────────────────

  describe('cleanupStaleGuests()', () => {
    it('should do nothing when no stale guests found', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await cleanupStaleGuests();

      expect(prisma.conversation.findMany).not.toHaveBeenCalled();
      expect(prisma.message.deleteMany).not.toHaveBeenCalled();
      expect(prisma.user.deleteMany).not.toHaveBeenCalled();
    });

    it('should skip guests that have conversations', async () => {
      const staleGuests = [
        { id: 'guest-with-convo' },
        { id: 'guest-without-convo' },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(staleGuests);
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([
        { participantA: 'guest-with-convo', participantB: 'agent-1' },
      ]);
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.user.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await cleanupStaleGuests();

      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['guest-without-convo'] } },
      });
    });

    it('should delete all stale guests when none have conversations', async () => {
      const staleGuests = [{ id: 'stale-1' }, { id: 'stale-2' }];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(staleGuests);
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.user.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      await cleanupStaleGuests();

      expect(prisma.message.deleteMany).toHaveBeenCalledWith({
        where: { OR: [{ senderId: { in: ['stale-1', 'stale-2'] } }, { recipientId: { in: ['stale-1', 'stale-2'] } }] },
      });
      expect(prisma.user.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['stale-1', 'stale-2'] } },
      });
    });

    it('should do nothing when all stale guests have conversations', async () => {
      const staleGuests = [{ id: 'busy-guest' }];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(staleGuests);
      (prisma.conversation.findMany as jest.Mock).mockResolvedValue([
        { participantA: 'busy-guest', participantB: 'agent-1' },
      ]);

      await cleanupStaleGuests();

      expect(prisma.message.deleteMany).not.toHaveBeenCalled();
      expect(prisma.user.deleteMany).not.toHaveBeenCalled();
    });

    it('should not throw on error (logs and swallows)', async () => {
      (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('DB down'));

      await expect(cleanupStaleGuests()).resolves.toBeUndefined();
    });
  });

  // ── Production S3 upload path ─────────────────────────────────────────────

  describe('POST /api/widget/upload (S3 production path)', () => {
    it('should upload file to S3 and create message in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.S3_BUCKET = 'widget-bucket';
      process.env.AWS_REGION = 'us-east-1';

      const s3Mod = require('@aws-sdk/client-s3');
      s3Mod.S3Client.mockImplementation(() => ({ send: mockS3Send }));
      s3Mod.PutObjectCommand.mockImplementation((args: any) => args);
      mockS3Send.mockResolvedValue({});
      (redisModule.isTokenBlacklisted as jest.Mock).mockResolvedValue(false);

      let prodApp: express.Express;
      let prodPrisma: any;
      jest.isolateModules(() => {
        const prodRouter = require('../routes/widget').default;
        prodPrisma = require('../lib/prisma').prisma;
        prodApp = express();
        prodApp.use(express.json());
        prodApp.use('/api/widget', prodRouter);
      });

      process.env.NODE_ENV = 'test';

      const guestId = 'guest-s3-prod';
      const token = guestToken(guestId);

      prodPrisma.user.findUnique.mockResolvedValue({ id: guestId, isGuest: true });
      prodPrisma.user.findFirst.mockResolvedValue({ id: supportAgentId });
      prodPrisma.message.create.mockResolvedValue({
        id: 'msg-s3-widget',
        senderId: guestId,
        recipientId: supportAgentId,
        content: 'https://widget-bucket.s3.us-east-1.amazonaws.com/uploads/messages/widget-123.png',
        type: 'image',
        fileUrl: 'https://widget-bucket.s3.us-east-1.amazonaws.com/uploads/messages/widget-123.png',
        fileName: 'photo.png',
        fileSize: 1024,
        fileType: 'image/png',
        createdAt: new Date(),
      });

      const response = await request(prodApp!)
        .post('/api/widget/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake image data'), {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .expect(200);

      expect(response.body.message).toBeDefined();
      expect(mockS3Send).toHaveBeenCalled();
    });
  });
});
