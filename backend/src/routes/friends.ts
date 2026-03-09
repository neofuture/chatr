import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { invalidateConversationCache } from '../lib/redis';

const router = Router();
const prisma = new PrismaClient();

// Shared user select fields
const userSelect = {
  id: true,
  username: true,
  displayName: true,
  firstName: true,
  lastName: true,
  profileImage: true,
  email: true,
  showOnlineStatus: true,
};

// Helper: get all friendships (accepted) for a user
async function getFriendIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: 'accepted',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  return new Set(rows.map(r => r.requesterId === userId ? r.addresseeId : r.requesterId));
}

/**
 * @swagger
 * /api/friends:
 *   get:
 *     summary: Get accepted friends list
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of accepted friends
 */
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const rows = await prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: userSelect },
        addressee: { select: userSelect },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const friends = rows.map(r => ({
      friendshipId: r.id,
      since: r.updatedAt,
      user: r.requesterId === userId ? r.addressee : r.requester,
    }));

    res.json({ friends });
  } catch (err) {
    console.error('GET /friends error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/friends/requests/incoming:
 *   get:
 *     summary: Get incoming friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.get('/requests/incoming', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const rows = await prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'pending' },
      include: { requester: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ requests: rows.map(r => ({ friendshipId: r.id, createdAt: r.createdAt, user: r.requester })) });
  } catch (err) {
    console.error('GET /friends/requests/incoming error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/friends/requests/outgoing:
 *   get:
 *     summary: Get outgoing friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.get('/requests/outgoing', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const rows = await prisma.friendship.findMany({
      where: { requesterId: userId, status: 'pending' },
      include: { addressee: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ requests: rows.map(r => ({ friendshipId: r.id, createdAt: r.createdAt, user: r.addressee })) });
  } catch (err) {
    console.error('GET /friends/requests/outgoing error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/friends/search:
 *   get:
 *     summary: Search users to add as friends
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query (username, displayName, or email)
 */
router.get('/search', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const q = (req.query.q as string || '').trim();
    if (q.length < 2) return res.json({ users: [] });

    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        emailVerified: true,
        isGuest: false,
        isBot: false,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: userSelect,
      take: 20,
    });

    // Attach friendship status for each result
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: { in: users.map(u => u.id) } },
          { addresseeId: userId, requesterId: { in: users.map(u => u.id) } },
        ],
      },
    });

    const fsMap = new Map(friendships.map(f => {
      const otherId = f.requesterId === userId ? f.addresseeId : f.requesterId;
      return [otherId, { id: f.id, status: f.status, iRequested: f.requesterId === userId }];
    }));

    const result = users.map(u => ({
      ...u,
      friendship: fsMap.get(u.id) ?? null,
    }));

    res.json({ users: result });
  } catch (err) {
    console.error('GET /friends/search error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/friends/request:
 *   post:
 *     summary: Send a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.post('/request', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { addresseeId } = req.body;

    if (!addresseeId) return res.status(400).json({ message: 'addresseeId required' });
    if (addresseeId === userId) return res.status(400).json({ message: 'Cannot add yourself' });

    // Check if any friendship row already exists (either direction)
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId },
          { requesterId: addresseeId, addresseeId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') return res.status(409).json({ message: 'Already friends' });
      if (existing.status === 'blocked') return res.status(409).json({ message: 'Cannot send request' });
      if (existing.status === 'pending') {
        // They already sent us a request — auto-accept
        if (existing.addresseeId === userId) {
          const updated = await prisma.friendship.update({
            where: { id: existing.id },
            data: { status: 'accepted' },
            include: { requester: { select: userSelect }, addressee: { select: userSelect } },
          });
          return res.json({ friendship: updated, autoAccepted: true });
        }
        return res.status(409).json({ message: 'Request already sent' });
      }
    }

    const friendship = await prisma.friendship.create({
      data: { requesterId: userId, addresseeId, status: 'pending' },
      include: { requester: { select: userSelect }, addressee: { select: userSelect } },
    });

    res.status(201).json({ friendship });
  } catch (err) {
    console.error('POST /friends/request error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/friends/{friendshipId}/accept:
 *   post:
 *     summary: Accept a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:friendshipId/accept', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { friendshipId } = req.params;

    const row = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!row) return res.status(404).json({ message: 'Request not found' });
    if (row.addresseeId !== userId) return res.status(403).json({ message: 'Not authorised' });
    if (row.status !== 'pending') return res.status(409).json({ message: 'Request is not pending' });

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'accepted' },
      include: { requester: { select: userSelect }, addressee: { select: userSelect } },
    });
    res.json({ friendship: updated });
  } catch (err) {
    console.error('POST /friends/:id/accept error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/friends/{friendshipId}/decline:
 *   post:
 *     summary: Decline or cancel a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:friendshipId/decline', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { friendshipId } = req.params;

    const row = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!row) return res.status(404).json({ message: 'Request not found' });
    if (row.requesterId !== userId && row.addresseeId !== userId) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    await prisma.friendship.delete({ where: { id: friendshipId } });
    res.json({ success: true });
  } catch (err) {
    console.error('POST /friends/:id/decline error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/friends/{friendshipId}:
 *   delete:
 *     summary: Remove a friend
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:friendshipId', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { friendshipId } = req.params;

    const row = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!row) return res.status(404).json({ message: 'Friendship not found' });
    if (row.requesterId !== userId && row.addresseeId !== userId) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    await prisma.friendship.delete({ where: { id: friendshipId } });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /friends/:id error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/friends/{userId}/block:
 *   post:
 *     summary: Block a user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:targetUserId/block', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { targetUserId } = req.params;

    if (targetUserId === userId) return res.status(400).json({ message: 'Cannot block yourself' });

    // Remove any existing friendship first
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: userId },
        ],
      },
    });

    // Create blocked row (blocker is requester, blocked is addressee)
    const friendship = await prisma.friendship.create({
      data: { requesterId: userId, addresseeId: targetUserId, status: 'blocked' },
      include: { addressee: { select: userSelect } },
    });

    // Invalidate conversation cache for both parties so next fetch is fresh
    await Promise.all([
      invalidateConversationCache(userId),
      invalidateConversationCache(targetUserId),
    ]).catch(() => {});

    res.json({ friendship });
  } catch (err) {
    console.error('POST /friends/:id/block error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/friends/{userId}/unblock:
 *   post:
 *     summary: Unblock a user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:targetUserId/unblock', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { targetUserId } = req.params;

    await prisma.friendship.deleteMany({
      where: { requesterId: userId, addresseeId: targetUserId, status: 'blocked' },
    });

    // Invalidate conversation cache for both parties so next fetch is fresh
    await Promise.all([
      invalidateConversationCache(userId),
      invalidateConversationCache(targetUserId),
    ]).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    console.error('POST /friends/:id/unblock error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/friends/blocked:
 *   get:
 *     summary: Get blocked users list
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.get('/blocked', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const rows = await prisma.friendship.findMany({
      where: { requesterId: userId, status: 'blocked' },
      include: { addressee: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ blocked: rows.map(r => ({ friendshipId: r.id, createdAt: r.createdAt, user: r.addressee })) });
  } catch (err) {
    console.error('GET /friends/blocked error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/friends/{targetUserId}/block-status:
 *   get:
 *     summary: Check if a block exists between the current user and target user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:targetUserId/block-status', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { targetUserId } = req.params;

    const row = await prisma.friendship.findFirst({
      where: {
        status: 'blocked',
        OR: [
          { requesterId: userId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: userId },
        ],
      },
      select: { requesterId: true },
    });

    if (!row) return res.json({ blocked: false });
    res.json({
      blocked: true,
      blockedByMe: row.requesterId === userId,
    });
  } catch (err) {
    console.error('GET /friends/:id/block-status error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

