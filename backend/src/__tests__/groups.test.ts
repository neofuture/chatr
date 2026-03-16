import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

jest.mock('../services/waveform', () => ({
  generatePlaceholderWaveform: jest.fn(() => new Array(50).fill(0.5)),
  generateWaveformFromFile: jest.fn(() => Promise.resolve({ waveform: new Array(50).fill(0.5), duration: 5.0 })),
}));

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock('../services/summaryEngine', () => ({
  maybeRegenerateGroupSummary: jest.fn(),
}));

jest.mock('../lib/imageResize', () => ({
  processImageVariants: jest.fn().mockResolvedValue('http://localhost/uploads/group-profiles/test.jpg'),
  deleteImageVariants: jest.fn().mockResolvedValue(undefined),
  PROFILE_VARIANTS: [{ suffix: '-sm', width: 100 }],
  COVER_VARIANTS: [{ suffix: '-cover', width: 800 }],
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

import groupsRouter, { setGroupsSocketIO } from '../routes/groups';
import { isTokenBlacklisted } from '../lib/redis';
import { processImageVariants, deleteImageVariants } from '../lib/imageResize';
import { generatePlaceholderWaveform, generateWaveformFromFile } from '../services/waveform';

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use('/api/groups', groupsRouter);

const testUserId = 'user-1';
const otherUserId = 'user-2';
const thirdUserId = 'user-3';
const testGroupId = 'group-1';

function makeToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '24h' });
}

const authToken = makeToken(testUserId);

