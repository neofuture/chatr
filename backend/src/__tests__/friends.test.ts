import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  invalidateConversationCache: jest.fn().mockResolvedValue(undefined),
}));

const redisModule = require('../lib/redis');

import friendsRouter from '../routes/friends';

const app = express();
app.use(express.json());
app.use('/api/friends', friendsRouter);

const prisma = new PrismaClient();

describe('Friends Routes', () => {
  let authToken: string;
  const testUserId = 'user-me-123';
  const otherUserId = 'user-other-456';

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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── GET /api/friends ───────────────────────────────────────────────────────

  describe('GET /api/friends', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/friends');
      expect(response.status).toBe(401);
    });

    it('should return accepted friends list', async () => {
      (prisma.friendship.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'fs-1',
          requesterId: testUserId,
          addresseeId: otherUserId,
          status: 'accepted',
          updatedAt: new Date(),
          requester: { id: testUserId, username: '@me', displayName: 'Me' },
          addressee: { id: otherUserId, username: '@other', displayName: 'Other' },
        },
      ]);

      const response = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.friends).toHaveLength(1);
      expect(response.body.friends[0].user.id).toBe(otherUserId);
      expect(response.body.friends[0].friendshipId).toBe('fs-1');
    });

    it('should return empty friends list', async () => {
      (prisma.friendship.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.friends).toEqual([]);
    });
  });

  // ── GET /api/friends/requests/incoming ──────────────────────────────────────

  describe('GET /api/friends/requests/incoming', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/friends/requests/incoming');
      expect(response.status).toBe(401);
    });

    it('should return incoming requests', async () => {
      (prisma.friendship.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'fs-2',
          createdAt: new Date(),
          requester: { id: otherUserId, username: '@other', displayName: 'Other' },
        },
      ]);

      const response = await request(app)
        .get('/api/friends/requests/incoming')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.requests).toHaveLength(1);
      expect(response.body.requests[0].friendshipId).toBe('fs-2');
    });
  });

  // ── GET /api/friends/requests/outgoing ──────────────────────────────────────

  describe('GET /api/friends/requests/outgoing', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/friends/requests/outgoing');
      expect(response.status).toBe(401);
    });

    it('should return outgoing requests', async () => {
      (prisma.friendship.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'fs-3',
          createdAt: new Date(),
          addressee: { id: otherUserId, username: '@other', displayName: 'Other' },
        },
      ]);

      const response = await request(app)
        .get('/api/friends/requests/outgoing')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.requests).toHaveLength(1);
      expect(response.body.requests[0].friendshipId).toBe('fs-3');
    });
  });

  // ── GET /api/friends/search ─────────────────────────────────────────────────

  describe('GET /api/friends/search', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/friends/search?q=test');
      expect(response.status).toBe(401);
    });

    it('should return empty results for short queries', async () => {
      const response = await request(app)
        .get('/api/friends/search?q=a')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.users).toEqual([]);
    });

    it('should return search results with friendship status', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: otherUserId, username: '@other', displayName: 'Other User' },
      ]);
      (prisma.friendship.findMany as jest.Mock).mockResolvedValue([
        { id: 'fs-10', requesterId: testUserId, addresseeId: otherUserId, status: 'pending' },
      ]);

      const response = await request(app)
        .get('/api/friends/search?q=other')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].friendship).toBeTruthy();
      expect(response.body.users[0].friendship.status).toBe('pending');
    });
  });

  // ── POST /api/friends/request ───────────────────────────────────────────────

  describe('POST /api/friends/request', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/friends/request')
        .send({ addresseeId: otherUserId });
      expect(response.status).toBe(401);
    });

    it('should return 400 when addresseeId is missing', async () => {
      const response = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('addresseeId required');
    });

    it('should return 400 when trying to add self', async () => {
      const response = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ addresseeId: testUserId })
        .expect(400);

      expect(response.body.message).toContain('Cannot add yourself');
    });

    it('should create a new friend request', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.friendship.create as jest.Mock).mockResolvedValue({
        id: 'fs-new',
        requesterId: testUserId,
        addresseeId: otherUserId,
        status: 'pending',
        requester: { id: testUserId, username: '@me' },
        addressee: { id: otherUserId, username: '@other' },
      });

      const response = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ addresseeId: otherUserId })
        .expect(201);

      expect(response.body.friendship.id).toBe('fs-new');
      expect(response.body.friendship.status).toBe('pending');
    });

    it('should return 409 when already friends', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({
        id: 'fs-existing',
        requesterId: testUserId,
        addresseeId: otherUserId,
        status: 'accepted',
      });

      const response = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ addresseeId: otherUserId })
        .expect(409);

      expect(response.body.message).toContain('Already friends');
    });

    it('should return 409 when request already sent', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({
        id: 'fs-pending',
        requesterId: testUserId,
        addresseeId: otherUserId,
        status: 'pending',
      });

      const response = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ addresseeId: otherUserId })
        .expect(409);

      expect(response.body.message).toContain('Request already sent');
    });

    it('should return 409 when blocked', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({
        id: 'fs-blocked',
        requesterId: testUserId,
        addresseeId: otherUserId,
        status: 'blocked',
      });

      const response = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ addresseeId: otherUserId })
        .expect(409);

      expect(response.body.message).toContain('Cannot send request');
    });

    it('should auto-accept when they already sent us a request', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({
        id: 'fs-their-request',
        requesterId: otherUserId,
        addresseeId: testUserId,
        status: 'pending',
      });
      (prisma.friendship.update as jest.Mock).mockResolvedValue({
        id: 'fs-their-request',
        requesterId: otherUserId,
        addresseeId: testUserId,
        status: 'accepted',
        requester: { id: otherUserId, username: '@other' },
        addressee: { id: testUserId, username: '@me' },
      });

      const response = await request(app)
        .post('/api/friends/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ addresseeId: otherUserId })
        .expect(200);

      expect(response.body.autoAccepted).toBe(true);
      expect(response.body.friendship.status).toBe('accepted');
    });
  });

  // ── POST /api/friends/:friendshipId/accept ──────────────────────────────────

  describe('POST /api/friends/:friendshipId/accept', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/friends/fs-1/accept');
      expect(response.status).toBe(401);
    });

    it('should accept a friend request', async () => {
      (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({
        id: 'fs-1',
        requesterId: otherUserId,
        addresseeId: testUserId,
        status: 'pending',
      });
      (prisma.friendship.update as jest.Mock).mockResolvedValue({
        id: 'fs-1',
        status: 'accepted',
        requester: { id: otherUserId },
        addressee: { id: testUserId },
      });

      const response = await request(app)
        .post('/api/friends/fs-1/accept')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.friendship.status).toBe('accepted');
    });

    it('should return 404 when request not found', async () => {
      (prisma.friendship.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/friends/fs-nonexist/accept')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should return 403 when not the addressee', async () => {
      (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({
        id: 'fs-1',
        requesterId: testUserId,
        addresseeId: otherUserId,
        status: 'pending',
      });

      const response = await request(app)
        .post('/api/friends/fs-1/accept')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.message).toContain('Not authorised');
    });

    it('should return 409 when request is not pending', async () => {
      (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({
        id: 'fs-1',
        requesterId: otherUserId,
        addresseeId: testUserId,
        status: 'accepted',
      });

      const response = await request(app)
        .post('/api/friends/fs-1/accept')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.message).toContain('not pending');
    });
  });

  // ── POST /api/friends/:friendshipId/decline ─────────────────────────────────

  describe('POST /api/friends/:friendshipId/decline', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/friends/fs-1/decline');
      expect(response.status).toBe(401);
    });

    it('should decline a friend request as addressee', async () => {
      (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({
        id: 'fs-1',
        requesterId: otherUserId,
        addresseeId: testUserId,
      });
      (prisma.friendship.delete as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/friends/fs-1/decline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(prisma.friendship.delete).toHaveBeenCalledWith({ where: { id: 'fs-1' } });
    });

    it('should cancel a friend request as requester', async () => {
      (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({
        id: 'fs-1',
        requesterId: testUserId,
        addresseeId: otherUserId,
      });
      (prisma.friendship.delete as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/friends/fs-1/decline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should return 404 when request not found', async () => {
      (prisma.friendship.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/friends/fs-nonexist/decline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should return 403 when not a participant', async () => {
      (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({
        id: 'fs-1',
        requesterId: 'someone-else',
        addresseeId: otherUserId,
      });

      const response = await request(app)
        .post('/api/friends/fs-1/decline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.message).toContain('Not authorised');
    });
  });

  // ── DELETE /api/friends/:friendshipId ───────────────────────────────────────

  describe('DELETE /api/friends/:friendshipId', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/friends/fs-1');
      expect(response.status).toBe(401);
    });

    it('should remove a friend', async () => {
      (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({
        id: 'fs-1',
        requesterId: testUserId,
        addresseeId: otherUserId,
      });
      (prisma.friendship.delete as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .delete('/api/friends/fs-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should return 404 when friendship not found', async () => {
      (prisma.friendship.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/friends/fs-nonexist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should return 403 when not a participant', async () => {
      (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({
        id: 'fs-1',
        requesterId: 'someone-else',
        addresseeId: otherUserId,
      });

      const response = await request(app)
        .delete('/api/friends/fs-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.message).toContain('Not authorised');
    });
  });

  // ── POST /api/friends/:targetUserId/block ───────────────────────────────────

  describe('POST /api/friends/:targetUserId/block', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post(`/api/friends/${otherUserId}/block`);
      expect(response.status).toBe(401);
    });

    it('should block a user', async () => {
      (prisma.friendship.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.friendship.create as jest.Mock).mockResolvedValue({
        id: 'fs-block',
        requesterId: testUserId,
        addresseeId: otherUserId,
        status: 'blocked',
        addressee: { id: otherUserId, username: '@other' },
      });

      const response = await request(app)
        .post(`/api/friends/${otherUserId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.friendship.status).toBe('blocked');
      expect(prisma.friendship.deleteMany).toHaveBeenCalled();
      expect(redisModule.invalidateConversationCache).toHaveBeenCalledTimes(2);
    });

    it('should return 400 when trying to block self', async () => {
      const response = await request(app)
        .post(`/api/friends/${testUserId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('Cannot block yourself');
    });
  });

  // ── POST /api/friends/:targetUserId/unblock ─────────────────────────────────

  describe('POST /api/friends/:targetUserId/unblock', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post(`/api/friends/${otherUserId}/unblock`);
      expect(response.status).toBe(401);
    });

    it('should unblock a user', async () => {
      (prisma.friendship.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const response = await request(app)
        .post(`/api/friends/${otherUserId}/unblock`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(prisma.friendship.deleteMany).toHaveBeenCalled();
      expect(redisModule.invalidateConversationCache).toHaveBeenCalledTimes(2);
    });
  });

  // ── GET /api/friends/blocked ────────────────────────────────────────────────

  describe('GET /api/friends/blocked', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/friends/blocked');
      expect(response.status).toBe(401);
    });

    it('should return blocked users list', async () => {
      (prisma.friendship.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'fs-block-1',
          createdAt: new Date(),
          addressee: { id: otherUserId, username: '@blocked', displayName: 'Blocked User' },
        },
      ]);

      const response = await request(app)
        .get('/api/friends/blocked')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.blocked).toHaveLength(1);
      expect(response.body.blocked[0].user.id).toBe(otherUserId);
    });
  });

  // ── GET /api/friends/:targetUserId/block-status ─────────────────────────────

  describe('GET /api/friends/:targetUserId/block-status', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).get(`/api/friends/${otherUserId}/block-status`);
      expect(response.status).toBe(401);
    });

    it('should return blocked:false when no block exists', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/friends/${otherUserId}/block-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ blocked: false });
    });

    it('should return blocked:true with blockedByMe when I blocked them', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({
        requesterId: testUserId,
      });

      const response = await request(app)
        .get(`/api/friends/${otherUserId}/block-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ blocked: true, blockedByMe: true });
    });

    it('should return blocked:true with blockedByMe:false when they blocked me', async () => {
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({
        requesterId: otherUserId,
      });

      const response = await request(app)
        .get(`/api/friends/${otherUserId}/block-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({ blocked: true, blockedByMe: false });
    });
  });
});
