import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  getCachedConversations: jest.fn().mockResolvedValue(null),
  setCachedConversations: jest.fn().mockResolvedValue(undefined),
  invalidateConversationCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../lib/conversation', () => ({
  getConnectedUserIds: jest.fn().mockResolvedValue({ all: new Set(), friends: new Set() }),
}));

jest.mock('../lib/imageResize', () => ({
  processImageVariants: jest.fn().mockResolvedValue('http://localhost/uploads/profiles/test.jpg'),
  deleteImageVariants: jest.fn().mockResolvedValue(undefined),
  PROFILE_VARIANTS: [{ suffix: '-sm', width: 100 }],
  COVER_VARIANTS: [{ suffix: '-cover', width: 800 }],
}));

jest.mock('../lib/getConversations', () => ({
  getConversations: jest.fn().mockResolvedValue({ conversations: [], pending: [], requests: [] }),
}));

jest.mock('../services/summaryEngine', () => ({
  maybeRegenerateDMSummary: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

import usersRouter, { setUsersSocketIO } from '../routes/users';
import { isTokenBlacklisted, invalidateConversationCache } from '../lib/redis';
import { getConnectedUserIds } from '../lib/conversation';
import { processImageVariants, deleteImageVariants } from '../lib/imageResize';
import { getConversations } from '../lib/getConversations';

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

const testUserId = 'user-me-100';
const otherUserId = 'user-other-200';

function makeToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '24h' });
}

