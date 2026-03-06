import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { Server } from 'socket.io';

const router = Router();
const prisma = new PrismaClient();

let _io: Server | null = null;
export function setGroupsSocketIO(io: Server) { _io = io; }


// ── Create group ──────────────────────────────────────────────────────────────
router.post('/', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { name, description, memberIds = [] } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' });

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: userId,
        members: {
          create: [
            { userId },
            ...((memberIds as string[]).filter((id: string) => id !== userId).map((id: string) => ({ userId: id }))),
          ],
        },
      },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } } } },
    });

    // Notify all members via socket
    if (_io) {
      for (const m of group.members) {
        _io.to(`user:${m.userId}`).emit('group:created', { group });
      }
    }

    res.json({ group });
  } catch (e) {
    console.error('Create group error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── List my groups ────────────────────────────────────────────────────────────
router.get('/', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: { include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { displayName: true, username: true } } } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const groups = memberships.map(m => ({
      ...m.group,
      lastMessage: m.group.messages[0] ?? null,
    }));

    res.json({ groups });
  } catch (e) {
    console.error('List groups error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get group ─────────────────────────────────────────────────────────────────
router.get('/:id', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const member = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: id } } });
    if (!member) return res.status(403).json({ error: 'Not a member of this group' });

    const group = await prisma.group.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } } } },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    res.json({ group });
  } catch (e) {
    console.error('Get group error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get group messages ────────────────────────────────────────────────────────
router.get('/:id/messages', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before as string | undefined;

    const member = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: id } } });
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const messages = await prisma.groupMessage.findMany({
      where: { groupId: id, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { sender: { select: { id: true, username: true, displayName: true, profileImage: true } } },
    });

    res.json({ messages });
  } catch (e) {
    console.error('Get group messages error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Add member ────────────────────────────────────────────────────────────────
router.post('/:id/members', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { memberId } = req.body;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.ownerId !== userId) return res.status(403).json({ error: 'Only the owner can add members' });

    await prisma.groupMember.create({ data: { userId: memberId, groupId: id } });

    const updated = await prisma.group.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } } } },
    });

    if (_io) {
      _io.to(`user:${memberId}`).emit('group:added', { group: updated });
      for (const m of updated!.members) {
        _io.to(`user:${m.userId}`).emit('group:updated', { group: updated });
      }
    }

    res.json({ group: updated });
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'User is already a member' });
    console.error('Add member error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Remove member / leave ─────────────────────────────────────────────────────
router.delete('/:id/members/:memberId', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id, memberId } = req.params;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isSelf = memberId === userId;
    if (!isSelf && group.ownerId !== userId) return res.status(403).json({ error: 'Only the owner can remove members' });

    await prisma.groupMember.delete({ where: { userId_groupId: { userId: memberId, groupId: id } } });

    if (_io) {
      _io.to(`user:${memberId}`).emit('group:removed', { groupId: id });
      const remaining = await prisma.groupMember.findMany({ where: { groupId: id } });
      for (const m of remaining) {
        _io.to(`user:${m.userId}`).emit('group:memberLeft', { groupId: id, memberId });
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Remove member error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Update group (name / description) ────────────────────────────────────────
router.patch('/:id', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { name, description } = req.body;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.ownerId !== userId) return res.status(403).json({ error: 'Only the owner can edit the group' });

    const updated = await prisma.group.update({
      where: { id },
      data: { ...(name ? { name: name.trim() } : {}), ...(description !== undefined ? { description: description?.trim() || null } : {}) },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } } } },
    });

    if (_io) {
      for (const m of updated.members) {
        _io.to(`user:${m.userId}`).emit('group:updated', { group: updated });
      }
    }

    res.json({ group: updated });
  } catch (e) {
    console.error('Update group error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Join group ────────────────────────────────────────────────────────────────
router.post('/:id/join', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Upsert so joining twice is idempotent
    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId, groupId: id } },
      create: { userId, groupId: id },
      update: {},
    });

    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId: id } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:memberJoined', { groupId: id, userId });
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Join group error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Leave group ───────────────────────────────────────────────────────────────
router.post('/:id/leave', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    await prisma.groupMember.deleteMany({ where: { userId, groupId: id } });

    if (_io) {
      _io.to(`user:${userId}`).emit('group:removed', { groupId: id });
      const remaining = await prisma.groupMember.findMany({ where: { groupId: id } });
      for (const m of remaining) {
        _io.to(`user:${m.userId}`).emit('group:memberLeft', { groupId: id, memberId: userId });
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Leave group error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

