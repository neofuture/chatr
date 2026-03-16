import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

const redisModule = require('../lib/redis');

import messagesRouter, { setMessagesSocketIO } from '../routes/messages';

const app = express();
app.use(express.json());
app.use('/api/messages', messagesRouter);

const prisma = new PrismaClient();

describe('Messages Routes', () => {
  let authToken: string;
  const testUserId = 'user-me-123';
  const otherUserId = 'user-other-456';
  const thirdUserId = 'user-third-789';

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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── GET /api/messages/:recipientId ────────────────────────────────────────

  describe('GET /api/messages/:recipientId', () => {
    const baseMessage = {
      id: 'msg-1',
      senderId: testUserId,
      recipientId: otherUserId,
      content: 'Hello there',
      type: 'text',
      status: 'sent',
      isRead: false,
      readAt: null,
      edited: false,
      editedAt: null,
      deletedAt: null,
      fileUrl: null,
      fileName: null,
      fileSize: null,
      fileType: null,
      audioWaveform: null,
      audioDuration: null,
      replyToId: null,
      replyToContent: null,
      replyToSenderName: null,
      replyToType: null,
      replyToDuration: null,
      linkPreview: null,
      createdAt: new Date('2025-01-01T12:00:00Z'),
      sender: { id: testUserId, username: '@me', displayName: 'Me', profileImage: null },
      reactions: [],
    };

    it('should return 401 without auth token', async () => {
      const response = await request(app).get(`/api/messages/${otherUserId}`);
      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', 'Bearer invalid-token');
      expect([401, 403]).toContain(response.status);
    });

    it('should return messages in chronological order', async () => {
      const msg1 = { ...baseMessage, id: 'msg-1', createdAt: new Date('2025-01-01T12:00:00Z') };
      const msg2 = { ...baseMessage, id: 'msg-2', createdAt: new Date('2025-01-01T13:00:00Z') };

      (prisma.message.findMany as jest.Mock).mockResolvedValue([msg2, msg1]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(2);
      expect(response.body.messages[0].id).toBe('msg-1');
      expect(response.body.messages[1].id).toBe('msg-2');
    });

    it('should return hasMore true when at limit', async () => {
      const messages = Array.from({ length: 50 }, (_, i) => ({
        ...baseMessage,
        id: `msg-${i}`,
      }));
      (prisma.message.findMany as jest.Mock).mockResolvedValue(messages);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.hasMore).toBe(true);
    });

    it('should return hasMore false when below limit', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([baseMessage]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.hasMore).toBe(false);
    });

    it('should respect custom limit parameter', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await request(app)
        .get(`/api/messages/${otherUserId}?limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it('should clamp limit to max 100', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await request(app)
        .get(`/api/messages/${otherUserId}?limit=999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it('should clamp limit to min 1', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await request(app)
        .get(`/api/messages/${otherUserId}?limit=-1`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 })
      );
    });

    it('should support before cursor for pagination', async () => {
      const cursorDate = new Date('2025-01-01T10:00:00Z');
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({ createdAt: cursorDate });
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await request(app)
        .get(`/api/messages/${otherUserId}?before=cursor-msg-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(prisma.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'cursor-msg-id' },
        select: { createdAt: true },
      });
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lt: cursorDate },
          }),
        })
      );
    });

    it('should ignore invalid before cursor gracefully', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get(`/api/messages/${otherUserId}?before=nonexistent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages).toEqual([]);
    });

    it('should mark unread messages as read', async () => {
      const unreadMsg = {
        ...baseMessage,
        id: 'msg-unread',
        senderId: otherUserId,
        recipientId: testUserId,
        isRead: false,
        sender: { id: otherUserId, username: '@other', displayName: 'Other', profileImage: null },
      };

      (prisma.message.findMany as jest.Mock).mockResolvedValue([unreadMsg]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['msg-unread'] } },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('should not call updateMany when no unread messages', async () => {
      const readMsg = { ...baseMessage, isRead: true };
      (prisma.message.findMany as jest.Mock).mockResolvedValue([readMsg]);

      await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(prisma.message.updateMany).not.toHaveBeenCalled();
    });

    it('should format deleted/unsent messages correctly', async () => {
      const deletedMsg = {
        ...baseMessage,
        id: 'msg-deleted',
        content: 'Secret message',
        type: 'image',
        deletedAt: new Date(),
        edited: true,
        fileUrl: 'https://example.com/file.png',
        fileName: 'file.png',
        fileSize: 1024,
        fileType: 'image/png',
        audioWaveform: [0.1, 0.2],
        audioDuration: 5,
        linkPreview: { title: 'Link' },
      };

      (prisma.message.findMany as jest.Mock).mockResolvedValue([deletedMsg]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const msg = response.body.messages[0];
      expect(msg.content).toBe('');
      expect(msg.unsent).toBe(true);
      expect(msg.edited).toBe(false);
      expect(msg.type).toBe('text');
      expect(msg.fileUrl).toBeNull();
      expect(msg.fileName).toBeNull();
      expect(msg.fileSize).toBeNull();
      expect(msg.fileType).toBeNull();
      expect(msg.waveform).toBeNull();
      expect(msg.duration).toBeNull();
      expect(msg.linkPreview).toBeNull();
    });

    it('should format normal messages with all fields', async () => {
      const fullMsg = {
        ...baseMessage,
        edited: true,
        editedAt: new Date('2025-01-02T00:00:00Z'),
        fileUrl: 'https://example.com/file.pdf',
        fileName: 'doc.pdf',
        fileSize: 2048,
        fileType: 'application/pdf',
        audioWaveform: [0.1, 0.5, 0.9],
        audioDuration: 3.5,
        linkPreview: { title: 'Example', url: 'https://example.com' },
      };

      (prisma.message.findMany as jest.Mock).mockResolvedValue([fullMsg]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const msg = response.body.messages[0];
      expect(msg.content).toBe('Hello there');
      expect(msg.unsent).toBe(false);
      expect(msg.edited).toBe(true);
      expect(msg.editedAt).toBeTruthy();
      expect(msg.type).toBe('text');
      expect(msg.fileUrl).toBe('https://example.com/file.pdf');
      expect(msg.fileName).toBe('doc.pdf');
      expect(msg.fileSize).toBe(2048);
      expect(msg.fileType).toBe('application/pdf');
      expect(msg.waveform).toEqual([0.1, 0.5, 0.9]);
      expect(msg.duration).toBe(3.5);
      expect(msg.linkPreview).toEqual({ title: 'Example', url: 'https://example.com' });
    });

    it('should format reactions correctly', async () => {
      const msgWithReactions = {
        ...baseMessage,
        reactions: [
          { userId: otherUserId, emoji: '👍', user: { id: otherUserId, username: '@other' } },
          { userId: thirdUserId, emoji: '❤️', user: { id: thirdUserId, username: '@third' } },
        ],
      };

      (prisma.message.findMany as jest.Mock).mockResolvedValue([msgWithReactions]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const reactions = response.body.messages[0].reactions;
      expect(reactions).toHaveLength(2);
      expect(reactions[0]).toEqual({ userId: otherUserId, username: '@other', emoji: '👍' });
      expect(reactions[1]).toEqual({ userId: thirdUserId, username: '@third', emoji: '❤️' });
    });

    it('should format replyTo snapshot correctly', async () => {
      const msgWithReply = {
        ...baseMessage,
        replyToId: 'original-msg-id',
        replyToContent: 'Original text',
        replyToSenderName: 'OtherUser',
        replyToType: 'text',
        replyToDuration: null,
      };

      (prisma.message.findMany as jest.Mock).mockResolvedValue([msgWithReply]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const replyTo = response.body.messages[0].replyTo;
      expect(replyTo).toEqual({
        id: 'original-msg-id',
        content: 'Original text',
        senderDisplayName: 'OtherUser',
        senderUsername: 'OtherUser',
        type: 'text',
        duration: null,
      });
    });

    it('should omit replyTo when no replyToId', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([baseMessage]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages[0].replyTo).toBeUndefined();
    });

    it('should format sender fields correctly', async () => {
      const msgWithDisplayName = {
        ...baseMessage,
        sender: { id: testUserId, username: '@me', displayName: 'My Name', profileImage: 'https://img.example.com/avatar.jpg' },
      };

      (prisma.message.findMany as jest.Mock).mockResolvedValue([msgWithDisplayName]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const msg = response.body.messages[0];
      expect(msg.senderId).toBe(testUserId);
      expect(msg.senderUsername).toBe('@me');
      expect(msg.senderDisplayName).toBe('My Name');
      expect(msg.senderProfileImage).toBe('https://img.example.com/avatar.jpg');
    });

    it('should handle null displayName', async () => {
      const msgNullDisplay = {
        ...baseMessage,
        sender: { id: testUserId, username: '@me', displayName: null, profileImage: null },
      };
      (prisma.message.findMany as jest.Mock).mockResolvedValue([msgNullDisplay]);
      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages[0].senderDisplayName).toBeNull();
    });

    it('should return 500 on database error', async () => {
      (prisma.message.findMany as jest.Mock).mockRejectedValue(new Error('DB failure'));

      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch message history');
    });
  });

  // ── GET /api/messages/:id/edits ───────────────────────────────────────────

  describe('GET /api/messages/:id/edits', () => {
    const messageId = 'msg-edit-1';
    const editHistory = [
      {
        id: 'edit-1',
        messageId,
        previousContent: 'First version',
        editedAt: new Date('2025-01-01T12:00:00Z'),
        editedBy: { id: testUserId, username: '@me', displayName: 'Me' },
      },
      {
        id: 'edit-2',
        messageId,
        previousContent: 'Second version',
        editedAt: new Date('2025-01-01T13:00:00Z'),
        editedBy: { id: testUserId, username: '@me', displayName: null },
      },
    ];

    it('should return 401 without auth token', async () => {
      const response = await request(app).get(`/api/messages/${messageId}/edits`);
      expect(response.status).toBe(401);
    });

    it('should return edit history for sender', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({
        senderId: testUserId,
        recipientId: otherUserId,
      });
      (prisma.messageEditHistory.findMany as jest.Mock).mockResolvedValue(editHistory);

      const response = await request(app)
        .get(`/api/messages/${messageId}/edits`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messageId).toBe(messageId);
      expect(response.body.edits).toHaveLength(2);
      expect(response.body.edits[0].previousContent).toBe('First version');
      expect(response.body.edits[1].previousContent).toBe('Second version');
    });

    it('should return edit history for recipient', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({
        senderId: otherUserId,
        recipientId: testUserId,
      });
      (prisma.messageEditHistory.findMany as jest.Mock).mockResolvedValue([editHistory[0]]);

      const response = await request(app)
        .get(`/api/messages/${messageId}/edits`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.edits).toHaveLength(1);
    });

    it('should format editedBy with null displayName', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({
        senderId: testUserId,
        recipientId: otherUserId,
      });
      (prisma.messageEditHistory.findMany as jest.Mock).mockResolvedValue([editHistory[1]]);

      const response = await request(app)
        .get(`/api/messages/${messageId}/edits`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.edits[0].editedBy.displayName).toBeNull();
    });

    it('should return 403 for non-participant', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({
        senderId: otherUserId,
        recipientId: thirdUserId,
      });

      const response = await request(app)
        .get(`/api/messages/${messageId}/edits`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 404 when message not found', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/messages/nonexistent-id/edits')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Message not found');
    });

    it('should return empty edits array for unedited message', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({
        senderId: testUserId,
        recipientId: otherUserId,
      });
      (prisma.messageEditHistory.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/messages/${messageId}/edits`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.edits).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      (prisma.message.findUnique as jest.Mock).mockRejectedValue(new Error('DB failure'));

      const response = await request(app)
        .get(`/api/messages/${messageId}/edits`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch edit history');
    });
  });

  // ── PATCH /api/messages/:id/waveform ──────────────────────────────────────

  describe('PATCH /api/messages/:id/waveform', () => {
    const messageId = 'msg-audio-1';

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .patch(`/api/messages/${messageId}/waveform`)
        .send({ waveform: [0.1, 0.5] });
      expect(response.status).toBe(401);
    });

    it('should return 400 without waveform field', async () => {
      const response = await request(app)
        .patch(`/api/messages/${messageId}/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('waveform array required');
    });

    it('should return 400 when waveform is not an array', async () => {
      const response = await request(app)
        .patch(`/api/messages/${messageId}/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ waveform: 'not-an-array' })
        .expect(400);

      expect(response.body.error).toBe('waveform array required');
    });

    it('should return 404 when message not found', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .patch(`/api/messages/${messageId}/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ waveform: [0.1, 0.5] })
        .expect(404);

      expect(response.body.error).toBe('Message not found');
    });

    it('should return 403 when not the sender', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({
        senderId: otherUserId,
      });

      const response = await request(app)
        .patch(`/api/messages/${messageId}/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ waveform: [0.1, 0.5] })
        .expect(403);

      expect(response.body.error).toBe('Access denied');
    });

    it('should update waveform successfully', async () => {
      const waveform = [0.1, 0.3, 0.7, 0.5, 0.2];
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({ senderId: testUserId });
      (prisma.message.update as jest.Mock).mockResolvedValue({
        id: messageId,
        senderId: testUserId,
        recipientId: otherUserId,
        audioWaveform: waveform,
        audioDuration: 2.5,
      });

      const response = await request(app)
        .patch(`/api/messages/${messageId}/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ waveform, duration: 2.5 })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: { audioWaveform: waveform, audioDuration: 2.5 },
      });
    });

    it('should update waveform without duration', async () => {
      const waveform = [0.1, 0.9];
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({ senderId: testUserId });
      (prisma.message.update as jest.Mock).mockResolvedValue({
        id: messageId,
        senderId: testUserId,
        recipientId: otherUserId,
        audioWaveform: waveform,
        audioDuration: null,
      });

      await request(app)
        .patch(`/api/messages/${messageId}/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ waveform })
        .expect(200);

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: { audioWaveform: waveform, audioDuration: undefined },
      });
    });

    it('should return 500 on database error', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValue({ senderId: testUserId });
      (prisma.message.update as jest.Mock).mockRejectedValue(new Error('DB failure'));

      const response = await request(app)
        .patch(`/api/messages/${messageId}/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ waveform: [0.5] });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update waveform');
    });

    it('should emit waveform via socket.io when _io is set', async () => {
      const mockEmit = jest.fn();
      const mockTo = jest.fn(() => ({ emit: mockEmit }));
      setMessagesSocketIO({ to: mockTo } as any);

      (prisma.message.findUnique as jest.Mock).mockResolvedValue({ senderId: testUserId });
      (prisma.message.update as jest.Mock).mockResolvedValue({
        id: messageId,
        senderId: testUserId,
        recipientId: otherUserId,
        audioWaveform: [0.1, 0.3],
        audioDuration: 1.5,
      });

      const response = await request(app)
        .patch(`/api/messages/${messageId}/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ waveform: [0.1, 0.3], duration: 1.5 })
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockTo).toHaveBeenCalledWith(`user:${testUserId}`);
      expect(mockTo).toHaveBeenCalledWith(`user:${otherUserId}`);
      expect(mockEmit).toHaveBeenCalledWith('audio:waveform', {
        messageId,
        waveform: [0.1, 0.3],
        duration: 1.5,
      });

      setMessagesSocketIO(null as any);
    });
  });

  // ── Missing userId in token ───────────────────────────────────────────────

  describe('requests with missing userId in token', () => {
    let noUserIdToken: string;

    beforeAll(() => {
      noUserIdToken = jwt.sign(
        { username: '@testuser' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );
    });

    it('GET /:recipientId should return 401 when token has no userId', async () => {
      const response = await request(app)
        .get(`/api/messages/${otherUserId}`)
        .set('Authorization', `Bearer ${noUserIdToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

  });
});