const authToken = makeToken(testUserId);
const noUserIdToken = jwt.sign({ username: '@ghost' }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

const mockUser = {
  id: testUserId,
  username: '@testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  profileImage: null,
  coverImage: null,
  emailVerified: true,
  phoneVerified: false,
  phoneNumber: null,
  createdAt: new Date('2025-01-01'),
  lastSeen: new Date(),
  gender: 'male',
  privacyOnlineStatus: 'everyone',
  privacyPhone: 'friends',
  privacyEmail: 'everyone',
  privacyFullName: 'everyone',
  privacyGender: 'nobody',
  privacyJoinedDate: 'everyone',
  isGuest: false,
  isBot: false,
};

describe('Users Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── GET /api/users ──────────────────────────────────────────────────────────

  describe('GET /api/users', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('should return list of verified users', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: testUserId, username: '@testuser', email: 'test@example.com', emailVerified: true, createdAt: new Date(), displayName: 'Test', firstName: null, lastName: null, profileImage: null },
        { id: otherUserId, username: '@other', email: 'other@example.com', emailVerified: true, createdAt: new Date(), displayName: 'Other', firstName: null, lastName: null, profileImage: null },
      ]);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(2);
      expect(res.body.users[0]).toHaveProperty('username');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { emailVerified: true } }),
      );
    });

    it('should return empty array when no verified users exist', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('db down'));

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  // ── GET /api/users/search ───────────────────────────────────────────────────

  describe('GET /api/users/search', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/users/search').query({ q: 'test' });
      expect(res.status).toBe(401);
    });

    it('should return empty users array for empty query', async () => {
      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: '' });

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should return empty users array when q is missing', async () => {
      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toEqual([]);
    });

    it('should search users with friendship overlay', async () => {
      const foundUsers = [
        { id: otherUserId, username: '@other', displayName: 'Other', firstName: null, lastName: null, profileImage: null, lastSeen: new Date(), isBot: false, isGuest: false },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(foundUsers);
      (prisma.friendship.findMany as jest.Mock).mockResolvedValue([
        { id: 'fs-1', requesterId: testUserId, addresseeId: otherUserId, status: 'accepted' },
      ]);

      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'other' });

      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(1);
      expect(res.body.users[0].isFriend).toBe(true);
      expect(res.body.users[0].friendship).toBeDefined();
      expect(res.body.users[0].friendship.status).toBe('accepted');
    });

    it('should sort friends before non-friends', async () => {
      const thirdUserId = 'user-third-300';
      const foundUsers = [
        { id: thirdUserId, username: '@alice', displayName: 'Alice', firstName: null, lastName: null, profileImage: null, lastSeen: new Date(), isBot: false, isGuest: false },
        { id: otherUserId, username: '@bob', displayName: 'Bob', firstName: null, lastName: null, profileImage: null, lastSeen: new Date(), isBot: false, isGuest: false },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(foundUsers);
      (prisma.friendship.findMany as jest.Mock).mockResolvedValue([
        { id: 'fs-2', requesterId: testUserId, addresseeId: otherUserId, status: 'accepted' },
      ]);

      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'a' });

      expect(res.status).toBe(200);
      expect(res.body.users[0].id).toBe(otherUserId);
      expect(res.body.users[0].isFriend).toBe(true);
      expect(res.body.users[1].id).toBe(thirdUserId);
      expect(res.body.users[1].isFriend).toBe(false);
    });

    it('should handle no friendships', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: otherUserId, username: '@other', displayName: 'Other', firstName: null, lastName: null, profileImage: null, lastSeen: new Date(), isBot: false, isGuest: false },
      ]);
      (prisma.friendship.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'other' });

      expect(res.status).toBe(200);
      expect(res.body.users[0].friendship).toBeNull();
      expect(res.body.users[0].isFriend).toBe(false);
    });

    it('should handle friendship where current user is addressee', async () => {
      const foundUsers = [
        { id: otherUserId, username: '@other', displayName: 'Other', firstName: null, lastName: null, profileImage: null, lastSeen: new Date(), isBot: false, isGuest: false },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(foundUsers);
      (prisma.friendship.findMany as jest.Mock).mockResolvedValue([
        { id: 'fs-rev', requesterId: otherUserId, addresseeId: testUserId, status: 'accepted' },
      ]);

      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'other' });

      expect(res.status).toBe(200);
      expect(res.body.users[0].isFriend).toBe(true);
      expect(res.body.users[0].friendship.iRequested).toBe(false);
    });

    it('should sort alphabetically within the same isFriend group', async () => {
      const foundUsers = [
        { id: 'user-z', username: '@zebra', displayName: 'Zebra', firstName: null, lastName: null, profileImage: null, lastSeen: new Date(), isBot: false, isGuest: false },
        { id: 'user-a', username: '@apple', displayName: 'Apple', firstName: null, lastName: null, profileImage: null, lastSeen: new Date(), isBot: false, isGuest: false },
      ];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(foundUsers);
      (prisma.friendship.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'a' });

      expect(res.status).toBe(200);
      expect(res.body.users[0].displayName).toBe('Apple');
      expect(res.body.users[1].displayName).toBe('Zebra');
    });

    it('should return 500 on database error', async () => {
      (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('db down'));

      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'x' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  // ── GET /api/users/conversations ────────────────────────────────────────────

  describe('GET /api/users/conversations', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/users/conversations');
      expect(res.status).toBe(401);
    });

    it('should return conversations from getConversations helper', async () => {
      const mockResult = {
        conversations: [{ id: 'conv-1', user: { id: otherUserId } }],
        pending: [],
        requests: [],
      };
      (getConversations as jest.Mock).mockResolvedValue(mockResult);

      const res = await request(app)
        .get('/api/users/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
      expect(getConversations).toHaveBeenCalledWith(testUserId);
    });

    it('should return 500 when getConversations throws', async () => {
      (getConversations as jest.Mock).mockRejectedValue(new Error('fail'));

      const res = await request(app)
        .get('/api/users/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  // ── GET /api/users/check-username ───────────────────────────────────────────

  describe('GET /api/users/check-username', () => {
    it('should return available=true for non-existent username', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/check-username')
        .query({ username: 'newuser' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ available: true });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: '@newuser' } });
    });

    it('should return available=false for existing username', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', username: '@taken' });

      const res = await request(app)
        .get('/api/users/check-username')
        .query({ username: 'taken' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ available: false });
    });

    it('should normalise username with @ prefix', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/check-username')
        .query({ username: '@newuser' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ available: true });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: '@newuser' } });
    });

    it('should return 400 when username is missing', async () => {
      const res = await request(app).get('/api/users/check-username');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Username is required');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return 400 when username is empty string', async () => {
      const res = await request(app)
        .get('/api/users/check-username')
        .query({ username: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Username is required');
    });

    it('should return 500 on database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .get('/api/users/check-username')
        .query({ username: 'fail' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });

    it('does not require authentication', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/check-username')
        .query({ username: 'noauth' });

      expect(res.status).toBe(200);
    });
  });

  // ── GET /api/users/suggest-username ─────────────────────────────────────────

  describe('GET /api/users/suggest-username', () => {
    it('should return 400 when username is missing', async () => {
      const res = await request(app).get('/api/users/suggest-username');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Username is required');
    });

    it('should return 400 when username is empty', async () => {
      const res = await request(app)
        .get('/api/users/suggest-username')
        .query({ username: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Username is required');
    });

    it('should return 3 suggestions when all available', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/suggest-username')
        .query({ username: 'john' });

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toHaveLength(3);
      res.body.suggestions.forEach((s: string) => {
        expect(s).toMatch(/^john/);
      });
    });

    it('should strip @ prefix before generating suggestions', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/suggest-username')
        .query({ username: '@alice' });

      expect(res.status).toBe(200);
      res.body.suggestions.forEach((s: string) => {
        expect(s).toMatch(/^alice/);
        expect(s).not.toMatch(/^@/);
      });
    });

    it('should skip duplicate suggestions via continue path', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      let callIdx = 0;
      const origRandom = Math.random;
      Math.random = () => {
        callIdx++;
        return callIdx <= 4 ? 0 : 0.99;
      };

      const res = await request(app)
        .get('/api/users/suggest-username')
        .query({ username: 'dup' });

      Math.random = origRandom;

      expect(res.status).toBe(200);
      expect(res.body.suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('should skip taken usernames and keep trying', async () => {
      let callCount = 0;
      (prisma.user.findUnique as jest.Mock).mockImplementation(() => {
        callCount++;
        // First 5 calls return taken, rest available
        return Promise.resolve(callCount <= 5 ? { id: 'x' } : null);
      });

      const res = await request(app)
        .get('/api/users/suggest-username')
        .query({ username: 'popular' });

      expect(res.status).toBe(200);
      expect(res.body.suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 500 on database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .get('/api/users/suggest-username')
        .query({ username: 'fail' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });

    it('does not require authentication', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/suggest-username')
        .query({ username: 'noauth' });

      expect(res.status).toBe(200);
    });
  });

  // ── GET /api/users/by-id/:userId ────────────────────────────────────────────

  describe('GET /api/users/by-id/:userId', () => {
    const targetUser = {
      id: otherUserId,
      username: '@other',
      displayName: 'Other User',
      firstName: 'Other',
      lastName: 'User',
      profileImage: 'http://img/pic.jpg',
      coverImage: null,
      lastSeen: new Date(),
      emailVerified: true,
      privacyPhone: 'everyone',
      privacyEmail: 'everyone',
      privacyFullName: 'everyone',
      privacyGender: 'everyone',
      privacyJoinedDate: 'everyone',
      phoneNumber: '+1234567890',
      email: 'other@example.com',
      gender: 'female',
      createdAt: new Date('2025-01-01'),
    };

    it('should return 401 without auth token', async () => {
      const res = await request(app).get(`/api/users/by-id/${otherUserId}`);
      expect(res.status).toBe(401);
    });

    it('should return 404 when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/by-id/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('should return blockedByThem when profile owner blocked viewer', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(targetUser);
      (prisma.friendship.findFirst as jest.Mock).mockResolvedValueOnce(
        { id: 'block-1', requesterId: otherUserId, addresseeId: testUserId, status: 'blocked' },
      );

      const res = await request(app)
        .get(`/api/users/by-id/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ blockedByThem: true });
    });

    it('should show all fields when privacy is set to "everyone"', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(targetUser);
      (prisma.friendship.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // no block
        .mockResolvedValueOnce(null); // not friends

      const res = await request(app)
        .get(`/api/users/by-id/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.firstName).toBe('Other');
      expect(res.body.user.lastName).toBe('User');
      expect(res.body.user.phoneNumber).toBe('+1234567890');
      expect(res.body.user.email).toBe('other@example.com');
      expect(res.body.user.gender).toBe('female');
      expect(res.body.user.createdAt).toBeDefined();
    });

    it('should show "friends"-level fields to an accepted friend', async () => {
      const friendsOnlyUser = {
        ...targetUser,
        privacyPhone: 'friends',
        privacyEmail: 'friends',
        privacyFullName: 'friends',
        privacyGender: 'friends',
        privacyJoinedDate: 'friends',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(friendsOnlyUser);
      (prisma.friendship.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // no block
        .mockResolvedValueOnce({ id: 'fs-1', requesterId: testUserId, addresseeId: otherUserId, status: 'accepted' });

      const res = await request(app)
        .get(`/api/users/by-id/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.firstName).toBe('Other');
      expect(res.body.user.phoneNumber).toBe('+1234567890');
      expect(res.body.user.email).toBe('other@example.com');
      expect(res.body.user.gender).toBe('female');
      expect(res.body.user.createdAt).toBeDefined();
    });

    it('should hide "friends"-level fields from non-friends', async () => {
      const friendsOnlyUser = {
        ...targetUser,
        privacyPhone: 'friends',
        privacyEmail: 'friends',
        privacyFullName: 'friends',
        privacyGender: 'friends',
        privacyJoinedDate: 'friends',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(friendsOnlyUser);
      (prisma.friendship.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // no block
        .mockResolvedValueOnce(null); // not friends

      const res = await request(app)
        .get(`/api/users/by-id/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.firstName).toBeUndefined();
      expect(res.body.user.lastName).toBeUndefined();
      expect(res.body.user.phoneNumber).toBeUndefined();
      expect(res.body.user.email).toBeUndefined();
      expect(res.body.user.gender).toBeUndefined();
      expect(res.body.user.createdAt).toBeUndefined();
    });

    it('should hide "nobody"-level fields from everyone', async () => {
      const nobodyUser = {
        ...targetUser,
        privacyPhone: 'nobody',
        privacyEmail: 'nobody',
        privacyFullName: 'nobody',
        privacyGender: 'nobody',
        privacyJoinedDate: 'nobody',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(nobodyUser);
      (prisma.friendship.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // no block
        .mockResolvedValueOnce({ id: 'fs-1', status: 'accepted', requesterId: testUserId, addresseeId: otherUserId });

      const res = await request(app)
        .get(`/api/users/by-id/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.firstName).toBeUndefined();
      expect(res.body.user.phoneNumber).toBeUndefined();
      expect(res.body.user.email).toBeUndefined();
      expect(res.body.user.gender).toBeUndefined();
      expect(res.body.user.createdAt).toBeUndefined();
      // Public fields still present
      expect(res.body.user.username).toBe('@other');
      expect(res.body.user.displayName).toBe('Other User');
    });

    it('should handle mixed privacy levels', async () => {
      const mixedUser = {
        ...targetUser,
        privacyFullName: 'everyone',
        privacyPhone: 'nobody',
        privacyEmail: 'friends',
        privacyGender: 'nobody',
        privacyJoinedDate: 'everyone',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mixedUser);
      (prisma.friendship.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)  // no block
        .mockResolvedValueOnce(null); // not friends

      const res = await request(app)
        .get(`/api/users/by-id/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.firstName).toBe('Other');     // everyone -> visible
      expect(res.body.user.phoneNumber).toBeUndefined();  // nobody -> hidden
      expect(res.body.user.email).toBeUndefined();        // friends, not friend -> hidden
      expect(res.body.user.gender).toBeUndefined();       // nobody -> hidden
      expect(res.body.user.createdAt).toBeDefined();      // everyone -> visible
    });

    it('should return 500 on database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .get(`/api/users/by-id/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  // ── GET /api/users/me ───────────────────────────────────────────────────────

  describe('GET /api/users/me', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('should return current authenticated user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testUserId);
      expect(res.body.username).toBe('@testuser');
      expect(res.body.email).toBe('test@example.com');
      expect(res.body.gender).toBe('male');
      expect(res.body.privacyOnlineStatus).toBe('everyone');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: testUserId } }),
      );
    });

    it('should return 404 when user not found in database', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('should return 403 for blacklisted token', async () => {
      (isTokenBlacklisted as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 401 when token has no userId', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${noUserIdToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('should return 500 on database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  // ── PUT /api/users/me ───────────────────────────────────────────────────────

  describe('PUT /api/users/me', () => {
    const updatedUser = {
      id: testUserId,
      username: '@testuser',
      displayName: 'New Name',
      firstName: 'New',
      lastName: 'Name',
      profileImage: null,
      coverImage: null,
      gender: 'male',
      email: 'test@example.com',
      phoneNumber: null,
    };

    it('should return 401 without auth token', async () => {
      const res = await request(app).put('/api/users/me').send({ displayName: 'X' });
      expect(res.status).toBe(401);
    });

    it('should update displayName', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ displayName: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe('New Name');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testUserId },
          data: expect.objectContaining({ displayName: 'New Name' }),
        }),
      );
    });

    it('should update firstName and lastName', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'New', lastName: 'Name' });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ firstName: 'New', lastName: 'Name' }),
        }),
      );
    });

    it('should update gender with valid value', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...updatedUser, gender: 'female' });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gender: 'female' });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should reject invalid gender value', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gender: 'invalid-value' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid gender value');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should accept all valid gender values', async () => {
      const validGenders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
      for (const gender of validGenders) {
        jest.clearAllMocks();
        (isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
        (prisma.user.update as jest.Mock).mockResolvedValue({ ...updatedUser, gender });

        const res = await request(app)
          .put('/api/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ gender });

        expect(res.status).toBe(200);
      }
    });

    it('should allow empty string gender (clears value)', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...updatedUser, gender: null });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gender: '' });

      expect(res.status).toBe(200);
    });

    it('should allow null gender', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...updatedUser, gender: null });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gender: null });

      expect(res.status).toBe(200);
    });

    it('should broadcast profile changes to connected users', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);
      (getConnectedUserIds as jest.Mock).mockResolvedValue({ all: new Set(['user-x']), friends: new Set() });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ displayName: 'New Name' });

      expect(res.status).toBe(200);
    });

    it('should broadcast via socket.io when _io is set', async () => {
      const mockTo = jest.fn().mockReturnValue({ emit: jest.fn() });
      const mockIo = { to: mockTo } as any;
      setUsersSocketIO(mockIo);

      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);
      (getConnectedUserIds as jest.Mock).mockResolvedValue({ all: new Set(['user-x']), friends: new Set() });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ displayName: 'New Name' });

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith('user:user-x');
      expect(invalidateConversationCache).toHaveBeenCalledWith('user-x');
      expect(invalidateConversationCache).toHaveBeenCalledWith(testUserId);

      setUsersSocketIO(null as any);
    });

    it('should still succeed when broadcast fails', async () => {
      const mockIo = { to: jest.fn().mockImplementation(() => { throw new Error('socket fail'); }) } as any;
      setUsersSocketIO(mockIo);

      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);
      (getConnectedUserIds as jest.Mock).mockResolvedValue({ all: new Set(['user-x']), friends: new Set() });

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ displayName: 'New Name' });

      expect(res.status).toBe(200);

      setUsersSocketIO(null as any);
    });

    it('should return 500 on database error', async () => {
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ displayName: 'X' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  // ── PUT /api/users/me/settings ──────────────────────────────────────────────

  describe('PUT /api/users/me/settings', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).put('/api/users/me/settings').send({ privacyPhone: 'nobody' });
      expect(res.status).toBe(401);
    });

    it('should update privacy settings', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ privacyPhone: 'nobody', privacyEmail: 'friends' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { privacyPhone: 'nobody', privacyEmail: 'friends' },
      });
    });

    it('should accept all valid privacy keys', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          privacyOnlineStatus: 'friends',
          privacyPhone: 'nobody',
          privacyEmail: 'everyone',
          privacyFullName: 'friends',
          privacyGender: 'nobody',
          privacyJoinedDate: 'everyone',
        });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: {
          privacyOnlineStatus: 'friends',
          privacyPhone: 'nobody',
          privacyEmail: 'everyone',
          privacyFullName: 'friends',
          privacyGender: 'nobody',
          privacyJoinedDate: 'everyone',
        },
      });
    });

    it('should reject invalid privacy level value', async () => {
      const res = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ privacyPhone: 'invalid-level' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No valid settings provided');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 400 with empty body', async () => {
      const res = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No valid settings provided');
    });

    it('should ignore unknown keys', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ unknownSetting: 'everyone', privacyPhone: 'nobody' });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { privacyPhone: 'nobody' },
      });
    });

    it('should return 500 on database error', async () => {
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .put('/api/users/me/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ privacyPhone: 'nobody' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  // ── GET /api/users/:username ────────────────────────────────────────────────

  describe('GET /api/users/:username', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/users/@testuser');
      expect(res.status).toBe(401);
    });

    it('should return user profile by username', async () => {
      const profile = {
        id: otherUserId,
        username: '@other',
        displayName: 'Other',
        firstName: 'O',
        lastName: 'U',
        profileImage: null,
        coverImage: null,
        lastSeen: new Date(),
        emailVerified: true,
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(profile);

      const res = await request(app)
        .get('/api/users/@other')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('@other');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { username: '@other' } }),
      );
    });

    it('should return 404 when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/@nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('should return 500 on database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .get('/api/users/@fail')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  // ── POST /api/users/profile-image ───────────────────────────────────────────

  describe('POST /api/users/profile-image', () => {
    const onePixelJpeg = Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAAAAAAf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+B/9k=',
      'base64',
    );

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/users/profile-image')
        .attach('profileImage', onePixelJpeg, 'test.jpg');
      expect(res.status).toBe(401);
    });

    it('should return 400 when no file uploaded', async () => {
      const res = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No file uploaded');
    });

    it('should upload profile image successfully', async () => {
      (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/profiles/new.jpg');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ profileImage: null });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (getConnectedUserIds as jest.Mock).mockResolvedValue({ all: new Set(), friends: new Set() });

      const res = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', onePixelJpeg, 'test.jpg');

      expect(res.status).toBe(200);
      expect(res.body.url).toBe('http://localhost/uploads/profiles/new.jpg');
      expect(processImageVariants).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testUserId },
          data: { profileImage: 'http://localhost/uploads/profiles/new.jpg' },
        }),
      );
    });

    it('should delete old profile image variants on replacement', async () => {
      (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/profiles/new.jpg');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ profileImage: 'http://localhost/uploads/profiles/old.jpg' });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (getConnectedUserIds as jest.Mock).mockResolvedValue({ all: new Set(), friends: new Set() });

      const res = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', onePixelJpeg, 'test.jpg');

      expect(res.status).toBe(200);
      expect(deleteImageVariants).toHaveBeenCalledWith('http://localhost/uploads/profiles/old.jpg', expect.any(Array));
    });

    it('should invalidate conversation caches on upload', async () => {
      (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/profiles/new.jpg');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ profileImage: null });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (getConnectedUserIds as jest.Mock).mockResolvedValue({ all: new Set(['user-x']), friends: new Set() });

      const res = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', onePixelJpeg, 'test.jpg');

      expect(res.status).toBe(200);
      expect(invalidateConversationCache).toHaveBeenCalledWith('user-x');
      expect(invalidateConversationCache).toHaveBeenCalledWith(testUserId);
    });

    it('should return 500 when database update fails', async () => {
      (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/profiles/new.jpg');
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', onePixelJpeg, 'test.jpg');

      expect(res.status).toBe(500);
    });

    it('should return 500 when database update rejects in inner catch', async () => {
      (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/profiles/new.jpg');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ profileImage: null });
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('db update'));

      const res = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', onePixelJpeg, 'test.jpg');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update database');
    });

    it('should return 500 when processImageVariants throws', async () => {
      (processImageVariants as jest.Mock).mockRejectedValue(new Error('sharp failure'));

      const res = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', onePixelJpeg, 'test.jpg');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Upload failed');
      expect(res.body.message).toBe('sharp failure');
    });

    it('should broadcast profile image via socket.io when _io is set', async () => {
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      const mockIo = { to: mockTo } as any;
      setUsersSocketIO(mockIo);

      (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/profiles/new.jpg');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ profileImage: null });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (getConnectedUserIds as jest.Mock).mockResolvedValue({ all: new Set(['user-x']), friends: new Set() });

      const res = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', onePixelJpeg, 'test.jpg');

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith('user:user-x');
      expect(mockEmit).toHaveBeenCalledWith('user:profileUpdate', expect.objectContaining({
        userId: testUserId,
        profileImage: 'http://localhost/uploads/profiles/new.jpg',
      }));

      setUsersSocketIO(null as any);
    });

    it('should return 401 when token has no userId', async () => {
      const res = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${noUserIdToken}`)
        .attach('profileImage', onePixelJpeg, 'test.jpg');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('should reject invalid file types via multer fileFilter', async () => {
      const res = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('fake-exe'), { filename: 'malware.exe', contentType: 'application/x-msdownload' });

      expect(res.status).toBe(500);
    });

    it('should still succeed when cache invalidation fails during profile image upload', async () => {
      const mockIo = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as any;
      setUsersSocketIO(mockIo);

      (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/profiles/new.jpg');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ profileImage: null });
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (getConnectedUserIds as jest.Mock).mockRejectedValue(new Error('redis fail'));

      const res = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', onePixelJpeg, 'test.jpg');

      expect(res.status).toBe(200);
      expect(res.body.url).toBe('http://localhost/uploads/profiles/new.jpg');

      setUsersSocketIO(null as any);
    });
  });

  // ── POST /api/users/cover-image ─────────────────────────────────────────────

  describe('POST /api/users/cover-image', () => {
    const onePixelJpeg = Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAAAAAAf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+B/9k=',
      'base64',
    );

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/users/cover-image')
        .attach('coverImage', onePixelJpeg, 'cover.jpg');
      expect(res.status).toBe(401);
    });

    it('should return 400 when no file uploaded', async () => {
      const res = await request(app)
        .post('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No file uploaded');
    });

    it('should upload cover image successfully', async () => {
      (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/covers/new.jpg');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ coverImage: null });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('coverImage', onePixelJpeg, 'cover.jpg');

      expect(res.status).toBe(200);
      expect(res.body.url).toBe('http://localhost/uploads/covers/new.jpg');
      expect(processImageVariants).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testUserId },
          data: { coverImage: 'http://localhost/uploads/covers/new.jpg' },
        }),
      );
    });

    it('should delete old cover image variants on replacement', async () => {
      (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/covers/new.jpg');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ coverImage: 'http://localhost/uploads/covers/old.jpg' });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('coverImage', onePixelJpeg, 'cover.jpg');

      expect(res.status).toBe(200);
      expect(deleteImageVariants).toHaveBeenCalledWith('http://localhost/uploads/covers/old.jpg', expect.any(Array));
    });

    it('should return 500 when database update fails', async () => {
      (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/covers/new.jpg');
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .post('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('coverImage', onePixelJpeg, 'cover.jpg');

      expect(res.status).toBe(500);
    });

    it('should return 500 when database update rejects in inner catch', async () => {
      (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/covers/new.jpg');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ coverImage: null });
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('db update'));

      const res = await request(app)
        .post('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('coverImage', onePixelJpeg, 'cover.jpg');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update database');
    });

    it('should return 401 when token has no userId', async () => {
      const res = await request(app)
        .post('/api/users/cover-image')
        .set('Authorization', `Bearer ${noUserIdToken}`)
        .attach('coverImage', onePixelJpeg, 'cover.jpg');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('should reject invalid file types via multer fileFilter', async () => {
      const res = await request(app)
        .post('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('coverImage', Buffer.from('fake-exe'), { filename: 'malware.exe', contentType: 'application/x-msdownload' });

      expect(res.status).toBe(500);
    });

    it('should return 500 when processImageVariants throws', async () => {
      (processImageVariants as jest.Mock).mockRejectedValue(new Error('sharp cover failure'));

      const res = await request(app)
        .post('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('coverImage', onePixelJpeg, 'cover.jpg');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Upload failed');
      expect(res.body.message).toBe('sharp cover failure');
    });
  });

  // ── DELETE /api/users/profile-image ─────────────────────────────────────────

  describe('DELETE /api/users/profile-image', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).delete('/api/users/profile-image');
      expect(res.status).toBe(401);
    });

    it('should delete profile image successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ profileImage: 'http://localhost/uploads/profiles/pic.jpg' });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .delete('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Profile image deleted successfully');
      expect(deleteImageVariants).toHaveBeenCalledWith('http://localhost/uploads/profiles/pic.jpg', expect.any(Array));
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { profileImage: null },
      });
    });

    it('should return success message when no profile image exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ profileImage: null });

      const res = await request(app)
        .delete('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('No profile image to delete');
      expect(deleteImageVariants).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 401 when token has no userId', async () => {
      const res = await request(app)
        .delete('/api/users/profile-image')
        .set('Authorization', `Bearer ${noUserIdToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('should return 500 on database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .delete('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Delete failed');
    });
  });

  // ── DELETE /api/users/cover-image ───────────────────────────────────────────

  describe('DELETE /api/users/cover-image', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).delete('/api/users/cover-image');
      expect(res.status).toBe(401);
    });

    it('should delete cover image successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ coverImage: 'http://localhost/uploads/covers/cover.jpg' });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .delete('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Cover image deleted successfully');
      expect(deleteImageVariants).toHaveBeenCalledWith('http://localhost/uploads/covers/cover.jpg', expect.any(Array));
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { coverImage: null },
      });
    });

    it('should return success message when no cover image exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ coverImage: null });

      const res = await request(app)
        .delete('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('No cover image to delete');
      expect(deleteImageVariants).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should return 401 when token has no userId', async () => {
      const res = await request(app)
        .delete('/api/users/cover-image')
        .set('Authorization', `Bearer ${noUserIdToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('should return 500 on database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('db'));

      const res = await request(app)
        .delete('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Delete failed');
    });
  });

  // ── Module-level directory initialization ──────────────────────────────────

  describe('Module initialization', () => {
    it('should create uploads directories when they do not exist', () => {
      const realFs = jest.requireActual('fs') as typeof import('fs');
      const existsSpy = jest.spyOn(realFs, 'existsSync').mockReturnValue(false);
      const mkdirSpy = jest.spyOn(realFs, 'mkdirSync').mockReturnValue(undefined as any);

      jest.isolateModules(() => {
        require('../routes/users');
      });

      const mkdirPaths = mkdirSpy.mock.calls.map(c => c[0] as string);
      expect(mkdirPaths.some(p => String(p).includes('profiles'))).toBe(true);
      expect(mkdirPaths.some(p => String(p).includes('covers'))).toBe(true);

      existsSpy.mockRestore();
      mkdirSpy.mockRestore();
    });
  });
});