const mockGroup = {
  id: testGroupId,
  name: 'Test Group',
  description: 'A test group',
  ownerId: testUserId,
  profileImage: null,
  coverImage: null,
  summary: null,
  summaryMessageCount: 0,
  summaryGeneratedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOwnerMember = {
  id: 'member-1',
  userId: testUserId,
  groupId: testGroupId,
  role: 'owner',
  status: 'accepted',
  invitedBy: null,
  joinedAt: new Date(),
  user: { id: testUserId, username: '@testuser', displayName: 'Test User', profileImage: null },
};

const mockAdminMember = {
  id: 'member-2',
  userId: otherUserId,
  groupId: testGroupId,
  role: 'admin',
  status: 'accepted',
  invitedBy: testUserId,
  joinedAt: new Date(),
  user: { id: otherUserId, username: '@other', displayName: 'Other User', profileImage: null },
};

const mockRegularMember = {
  id: 'member-3',
  userId: thirdUserId,
  groupId: testGroupId,
  role: 'member',
  status: 'accepted',
  invitedBy: testUserId,
  joinedAt: new Date(),
  user: { id: thirdUserId, username: '@third', displayName: 'Third User', profileImage: null },
};

const mockPendingMember = {
  id: 'member-4',
  userId: otherUserId,
  groupId: testGroupId,
  role: 'member',
  status: 'pending',
  invitedBy: testUserId,
  joinedAt: new Date(),
  user: { id: otherUserId, username: '@other', displayName: 'Other User', profileImage: null },
};

const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
const mockIo = { to: mockTo } as any;

describe('Group Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setGroupsSocketIO(mockIo);
    mockTo.mockReturnValue({ emit: mockEmit });
    (isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
    (processImageVariants as jest.Mock).mockResolvedValue('http://localhost/uploads/group-profiles/test.jpg');
    (deleteImageVariants as jest.Mock).mockResolvedValue(undefined);
    (prisma.$transaction as jest.Mock).mockImplementation((fns: any[]) => Promise.all(fns));
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([]);
    (generatePlaceholderWaveform as jest.Mock).mockReturnValue(new Array(50).fill(0.5));
  });

  // ── POST /api/groups ─────────────────────────────────────────────────────
  describe('POST /api/groups', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).post('/api/groups').send({ name: 'G' });
      expect(res.status).toBe(401);
    });

    it('should create a group successfully', async () => {
      const createdGroup = {
        ...mockGroup,
        members: [{ ...mockOwnerMember, status: 'accepted' }],
      };
      (prisma.group.create as jest.Mock).mockResolvedValue(createdGroup);

      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Group', description: 'desc' });

      expect(res.status).toBe(200);
      expect(res.body.group.name).toBe('Test Group');
      expect(prisma.group.create).toHaveBeenCalled();
    });

    it('should create group with memberIds and filter out creator', async () => {
      const createdGroup = {
        ...mockGroup,
        members: [
          { ...mockOwnerMember, status: 'accepted' },
          { ...mockPendingMember, status: 'pending' },
        ],
      };
      (prisma.group.create as jest.Mock).mockResolvedValue(createdGroup);

      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'G', memberIds: [testUserId, otherUserId] });

      expect(res.status).toBe(200);
      // Response should only contain accepted members
      expect(res.body.group.members).toHaveLength(1);
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name/i);
    });

    it('should return 400 if name is blank', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
    });

    it('should return 500 on database error', async () => {
      (prisma.group.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'G' });

      expect(res.status).toBe(500);
    });
  });

  // ── GET /api/groups ──────────────────────────────────────────────────────
  describe('GET /api/groups', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/groups');
      expect(res.status).toBe(401);
    });

    it('should list groups for the user', async () => {
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([
        {
          group: {
            ...mockGroup,
            members: [mockOwnerMember],
            messages: [{ id: 'msg-1', content: 'hi', sender: { displayName: 'A', username: '@a' } }],
          },
        },
      ]);

      const res = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.groups).toHaveLength(1);
      expect(res.body.groups[0].lastMessage).toBeDefined();
    });

    it('should return empty array when user has no groups', async () => {
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.groups).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findMany as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── GET /api/groups/invites ──────────────────────────────────────────────
  describe('GET /api/groups/invites', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/groups/invites');
      expect(res.status).toBe(401);
    });

    it('should list pending invites', async () => {
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([
        {
          groupId: testGroupId,
          invitedBy: otherUserId,
          group: { name: 'G', description: null, members: [{ userId: otherUserId }] },
        },
      ]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: otherUserId, displayName: 'Other', username: '@other' },
      ]);

      const res = await request(app)
        .get('/api/groups/invites')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.invites).toHaveLength(1);
      expect(res.body.invites[0].invitedBy).toBe('Other');
    });

    it('should handle invites with no invitedBy', async () => {
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([
        {
          groupId: testGroupId,
          invitedBy: null,
          group: { name: 'G', description: null, members: [] },
        },
      ]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/groups/invites')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.invites[0].invitedBy).toBe('Someone');
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findMany as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .get('/api/groups/invites')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /api/groups/:id/accept ──────────────────────────────────────────
  describe('POST /api/groups/:id/accept', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).post(`/api/groups/${testGroupId}/accept`);
      expect(res.status).toBe(401);
    });

    it('should accept a pending invite', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockPendingMember, userId: testUserId, status: 'pending', invitedBy: otherUserId });
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
      const groupWithMembers = {
        ...mockGroup,
        members: [{ ...mockOwnerMember }],
      };
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(groupWithMembers);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ displayName: 'Test', username: '@test' });
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sys-msg', createdAt: new Date() });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/accept`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.group).toBeDefined();
    });

    it('should return 404 if invite not found', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/accept`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 if already a member', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockOwnerMember, status: 'accepted' });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/accept`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already/i);
    });

    it('should broadcast system message via socket on accept', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'pending', invitedBy: otherUserId });
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [{ ...mockOwnerMember }, { ...mockAdminMember, userId: testUserId }],
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ displayName: 'Test', username: '@test' });
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sys-msg', createdAt: new Date() });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: otherUserId, status: 'accepted' }]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/accept`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(mockEmit).toHaveBeenCalledWith('group:created', expect.any(Object));
      expect(mockEmit).toHaveBeenCalledWith('group:inviteAccepted', expect.any(Object));
      expect(mockEmit).toHaveBeenCalledWith('group:message', expect.objectContaining({ type: 'system' }));
    });

    it('should return 404 if group deleted after accepting', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'pending', invitedBy: null });
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/accept`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/accept`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /api/groups/:id/decline ─────────────────────────────────────────
  describe('POST /api/groups/:id/decline', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).post(`/api/groups/${testGroupId}/decline`);
      expect(res.status).toBe(401);
    });

    it('should decline a pending invite', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'pending', invitedBy: null });
      (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/decline`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 if invite not found', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/decline`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 if already accepted', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'accepted' });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/decline`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/leave/i);
    });

    it('should emit inviteDeclined when invitedBy is set', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'pending', invitedBy: otherUserId });
      (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ name: 'Test Group' });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/decline`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith(`user:${otherUserId}`);
      expect(mockEmit).toHaveBeenCalledWith('group:inviteDeclined', expect.objectContaining({ groupId: testGroupId }));
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/decline`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── GET /api/groups/:id ──────────────────────────────────────────────────
  describe('GET /api/groups/:id', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get(`/api/groups/${testGroupId}`);
      expect(res.status).toBe(401);
    });

    it('should return group details for a member', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [mockOwnerMember, mockAdminMember],
      });

      const res = await request(app)
        .get(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.group.name).toBe('Test Group');
      expect(res.body.memberStatus).toBe('accepted');
    });

    it('should return 404 if group not found', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/groups/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 if not a member', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [{ ...mockAdminMember, userId: 'someone-else' }],
      });

      const res = await request(app)
        .get(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 500 on database error', async () => {
      (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .get(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── GET /api/groups/:id/messages ─────────────────────────────────────────
  describe('GET /api/groups/:id/messages', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get(`/api/groups/${testGroupId}/messages`);
      expect(res.status).toBe(401);
    });

    it('should return messages for accepted member', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockOwnerMember, status: 'accepted' });
      (prisma.groupMessage.findMany as jest.Mock).mockResolvedValue([
        { id: 'msg-1', content: 'hello', deletedAt: null, sender: { displayName: 'A' } },
      ]);

      const res = await request(app)
        .get(`/api/groups/${testGroupId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
    });

    it('should redact deleted messages', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockOwnerMember, status: 'accepted' });
      (prisma.groupMessage.findMany as jest.Mock).mockResolvedValue([
        { id: 'msg-del', content: 'secret', deletedAt: new Date(), fileUrl: '/file', fileName: 'f', fileSize: 100, fileType: 'image/png', audioWaveform: [1], audioDuration: 3, linkPreview: 'lp', sender: {} },
      ]);

      const res = await request(app)
        .get(`/api/groups/${testGroupId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const msg = res.body.messages[0];
      expect(msg.content).toBe('');
      expect(msg.fileUrl).toBeNull();
      expect(msg.unsent).toBe(true);
    });

    it('should support pagination with before parameter', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'accepted' });
      (prisma.groupMessage.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get(`/api/groups/${testGroupId}/messages?before=2024-01-01T00:00:00Z&limit=10`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(prisma.groupMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should cap limit at 100', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'accepted' });
      (prisma.groupMessage.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get(`/api/groups/${testGroupId}/messages?limit=999`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(prisma.groupMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should return 403 if not a member', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/groups/${testGroupId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 403 if member is pending', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'pending' });

      const res = await request(app)
        .get(`/api/groups/${testGroupId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/invite/i);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .get(`/api/groups/${testGroupId}/messages`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /api/groups/:id/members ─────────────────────────────────────────
  describe('POST /api/groups/:id/members', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).post(`/api/groups/${testGroupId}/members`).send({ memberId: otherUserId });
      expect(res.status).toBe(401);
    });

    it('should add member as admin', async () => {
      (prisma.group.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockGroup)
        .mockResolvedValueOnce({ ...mockGroup, name: 'G', members: [mockOwnerMember] });
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.groupMember.create as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ memberId: otherUserId });

      expect(res.status).toBe(200);
      expect(prisma.groupMember.create).toHaveBeenCalled();
    });

    it('should return 404 if group not found', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ memberId: otherUserId });

      expect(res.status).toBe(404);
    });

    it('should return 403 if caller is not admin', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup);
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockRegularMember, userId: testUserId, role: 'member' });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ memberId: otherUserId });

      expect(res.status).toBe(403);
    });

    it('should return 403 if caller has no membership', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup);
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ memberId: otherUserId });

      expect(res.status).toBe(403);
    });

    it('should return 409 if user already a member (P2002)', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup);
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      const err: any = new Error('Unique constraint');
      err.code = 'P2002';
      (prisma.groupMember.create as jest.Mock).mockRejectedValue(err);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ memberId: otherUserId });

      expect(res.status).toBe(409);
    });

    it('should return 500 on generic error', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup);
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.groupMember.create as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ memberId: otherUserId });

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /api/groups/:id/members/:memberId ─────────────────────────────
  describe('DELETE /api/groups/:id/members/:memberId', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).delete(`/api/groups/${testGroupId}/members/${otherUserId}`);
      expect(res.status).toBe(401);
    });

    it('should allow owner to remove a regular member', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [mockOwnerMember, { ...mockRegularMember, userId: otherUserId }],
      });
      (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sys', createdAt: new Date() });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow member to leave (self-remove)', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [
          { ...mockOwnerMember, userId: 'someone-else' },
          { ...mockRegularMember, userId: testUserId, role: 'member' },
        ],
      });
      (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ userId: 'someone-else' });
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sys', createdAt: new Date() });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 if group not found', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 if target member not found', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [mockOwnerMember],
      });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/member not found/i);
    });

    it('should return 403 if regular member tries to remove another', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [
          { ...mockRegularMember, userId: testUserId, role: 'member' },
          { ...mockRegularMember, userId: otherUserId, role: 'member' },
        ],
      });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 403 if trying to remove an owner', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [
          { ...mockAdminMember, userId: testUserId, role: 'admin' },
          { ...mockOwnerMember, userId: otherUserId, role: 'owner' },
        ],
      });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/owner/i);
    });

    it('should return 403 if admin tries to remove another admin', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [
          { ...mockAdminMember, userId: testUserId, role: 'admin' },
          { ...mockAdminMember, userId: otherUserId, role: 'admin' },
        ],
      });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/owners can remove admins/i);
    });

    it('should skip system message for pending member removal', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [
          mockOwnerMember,
          { ...mockPendingMember, userId: otherUserId, status: 'pending' },
        ],
      });
      (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(prisma.groupMessage.create).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── PATCH /api/groups/:id ────────────────────────────────────────────────
  describe('PATCH /api/groups/:id', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).patch(`/api/groups/${testGroupId}`).send({ name: 'New' });
      expect(res.status).toBe(401);
    });

    it('should update group name and description', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.update as jest.Mock).mockResolvedValue({
        ...mockGroup,
        name: 'Updated',
        description: 'New desc',
        members: [mockOwnerMember],
      });

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated', description: 'New desc' });

      expect(res.status).toBe(200);
      expect(res.body.group.name).toBe('Updated');
    });

    it('should clear description when set to empty string', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.update as jest.Mock).mockResolvedValue({
        ...mockGroup,
        description: null,
        members: [],
      });

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: '' });

      expect(res.status).toBe(200);
    });

    it('should return 403 if not admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockRegularMember, userId: testUserId, role: 'member' });

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hack' });

      expect(res.status).toBe(403);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.update as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'X' });

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /api/groups/:id ───────────────────────────────────────────────
  describe('DELETE /api/groups/:id', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).delete(`/api/groups/${testGroupId}`);
      expect(res.status).toBe(401);
    });

    it('should delete group as owner', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [mockOwnerMember],
      });
      (prisma.groupMessage.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.group.delete as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.group.delete).toHaveBeenCalledWith({ where: { id: testGroupId } });
    });

    it('should clean up local files of group messages', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [mockOwnerMember],
      });
      (prisma.groupMessage.findMany as jest.Mock).mockResolvedValue([
        { fileUrl: 'http://localhost:3001/uploads/messages/file.jpg' },
      ]);
      (prisma.group.delete as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 if group not found', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 403 if not owner', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [{ ...mockAdminMember, userId: testUserId, role: 'admin' }],
      });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 500 on database error', async () => {
      (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /api/groups/:id/join ────────────────────────────────────────────
  describe('POST /api/groups/:id/join', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).post(`/api/groups/${testGroupId}/join`);
      expect(res.status).toBe(401);
    });

    it('should join a group successfully', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup);
      (prisma.groupMember.upsert as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.groupMember.upsert).toHaveBeenCalled();
    });

    it('should return 404 if group not found', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /api/groups/:id/leave ───────────────────────────────────────────
  describe('POST /api/groups/:id/leave', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).post(`/api/groups/${testGroupId}/leave`);
      expect(res.status).toBe(401);
    });

    it('should leave a group (non-owner, other members remain)', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [
          { ...mockOwnerMember, userId: otherUserId },
          { ...mockRegularMember, userId: testUserId, role: 'member' },
        ],
      });
      (prisma.groupMember.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ userId: otherUserId });
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sys', createdAt: new Date() });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.deleted).toBe(false);
    });

    it('should delete group if last member leaves', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [{ ...mockOwnerMember, userId: testUserId }],
      });
      (prisma.group.delete as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
      expect(prisma.group.delete).toHaveBeenCalled();
    });

    it('should promote next owner when owner leaves and no other owners exist', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [
          { ...mockOwnerMember, userId: testUserId, role: 'owner' },
          { ...mockAdminMember, userId: otherUserId, role: 'admin' },
        ],
      });
      (prisma.groupMember.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // no remaining owners
        .mockResolvedValueOnce({ id: 'member-2', userId: otherUserId, role: 'admin' }) // next candidate
        .mockResolvedValueOnce({ userId: otherUserId }); // sendSystemMessage owner lookup
      (prisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);
      (prisma.groupMember.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sys', createdAt: new Date() });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(prisma.groupMember.findFirst).toHaveBeenCalled();
    });

    it('should return 404 if group not found', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── PATCH /api/groups/:id/members/:memberId/promote ──────────────────────
  describe('PATCH /api/groups/:id/members/:memberId/promote', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).patch(`/api/groups/${testGroupId}/members/${otherUserId}/promote`);
      expect(res.status).toBe(401);
    });

    it('should promote a member to admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember) // caller is owner
        .mockResolvedValueOnce({ ...mockRegularMember, id: 'target-id', userId: otherUserId, role: 'member' }); // target
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/promote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.groupMember.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: 'admin' } }),
      );
    });

    it('should return 403 if caller is not admin/owner', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockRegularMember, userId: testUserId, role: 'member' });

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/promote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 403 if caller has no membership', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/promote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 if target member not found', async () => {
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember) // caller
        .mockResolvedValueOnce(null); // target not found

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/promote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/promote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── PATCH /api/groups/:id/members/:memberId/demote ───────────────────────
  describe('PATCH /api/groups/:id/members/:memberId/demote', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).patch(`/api/groups/${testGroupId}/members/${otherUserId}/demote`);
      expect(res.status).toBe(401);
    });

    it('should allow owner to demote an admin', async () => {
      // isGroupOwner check
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember) // isGroupOwner -> owner
        .mockResolvedValueOnce({ ...mockAdminMember, id: 'target-id', role: 'admin' }); // target
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/demote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.groupMember.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: 'member' } }),
      );
    });

    it('should allow admin to demote themselves', async () => {
      const adminToken = makeToken(otherUserId);
      // isGroupOwner for otherUserId -> not owner
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockAdminMember, role: 'admin' }) // isGroupOwner -> not owner
        .mockResolvedValueOnce({ ...mockAdminMember, id: 'self-id', role: 'admin' }); // target is self
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/demote`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 403 if non-owner tries to demote another member', async () => {
      // isGroupOwner for caller -> not owner (role=admin)
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockAdminMember, userId: testUserId, role: 'admin' });

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/demote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 if target not found', async () => {
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember) // isGroupOwner
        .mockResolvedValueOnce(null); // target

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/demote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 if trying to demote an owner', async () => {
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember) // isGroupOwner
        .mockResolvedValueOnce({ ...mockOwnerMember, userId: otherUserId, role: 'owner' }); // target is owner

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/demote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/step-down/i);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/demote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── POST /api/groups/:id/transfer-ownership ──────────────────────────────
  describe('POST /api/groups/:id/transfer-ownership', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).post(`/api/groups/${testGroupId}/transfer-ownership`).send({ newOwnerId: otherUserId });
      expect(res.status).toBe(401);
    });

    it('should transfer ownership to an admin', async () => {
      // isGroupOwner
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember) // isGroupOwner -> owner
        .mockResolvedValueOnce({ ...mockAdminMember, id: 'target-id', role: 'admin' }); // target is admin
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/transfer-ownership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newOwnerId: otherUserId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 if newOwnerId is missing', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/transfer-ownership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 403 if caller is not owner', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockAdminMember, userId: testUserId, role: 'admin' });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/transfer-ownership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newOwnerId: otherUserId });

      expect(res.status).toBe(403);
    });

    it('should return 404 if target member not found', async () => {
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember) // isGroupOwner
        .mockResolvedValueOnce(null); // target not found

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/transfer-ownership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newOwnerId: otherUserId });

      expect(res.status).toBe(404);
    });

    it('should return 400 if target is already owner', async () => {
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember) // isGroupOwner
        .mockResolvedValueOnce({ ...mockOwnerMember, userId: otherUserId, role: 'owner' });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/transfer-ownership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newOwnerId: otherUserId });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already an owner/i);
    });

    it('should return 400 if target is not admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember) // isGroupOwner
        .mockResolvedValueOnce({ ...mockRegularMember, userId: otherUserId, role: 'member' });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/transfer-ownership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newOwnerId: otherUserId });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/admins/i);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/transfer-ownership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newOwnerId: otherUserId });

      expect(res.status).toBe(500);
    });
  });

  // ── POST /api/groups/:id/step-down ───────────────────────────────────────
  describe('POST /api/groups/:id/step-down', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).post(`/api/groups/${testGroupId}/step-down`);
      expect(res.status).toBe(401);
    });

    it('should step down from owner to admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockOwnerMember, id: 'caller-id' });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([
        { ...mockOwnerMember, userId: otherUserId, role: 'owner' },
      ]);
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/step-down`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.groupMember.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: 'admin' } }),
      );
    });

    it('should return 403 if not owner', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockAdminMember, userId: testUserId, role: 'admin' });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/step-down`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 403 if no membership', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/step-down`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 400 if only owner', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockOwnerMember, id: 'caller-id' });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/step-down`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/only owner/i);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/step-down`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /api/groups/:id/profile-image ───────────────────────────────
  describe('DELETE /api/groups/:id/profile-image', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).delete(`/api/groups/${testGroupId}/profile-image`);
      expect(res.status).toBe(401);
    });

    it('should delete profile image as admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ profileImage: 'http://old.jpg' });
      (prisma.group.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/profile-image`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(deleteImageVariants).toHaveBeenCalled();
    });

    it('should succeed even if no profile image exists', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ profileImage: null });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/profile-image`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(prisma.group.update).not.toHaveBeenCalled();
    });

    it('should return 403 if not admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockRegularMember, userId: testUserId, role: 'member' });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/profile-image`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/profile-image`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── DELETE /api/groups/:id/cover-image ─────────────────────────────────
  describe('DELETE /api/groups/:id/cover-image', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).delete(`/api/groups/${testGroupId}/cover-image`);
      expect(res.status).toBe(401);
    });

    it('should delete cover image as admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ coverImage: 'http://old-cover.jpg' });
      (prisma.group.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/cover-image`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(deleteImageVariants).toHaveBeenCalled();
    });

    it('should succeed even if no cover image exists', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ coverImage: null });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/cover-image`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(prisma.group.update).not.toHaveBeenCalled();
    });

    it('should return 403 if not admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockRegularMember, userId: testUserId, role: 'member' });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/cover-image`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/cover-image`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
    });
  });

  // ── PATCH /api/groups/:id/messages/:msgId/waveform ───────────────────────
  describe('PATCH /api/groups/:id/messages/:msgId/waveform', () => {
    const msgId = 'msg-1';
    const waveform = new Array(50).fill(0.5);

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/messages/${msgId}/waveform`)
        .send({ waveform, duration: 5 });
      expect(res.status).toBe(401);
    });

    it('should update waveform for a group message', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.groupMessage.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/messages/${msgId}/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ waveform, duration: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.groupMessage.update).toHaveBeenCalledWith({
        where: { id: msgId },
        data: { audioWaveform: waveform, audioDuration: 5 },
      });
    });

    it('should return 403 if not a member', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/messages/${msgId}/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ waveform, duration: 5 });

      expect(res.status).toBe(403);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/messages/${msgId}/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ waveform, duration: 5 });

      expect(res.status).toBe(500);
    });
  });

  // ── POST /api/groups/:id/upload ─────────────────────────────────────────
  describe('POST /api/groups/:id/upload', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .attach('file', Buffer.from('data'), { filename: 'test.jpg', contentType: 'image/jpeg' });
      expect(res.status).toBe(401);
    });

    it('should return 400 if no file uploaded', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(400);
    });

    it('should upload an image to a group', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ ...mockOwnerMember, status: 'accepted' });
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({
        id: 'gm-1', groupId: testGroupId, senderId: testUserId, content: 'photo.jpg',
        type: 'image', createdAt: new Date(),
        sender: mockOwnerMember.user,
      });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([mockOwnerMember]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('img'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .field('type', 'image');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.fileName).toBe('photo.jpg');
      expect(res.body.fileType).toBe('image/jpeg');
    });

    it('should upload audio with placeholder waveform', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ ...mockOwnerMember, status: 'accepted' });
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({
        id: 'gm-2', groupId: testGroupId, senderId: testUserId, content: 'Voice message',
        type: 'audio', createdAt: new Date(),
        sender: mockOwnerMember.user,
      });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([mockOwnerMember]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('audio'), { filename: 'voice.webm', contentType: 'audio/webm' });

      expect(res.status).toBe(200);
      expect(res.body.needsWaveformGeneration).toBe(true);
      expect(res.body.waveform).toHaveLength(50);
    });

    it('should use client waveform and duration if provided', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ ...mockOwnerMember, status: 'accepted' });
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({
        id: 'gm-3', groupId: testGroupId, senderId: testUserId,
        type: 'audio', createdAt: new Date(), sender: mockOwnerMember.user,
      });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([mockOwnerMember]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('audio'), { filename: 'voice.webm', contentType: 'audio/webm' })
        .field('waveform', JSON.stringify([0.1, 0.2, 0.3]))
        .field('duration', '15.5');

      expect(res.status).toBe(200);
      expect(res.body.needsWaveformGeneration).toBe(false);
      expect(res.body.duration).toBe(15.5);
    });

    it('should handle invalid waveform JSON gracefully', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ ...mockOwnerMember, status: 'accepted' });
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({
        id: 'gm-w', groupId: testGroupId, senderId: testUserId,
        type: 'audio', createdAt: new Date(), sender: mockOwnerMember.user,
      });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('audio'), { filename: 'voice.webm', contentType: 'audio/webm' })
        .field('waveform', 'not-json');

      expect(res.status).toBe(200);
      expect(res.body.needsWaveformGeneration).toBe(true);
    });

    it('should upload a video', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ ...mockOwnerMember, status: 'accepted' });
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({
        id: 'gm-4', groupId: testGroupId, senderId: testUserId, content: 'clip.mp4',
        type: 'video', createdAt: new Date(), sender: mockOwnerMember.user,
      });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([mockOwnerMember]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('video'), { filename: 'clip.mp4', contentType: 'video/mp4' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should use caption when provided', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ ...mockOwnerMember, status: 'accepted' });
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({
        id: 'gm-5', groupId: testGroupId, senderId: testUserId, content: 'My caption',
        type: 'image', createdAt: new Date(), sender: mockOwnerMember.user,
      });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('img'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .field('type', 'image')
        .field('caption', 'My caption');

      expect(res.status).toBe(200);
      expect(prisma.groupMessage.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ content: 'My caption' }),
      }));
    });

    it('should return 403 if not a member', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('img'), { filename: 'test.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(403);
    });

    it('should return 403 if member not accepted', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ ...mockPendingMember, status: 'pending' });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('img'), { filename: 'test.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(403);
    });

    it('should return 500 on database error', async () => {
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ ...mockOwnerMember, status: 'accepted' });
      (prisma.groupMessage.create as jest.Mock).mockRejectedValue(new Error('DB'));

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('img'), { filename: 'test.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(500);
    });
  });

  // ── POST /api/groups/:id/profile-image ──────────────────────────────────
  describe('POST /api/groups/:id/profile-image', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/profile-image`)
        .attach('profileImage', Buffer.from('img'), { filename: 'avatar.jpg', contentType: 'image/jpeg' });
      expect(res.status).toBe(401);
    });

    it('should return 400 if no file uploaded', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/profile-image`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(400);
    });

    it('should upload profile image as admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ profileImage: null });
      (prisma.group.update as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([mockOwnerMember]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/profile-image`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('img'), { filename: 'avatar.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(200);
      expect(res.body.url).toBeDefined();
      expect(processImageVariants).toHaveBeenCalled();
    });

    it('should delete old profile image when uploading new one', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ profileImage: 'http://old.jpg' });
      (prisma.group.update as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([mockOwnerMember]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/profile-image`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('img'), { filename: 'avatar.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(200);
      expect(deleteImageVariants).toHaveBeenCalled();
    });

    it('should return 403 if not admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockRegularMember, userId: testUserId, role: 'member' });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/profile-image`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('img'), { filename: 'avatar.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(403);
    });

    it('should return 500 on error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (processImageVariants as jest.Mock).mockRejectedValue(new Error('resize error'));

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/profile-image`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('profileImage', Buffer.from('img'), { filename: 'avatar.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(500);
    });
  });

  // ── Coverage: socket emission branches ─────────────────────────────────

  describe('Socket emission coverage', () => {
    it('should emit memberJoined to other members on accept (line 282)', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'pending', invitedBy: null });
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [
          { ...mockAdminMember, userId: otherUserId, role: 'owner', user: { id: otherUserId, username: '@other', displayName: 'Other', profileImage: null } },
          { id: 'gm-accept', userId: testUserId, role: 'member', user: { id: testUserId, username: '@testuser', displayName: 'Test User', profileImage: null } },
        ],
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ displayName: 'Test', username: '@test' });
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ userId: otherUserId });
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sys-msg', createdAt: new Date() });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: otherUserId }]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/accept`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith(`user:${otherUserId}`);
      expect(mockEmit).toHaveBeenCalledWith('group:memberJoined', expect.objectContaining({ groupId: testGroupId, userId: testUserId }));
    });

    it('should emit memberLeft to remaining members on removal (line 503)', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [mockOwnerMember, { ...mockRegularMember, userId: otherUserId, role: 'member' }],
      });
      (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId, status: 'accepted' }]);
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sys', createdAt: new Date() });

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${otherUserId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith(`user:${testUserId}`);
      expect(mockEmit).toHaveBeenCalledWith('group:memberLeft', { groupId: testGroupId, memberId: otherUserId });
    });

    it('should emit memberJoined to all members on join (line 648)', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue(mockGroup);
      (prisma.groupMember.upsert as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: testUserId, username: '@testuser', displayName: 'Test', profileImage: null });
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ id: 'gm1', userId: testUserId, role: 'member' });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }, { userId: otherUserId }]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/join`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith(`user:${otherUserId}`);
      expect(mockEmit).toHaveBeenCalledWith('group:memberJoined', expect.objectContaining({ groupId: testGroupId, userId: testUserId }));
    });

    it('should emit memberLeft to remaining members on leave (line 706)', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [
          { ...mockOwnerMember, userId: otherUserId },
          { ...mockRegularMember, userId: testUserId, role: 'member' },
        ],
      });
      (prisma.groupMember.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: otherUserId, status: 'accepted' }]);
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ userId: otherUserId });
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sys', createdAt: new Date() });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith(`user:${otherUserId}`);
      expect(mockEmit).toHaveBeenCalledWith('group:memberLeft', { groupId: testGroupId, memberId: testUserId });
    });

    it('should emit memberPromoted to members on promote (line 748)', async () => {
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember)
        .mockResolvedValueOnce({ ...mockRegularMember, id: 'target-id', userId: otherUserId, role: 'member' });
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }, { userId: otherUserId }]);

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/promote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith(`user:${otherUserId}`);
      expect(mockEmit).toHaveBeenCalledWith('group:memberPromoted', expect.objectContaining({ groupId: testGroupId, memberId: otherUserId }));
    });

    it('should emit memberDemoted to members on demote (line 783)', async () => {
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember)
        .mockResolvedValueOnce({ ...mockAdminMember, id: 'target-id', role: 'admin' });
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }, { userId: otherUserId }]);

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${otherUserId}/demote`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith(`user:${otherUserId}`);
      expect(mockEmit).toHaveBeenCalledWith('group:memberDemoted', expect.objectContaining({ groupId: testGroupId, memberId: otherUserId }));
    });

    it('should emit ownershipTransferred to members on transfer (line 817)', async () => {
      (prisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockOwnerMember)
        .mockResolvedValueOnce({ ...mockAdminMember, id: 'target-id', role: 'admin' });
      (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }, { userId: otherUserId }]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/transfer-ownership`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newOwnerId: otherUserId });

      expect(res.status).toBe(200);
      expect(mockEmit).toHaveBeenCalledWith('group:ownershipTransferred', { groupId: testGroupId, newOwnerId: otherUserId });
    });

    it('should emit group:updated to members on delete profile image (line 1082)', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ profileImage: 'http://old.jpg' });
      (prisma.group.update as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }, { userId: otherUserId }]);

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/profile-image`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith(`user:${otherUserId}`);
      expect(mockEmit).toHaveBeenCalledWith('group:updated', { group: { id: testGroupId, profileImage: null } });
    });

    it('should emit group:updated to members on delete cover image (line 1113)', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ coverImage: 'http://old-cover.jpg' });
      (prisma.group.update as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }, { userId: otherUserId }]);

      const res = await request(app)
        .delete(`/api/groups/${testGroupId}/cover-image`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith(`user:${otherUserId}`);
      expect(mockEmit).toHaveBeenCalledWith('group:updated', { group: { id: testGroupId, coverImage: null } });
    });

    it('should emit audio:waveform to members on waveform patch (line 1143)', async () => {
      const waveform = new Array(50).fill(0.5);
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.groupMessage.update as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }, { userId: otherUserId }]);

      const res = await request(app)
        .patch(`/api/groups/${testGroupId}/messages/msg-1/waveform`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ waveform, duration: 5 });

      expect(res.status).toBe(200);
      expect(mockTo).toHaveBeenCalledWith(`user:${otherUserId}`);
      expect(mockEmit).toHaveBeenCalledWith('audio:waveform', { messageId: 'msg-1', waveform, duration: 5 });
    });
  });

  // ── Coverage: line 457 (sendSystemMessage catch in routes) ──────────────

  describe('sendSystemMessage failure', () => {
    it('should handle sendSystemMessage failure gracefully on leave', async () => {
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({
        ...mockGroup,
        members: [
          { ...mockOwnerMember, userId: otherUserId },
          { ...mockRegularMember, userId: testUserId, role: 'member' },
        ],
      });
      (prisma.groupMember.deleteMany as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: otherUserId, status: 'accepted' }]);
      (prisma.groupMember.findFirst as jest.Mock).mockRejectedValue(new Error('DB fail'));

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── Coverage: lines 969-975 (setImmediate waveform generation) ──────────

  describe('Async waveform generation via setImmediate', () => {
    it('should run async waveform generation after audio upload', async () => {
      (generateWaveformFromFile as jest.Mock).mockResolvedValue({ waveform: new Array(50).fill(0.5), duration: 5.0 });
      (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ ...mockOwnerMember, status: 'accepted' });
      (prisma.groupMessage.create as jest.Mock).mockResolvedValue({
        id: 'gm-wave', groupId: testGroupId, senderId: testUserId,
        type: 'audio', createdAt: new Date(), sender: mockOwnerMember.user,
      });
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }]);
      (prisma.groupMessage.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('audio-data'), { filename: 'voice.webm', contentType: 'audio/webm' });

      expect(res.status).toBe(200);
      expect(res.body.needsWaveformGeneration).toBe(true);

      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(prisma.groupMessage.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'gm-wave' },
        data: expect.objectContaining({ audioWaveform: expect.any(Array) }),
      }));
      expect(mockEmit).toHaveBeenCalledWith('audio:waveform', expect.objectContaining({ messageId: 'gm-wave' }));
    });
  });

  // ── POST /api/groups/:id/cover-image ────────────────────────────────────
  describe('POST /api/groups/:id/cover-image', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/cover-image`)
        .attach('coverImage', Buffer.from('img'), { filename: 'cover.jpg', contentType: 'image/jpeg' });
      expect(res.status).toBe(401);
    });

    it('should return 400 if no file uploaded', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/cover-image`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(400);
    });

    it('should upload cover image as admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ coverImage: null });
      (prisma.group.update as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([mockOwnerMember]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/cover-image`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('coverImage', Buffer.from('img'), { filename: 'cover.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(200);
      expect(res.body.url).toBeDefined();
      expect(processImageVariants).toHaveBeenCalled();
    });

    it('should delete old cover image when uploading new one', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (prisma.group.findUnique as jest.Mock).mockResolvedValue({ coverImage: 'http://old-cover.jpg' });
      (prisma.group.update as jest.Mock).mockResolvedValue({});
      (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([mockOwnerMember]);

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/cover-image`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('coverImage', Buffer.from('img'), { filename: 'cover.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(200);
      expect(deleteImageVariants).toHaveBeenCalled();
    });

    it('should return 403 if not admin', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ ...mockRegularMember, userId: testUserId, role: 'member' });

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/cover-image`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('coverImage', Buffer.from('img'), { filename: 'cover.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(403);
    });

    it('should return 500 on error', async () => {
      (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(mockOwnerMember);
      (processImageVariants as jest.Mock).mockRejectedValue(new Error('resize error'));

      const res = await request(app)
        .post(`/api/groups/${testGroupId}/cover-image`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('coverImage', Buffer.from('img'), { filename: 'cover.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(500);
    });
  });
});
