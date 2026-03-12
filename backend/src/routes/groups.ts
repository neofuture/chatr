import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { Server } from 'socket.io';
import { generatePlaceholderWaveform, generateWaveformFromFile } from '../services/waveform';
import { maybeRegenerateGroupSummary } from '../services/summaryEngine';
import { processImageVariants, deleteImageVariants, PROFILE_VARIANTS, COVER_VARIANTS } from '../lib/imageResize';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const router = Router();
const prisma = new PrismaClient();

// ── S3 / storage config (mirrors file-upload.ts) ─────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const S3_BUCKET = process.env.S3_BUCKET || '';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-2';

const s3 = IS_PRODUCTION ? new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
}) : null;

async function uploadToS3(buffer: Buffer, key: string, mimeType: string): Promise<string> {
  if (!s3) throw new Error('S3 not configured');
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: mimeType }));
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

async function deleteFromS3(key: string): Promise<void> {
  if (!s3) return;
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

const messagesDir = path.join(__dirname, '../../uploads/messages');
const audioDir    = path.join(__dirname, '../../uploads/audio');
const groupProfilesDir = path.join(__dirname, '../../uploads/group-profiles');
const groupCoversDir   = path.join(__dirname, '../../uploads/group-covers');
if (!IS_PRODUCTION) {
  if (!fs.existsSync(messagesDir)) fs.mkdirSync(messagesDir, { recursive: true });
  if (!fs.existsSync(audioDir))    fs.mkdirSync(audioDir,    { recursive: true });
  if (!fs.existsSync(groupProfilesDir)) fs.mkdirSync(groupProfilesDir, { recursive: true });
  if (!fs.existsSync(groupCoversDir))   fs.mkdirSync(groupCoversDir,   { recursive: true });
}

const storage = IS_PRODUCTION
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, file.mimetype.startsWith('audio/') ? audioDir : messagesDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${path.basename(file.originalname, ext)}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      },
    });

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg','image/png','image/gif','image/webp',
      'audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-m4a',
      'application/pdf','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain','application/zip',
      'video/mp4','video/quicktime','video/webm',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

async function isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
  const member = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } });
  return member?.role === 'owner' || member?.role === 'admin';
}

async function isGroupOwner(userId: string, groupId: string): Promise<boolean> {
  const member = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } });
  return member?.role === 'owner';
}

function deleteLocalFile(filePath: string): void {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
}

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
            { userId, role: 'owner', status: 'accepted' },
            ...((memberIds as string[]).filter((id: string) => id !== userId).map((id: string) => ({
              userId: id, role: 'member', status: 'pending', invitedBy: userId,
            }))),
          ],
        },
      },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } } } },
    });

    // Build the creator-facing group object with only accepted members
    const creatorUser = group.members.find(m => m.userId === userId);
    const creatorName = creatorUser?.user?.displayName || creatorUser?.user?.username?.replace(/^@/, '') || 'Someone';
    const acceptedMembers = group.members.filter(m => (m as any).status === 'accepted');
    const groupForCreator = { ...group, members: acceptedMembers };

    // Notify creator of the new group; notify invitees with an invite event
    if (_io) {
      _io.to(`user:${userId}`).emit('group:created', { group: groupForCreator });
      const pendingMembers = group.members.filter(m => (m as any).status === 'pending');
      for (const m of pendingMembers) {
        _io.to(`user:${m.userId}`).emit('group:invite', {
          groupId: group.id,
          groupName: group.name,
          memberCount: acceptedMembers.length,
          invitedBy: creatorName,
        });
      }
    }

    res.json({ group: groupForCreator });
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
      where: { userId, status: 'accepted' },
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

    const groups = memberships.map(m => {
      // Fire-and-forget: regenerate AI summary if threshold met
      maybeRegenerateGroupSummary(m.group.id, m.group.summaryMessageCount, m.group.summaryGeneratedAt);
      return {
        ...m.group,
        lastMessage: m.group.messages[0] ?? null,
        summary: m.group.summary ?? null,
      };
    });

    res.json({ groups });
  } catch (e) {
    console.error('List groups error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── List pending group invites ────────────────────────────────────────────────
router.get('/invites', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const memberships = await prisma.groupMember.findMany({
      where: { userId, status: 'pending' },
      include: {
        group: {
          include: {
            members: { where: { status: 'accepted' }, select: { userId: true } },
          },
        },
      },
    });

    // Batch-fetch all inviters in one query
    const inviterIds = [...new Set(memberships.map(m => m.invitedBy).filter(Boolean) as string[])];
    const inviters = inviterIds.length
      ? await prisma.user.findMany({
          where: { id: { in: inviterIds } },
          select: { id: true, displayName: true, username: true },
        })
      : [];
    const inviterMap = Object.fromEntries(inviters.map(u => [u.id, u]));

    const invites = memberships.map(m => {
      const inviter = m.invitedBy ? inviterMap[m.invitedBy] : null;
      return {
        groupId: m.groupId,
        groupName: m.group.name,
        groupDescription: m.group.description,
        memberCount: m.group.members.length,
        invitedBy: inviter?.displayName || inviter?.username?.replace(/^@/, '') || 'Someone',
        invitedById: m.invitedBy,
      };
    });

    res.json({ invites });
  } catch (e) {
    console.error('List invites error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Accept group invite ───────────────────────────────────────────────────────
router.post('/:id/accept', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id: groupId } = req.params;

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) return res.status(404).json({ error: 'Invite not found' });
    if (membership.status === 'accepted') return res.status(400).json({ error: 'Already a member' });

    await prisma.groupMember.update({
      where: { userId_groupId: { userId, groupId } },
      data: { status: 'accepted' },
    });

    // Load the full group to send back to the accepting user
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { status: 'accepted' },
          include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } },
        },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (_io) {
      // Build the new member payload once
      const newMember = group.members.find(m => m.userId === userId);
      const memberPayload = newMember
        ? { id: newMember.id, userId: newMember.userId, role: newMember.role, user: newMember.user }
        : null;
      // Tell the accepting user their groups list needs this new group
      _io.to(`user:${userId}`).emit('group:created', { group });
      // Tell all other accepted members someone joined — include full user data
      for (const m of group.members) {
        if (m.userId === userId) continue;
        _io.to(`user:${m.userId}`).emit('group:memberJoined', { groupId, userId, member: memberPayload });
      }
      // Notify the inviter
      if (membership.invitedBy) {
        _io.to(`user:${membership.invitedBy}`).emit('group:inviteAccepted', { groupId, groupName: group.name, acceptedBy: userId });
      }
    }

    // System message to accepted members
    const accepter = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, username: true } });
    const accepterName = accepter?.displayName || accepter?.username?.replace(/^@/, '') || 'Someone';
    await sendSystemMessage(groupId, `${accepterName} joined the group`);

    res.json({ group });
  } catch (e) {
    console.error('Accept invite error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Decline group invite ──────────────────────────────────────────────────────
router.post('/:id/decline', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id: groupId } = req.params;

    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) return res.status(404).json({ error: 'Invite not found' });
    if (membership.status === 'accepted') return res.status(400).json({ error: 'Already a member — use leave instead' });

    await prisma.groupMember.delete({ where: { userId_groupId: { userId, groupId } } });

    if (_io && membership.invitedBy) {
      const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
      _io.to(`user:${membership.invitedBy}`).emit('group:inviteDeclined', {
        groupId, groupName: group?.name, declinedBy: userId,
      });
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Decline invite error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get group ─────────────────────────────────────────────────────────────────
router.get('/:id', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: { status: { in: ['accepted', 'pending'] } },
          include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } },
        },
      },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const callerMember = group.members.find(m => m.userId === userId);
    if (!callerMember) return res.status(403).json({ error: 'Not a member of this group' });

    res.json({ group, memberStatus: callerMember.status });
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
    if (member.status !== 'accepted') return res.status(403).json({ error: 'Accept the group invite to view messages' });

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

    const callerMember = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId: id } } });
    if (!callerMember || (callerMember.role !== 'owner' && callerMember.role !== 'admin')) {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    await prisma.groupMember.create({ data: { userId: memberId, groupId: id, status: 'pending', invitedBy: userId } });

    const updated = await prisma.group.findUnique({
      where: { id },
      include: { members: {
        where: { status: 'accepted' },
        include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } },
      } },
    });

    if (_io) {
      const inviter = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, username: true } });
      const inviterName = inviter?.displayName || inviter?.username?.replace(/^@/, '') || 'Someone';
      _io.to(`user:${memberId}`).emit('group:invite', {
        groupId: id,
        groupName: updated!.name,
        memberCount: updated!.members.length,
        invitedBy: inviterName,
      });
    }

    res.json({ group: updated });
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'User is already a member' });
    console.error('Add member error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Helper: create + broadcast a system message ───────────────────────────────
async function sendSystemMessage(groupId: string, content: string) {
  try {
    const owner = await prisma.groupMember.findFirst({ where: { groupId, role: 'owner' } });
    const senderId = owner?.userId ?? (await prisma.group.findUnique({ where: { id: groupId }, select: { ownerId: true } }))!.ownerId;
    const msg = await prisma.groupMessage.create({
      data: { groupId, senderId, content, type: 'system' },
    });
    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId, status: 'accepted' } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:message', {
          id: msg.id, groupId, senderId: msg.senderId, content, type: 'system',
          createdAt: msg.createdAt, sender: null,
        });
      }
    }
  } catch (e) {
    console.warn('sendSystemMessage failed:', e);
  }
}

// ── Remove member / leave ─────────────────────────────────────────────────────
router.delete('/:id/members/:memberId', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id, memberId } = req.params;

    const group = await prisma.group.findUnique({ where: { id }, include: { members: { include: { user: { select: { displayName: true, username: true } } } } } });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isSelf = memberId === userId;
    const callerMember = group.members.find(m => m.userId === userId);
    const targetMember = group.members.find(m => m.userId === memberId);
    const callerRole = callerMember?.role;
    const targetRole = targetMember?.role;

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found in group' });
    }

    if (!isSelf) {
      if (callerRole !== 'owner' && callerRole !== 'admin') {
        return res.status(403).json({ error: 'Only admins and owners can remove members' });
      }
      if (targetRole === 'owner') {
        return res.status(403).json({ error: 'Cannot remove an owner' });
      }
      if (targetRole === 'admin' && callerRole !== 'owner') {
        return res.status(403).json({ error: 'Only owners can remove admins' });
      }
    }

    // Get the name before removing
    const removedMember = group.members.find(m => m.userId === memberId);
    const removedName = removedMember?.user.displayName || removedMember?.user.username?.replace(/^@/, '') || 'Someone';

    await prisma.groupMember.delete({ where: { userId_groupId: { userId: memberId, groupId: id } } });

    if (_io) {
      _io.to(`user:${memberId}`).emit('group:removed', { groupId: id });
      const remaining = await prisma.groupMember.findMany({ where: { groupId: id, status: 'accepted' } });
      for (const m of remaining) {
        _io.to(`user:${m.userId}`).emit('group:memberLeft', { groupId: id, memberId });
      }
    }

    const wasPending = removedMember?.status === 'pending';
    if (!wasPending) {
      await sendSystemMessage(id, isSelf ? `${removedName} left the group` : `${removedName} was removed from the group`);
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

    if (!(await isGroupAdmin(userId, id))) {
      return res.status(403).json({ error: 'Only admins can edit the group' });
    }

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

// ── Helper: promote next member to owner when current owner leaves/deletes ────
async function promoteNextOwner(groupId: string, excludeUserId: string): Promise<string | null> {
  // Check if there are remaining owners
  const remainingOwner = await prisma.groupMember.findFirst({
    where: { groupId, userId: { not: excludeUserId }, role: 'owner' },
  });
  if (remainingOwner) return remainingOwner.userId;

  // No remaining owners — prefer an existing admin, then fall back to oldest member
  const next = await prisma.groupMember.findFirst({
    where: { groupId, userId: { not: excludeUserId } },
    orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
  });
  if (!next) return null;
  await prisma.$transaction([
    prisma.group.update({ where: { id: groupId }, data: { ownerId: next.userId } }),
    prisma.groupMember.update({ where: { id: next.id }, data: { role: 'owner' } }),
  ]);
  return next.userId;
}

// ── Delete group (owner only — deletes everything) ────────────────────────────
router.delete('/:id', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const group = await prisma.group.findUnique({ where: { id }, include: { members: true } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.members.find(m => m.userId === userId)?.role !== 'owner') return res.status(403).json({ error: 'Only owners can delete the group' });

    // Notify all members before deleting
    if (_io) {
      for (const m of group.members) {
        _io.to(`user:${m.userId}`).emit('group:deleted', { groupId: id, groupName: group.name });
      }
    }

    // Clean up uploaded files
    const messagesWithFiles = await prisma.groupMessage.findMany({
      where: { groupId: id, fileUrl: { not: null } },
      select: { fileUrl: true },
    });
    for (const msg of messagesWithFiles) {
      if (!msg.fileUrl) continue;
      try {
        if (IS_PRODUCTION) {
          const url = new URL(msg.fileUrl);
          const key = url.pathname.replace(/^\//, '');
          await deleteFromS3(key);
        } else {
          const relativePath = msg.fileUrl.replace(/^.*\/uploads\//, '');
          const absPath = path.join(__dirname, '../../uploads', relativePath);
          if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
        }
      } catch (fileErr) {
        console.warn('Could not delete group message file:', msg.fileUrl, fileErr);
      }
    }

    await prisma.group.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Delete group error:', e);
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

    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId, groupId: id } },
      create: { userId, groupId: id, role: 'member' },
      update: {},
    });

    if (_io) {
      const joiningUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, displayName: true, profileImage: true },
      });
      const newMembership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId, groupId: id } },
      });
      const memberPayload = joiningUser && newMembership
        ? { id: newMembership.id, userId, role: newMembership.role, user: joiningUser }
        : null;
      const members = await prisma.groupMember.findMany({ where: { groupId: id } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:memberJoined', { groupId: id, userId, member: memberPayload });
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Join group error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Leave group ───────────────────────────────────────────────────────────────
// If the owner leaves: promote another member to owner and stay in the group for others.
// If the last member leaves: delete the group.
router.post('/:id/leave', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { displayName: true, username: true } } } } },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const leavingMember = group.members.find(m => m.userId === userId);
    const leavingName = leavingMember?.user.displayName || leavingMember?.user.username?.replace(/^@/, '') || 'Someone';

    const otherMembers = group.members.filter(m => m.userId !== userId);

    if (otherMembers.length === 0) {
      // Last member — delete the group entirely (no system message needed)
      if (_io) _io.to(`user:${userId}`).emit('group:deleted', { groupId: id, groupName: group.name });
      await prisma.group.delete({ where: { id } });
      return res.json({ success: true, deleted: true });
    }

    if (leavingMember?.role === 'owner') {
      // Owner is leaving — check if there are other owners, otherwise promote someone
      const otherOwners = group.members.filter(m => m.role === 'owner' && m.userId !== userId);
      if (otherOwners.length === 0) {
        const newOwnerId = await promoteNextOwner(id, userId);
        if (_io && newOwnerId) {
          for (const m of group.members) {
            _io.to(`user:${m.userId}`).emit('group:ownerChanged', { groupId: id, newOwnerId });
          }
        }
      }
    }

    // Remove the leaving member
    await prisma.groupMember.deleteMany({ where: { userId, groupId: id } });

    if (_io) {
      _io.to(`user:${userId}`).emit('group:removed', { groupId: id });
      const remaining = await prisma.groupMember.findMany({ where: { groupId: id, status: 'accepted' } });
      for (const m of remaining) {
        _io.to(`user:${m.userId}`).emit('group:memberLeft', { groupId: id, memberId: userId });
      }
    }

    // System message — broadcast to remaining members
    await sendSystemMessage(id, `${leavingName} left the group`);

    res.json({ success: true, deleted: false });
  } catch (e) {
    console.error('Leave group error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Promote member to admin ───────────────────────────────────────────────────
router.patch('/:id/members/:memberId/promote', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id: groupId, memberId } = req.params;

    // Only admins (or owner) can promote
    const callerMember = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!callerMember || (callerMember.role !== 'owner' && callerMember.role !== 'admin')) {
      return res.status(403).json({ error: 'Only admins can promote members' });
    }

    const target = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: memberId, groupId } },
    });
    if (!target) return res.status(404).json({ error: 'Member not found' });

    await prisma.groupMember.update({
      where: { id: target.id },
      data: { role: 'admin' },
    });

    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:memberPromoted', { groupId, memberId, promotedBy: userId });
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Promote member error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Demote admin to member ────────────────────────────────────────────────────
router.patch('/:id/members/:memberId/demote', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id: groupId, memberId } = req.params;

    const callerIsOwner = await isGroupOwner(userId, groupId);
    // Owners can demote admins; admins can demote themselves
    if (!callerIsOwner && memberId !== userId) {
      return res.status(403).json({ error: 'Only owners can remove admin' });
    }

    const target = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: memberId, groupId } },
    });
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (target.role === 'owner') return res.status(400).json({ error: 'Cannot demote an owner. Use step-down instead.' });

    await prisma.groupMember.update({ where: { id: target.id }, data: { role: 'member' } });

    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:memberDemoted', { groupId, memberId, demotedBy: userId });
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Demote member error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Transfer ownership to an admin ────────────────────────────────────────────
router.post('/:id/transfer-ownership', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id: groupId } = req.params;
    const { newOwnerId } = req.body;
    if (!newOwnerId) return res.status(400).json({ error: 'newOwnerId is required' });

    if (!(await isGroupOwner(userId, groupId))) return res.status(403).json({ error: 'Only owners can promote to owner' });

    const target = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: newOwnerId, groupId } },
    });
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (target.role === 'owner') return res.status(400).json({ error: 'User is already an owner' });
    if (target.role !== 'admin') return res.status(400).json({ error: 'Only admins can be promoted to owner' });

    await prisma.groupMember.update({ where: { id: target.id }, data: { role: 'owner' } });

    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:ownershipTransferred', { groupId, newOwnerId });
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Transfer ownership error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Owner step-down (becomes admin) ──────────────────────────────────────────
router.post('/:id/step-down', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id: groupId } = req.params;

    const caller = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!caller || caller.role !== 'owner') return res.status(403).json({ error: 'Only owners can step down' });

    const otherOwners = await prisma.groupMember.findMany({
      where: { groupId, role: 'owner', userId: { not: userId } },
    });
    if (otherOwners.length === 0) {
      return res.status(400).json({ error: 'You are the only owner. Promote another member to owner first.' });
    }

    await prisma.groupMember.update({ where: { id: caller.id }, data: { role: 'admin' } });

    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:ownerSteppedDown', { groupId, userId });
      }
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Step down error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Upload file / voice to group ──────────────────────────────────────────────
router.post('/:id/upload', authenticateToken as any, upload.single('file') as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { id: groupId } = req.params;
    const { type, waveform, duration: durationParam, caption } = req.body;

    // Verify membership
    const member = await prisma.groupMember.findFirst({ where: { userId, groupId } });
    if (!member) {
      if (!IS_PRODUCTION && req.file.path) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Not a member of this group' });
    }
    if (member.status !== 'accepted') {
      if (!IS_PRODUCTION && req.file.path) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Accept the group invite before sending files' });
    }

    const isAudio = req.file.mimetype.startsWith('audio/');
    const subfolder = isAudio ? 'audio' : 'messages';
    const ext = path.extname(req.file.originalname);
    const filename = `${path.basename(req.file.originalname, ext)}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    let fileUrl: string;
    let localFilePath: string | null = null;

    if (IS_PRODUCTION) {
      const s3Key = `uploads/${subfolder}/${filename}`;
      fileUrl = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);
    } else {
      localFilePath = req.file.path;
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      fileUrl = `${backendUrl}/uploads/${subfolder}/${req.file.filename}`;
    }

    let waveformData: number[] | undefined;
    let audioDurationFromWaveform: number | undefined;

    // Prefer duration sent explicitly by the client — NEVER recalculate from bar count.
    if (durationParam) {
      const parsed = parseFloat(durationParam);
      if (!isNaN(parsed) && parsed > 0) audioDurationFromWaveform = parsed;
    }

    if (waveform) {
      try {
        waveformData = JSON.parse(waveform);
      } catch { /* ignore */ }
    }

    const needsWaveformGeneration = isAudio && (!waveformData || waveformData.length === 0);
    if (needsWaveformGeneration) {
      waveformData = generatePlaceholderWaveform(req.file.filename);
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const messageType = isAudio ? 'audio' : isVideo ? 'video' : (type === 'image' ? 'image' : 'file');

    const message = await prisma.groupMessage.create({
      data: {
        groupId,
        senderId: userId,
        content: isAudio ? 'Voice message' : (caption?.trim() || req.file.originalname),
        type: messageType,
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        audioWaveform: waveformData,
        audioDuration: audioDurationFromWaveform,
      },
      include: { sender: { select: { id: true, username: true, displayName: true, profileImage: true } } },
    });

    // Broadcast to all accepted group members
    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId, status: 'accepted' } });
      const payload = { ...message, waveform: waveformData, duration: audioDurationFromWaveform };
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:message', payload);
      }
    }

    res.json({
      success: true,
      messageId: message.id,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      waveform: waveformData,
      duration: audioDurationFromWaveform,
      needsWaveformGeneration,
    });

    // Async waveform generation for uploaded audio files (e.g. MP3)
    if (needsWaveformGeneration && _io && localFilePath) {
      const filePath = localFilePath;
      const messageId = message.id;
      const io = _io;
      setImmediate(async () => {
        try {
          const { waveform: realWaveform, duration } = await generateWaveformFromFile(filePath);
          await prisma.groupMessage.update({
            where: { id: messageId },
            data: { audioWaveform: realWaveform, audioDuration: duration || undefined },
          });
          const members = await prisma.groupMember.findMany({ where: { groupId, status: 'accepted' } });
          for (const m of members) {
            io.to(`user:${m.userId}`).emit('audio:waveform', { messageId, waveform: realWaveform, duration });
          }
        } catch (err) {
          console.error('❌ Group waveform generation failed:', err);
        }
      });
    }
  } catch (err) {
    console.error('Group upload error:', err);
    if (!IS_PRODUCTION && req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// ── Upload group profile image (admin only) ──────────────────────────────────
router.post('/:id/profile-image', authenticateToken as any, imageUpload.single('profileImage') as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id: groupId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (!(await isGroupAdmin(userId, groupId))) {
      return res.status(403).json({ error: 'Only admins can change the group avatar' });
    }

    const baseFilename = `${groupId}-${Date.now()}.jpg`;
    const fileUrl = await processImageVariants(req.file.buffer, baseFilename, 'group-profiles', PROFILE_VARIANTS);

    const existing = await prisma.group.findUnique({ where: { id: groupId }, select: { profileImage: true } });
    await prisma.group.update({ where: { id: groupId }, data: { profileImage: fileUrl } });

    if (existing?.profileImage) {
      await deleteImageVariants(existing.profileImage, PROFILE_VARIANTS);
    }

    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId, status: 'accepted' } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:updated', { group: { id: groupId, profileImage: fileUrl } });
      }
    }

    res.json({ url: fileUrl });
  } catch (err) {
    console.error('Group profile image upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── Upload group cover image (admin only) ────────────────────────────────────
router.post('/:id/cover-image', authenticateToken as any, imageUpload.single('coverImage') as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id: groupId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (!(await isGroupAdmin(userId, groupId))) {
      return res.status(403).json({ error: 'Only admins can change the group cover image' });
    }

    const baseFilename = `${groupId}-${Date.now()}.jpg`;
    const fileUrl = await processImageVariants(req.file.buffer, baseFilename, 'group-covers', COVER_VARIANTS);

    const existing = await prisma.group.findUnique({ where: { id: groupId }, select: { coverImage: true } });
    await prisma.group.update({ where: { id: groupId }, data: { coverImage: fileUrl } });

    if (existing?.coverImage) {
      await deleteImageVariants(existing.coverImage, COVER_VARIANTS);
    }

    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId, status: 'accepted' } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:updated', { group: { id: groupId, coverImage: fileUrl } });
      }
    }

    res.json({ url: fileUrl });
  } catch (err) {
    console.error('Group cover image upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── Delete group profile image (admin only) ──────────────────────────────────
router.delete('/:id/profile-image', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id: groupId } = req.params;

    if (!(await isGroupAdmin(userId, groupId))) {
      return res.status(403).json({ error: 'Only admins can change the group avatar' });
    }

    const existing = await prisma.group.findUnique({ where: { id: groupId }, select: { profileImage: true } });
    if (!existing?.profileImage) return res.json({ success: true });

    await prisma.group.update({ where: { id: groupId }, data: { profileImage: null } });

    await deleteImageVariants(existing.profileImage, PROFILE_VARIANTS);

    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId, status: 'accepted' } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:updated', { group: { id: groupId, profileImage: null } });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Group profile image delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ── Delete group cover image (admin only) ────────────────────────────────────
router.delete('/:id/cover-image', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id: groupId } = req.params;

    if (!(await isGroupAdmin(userId, groupId))) {
      return res.status(403).json({ error: 'Only admins can change the group cover image' });
    }

    const existing = await prisma.group.findUnique({ where: { id: groupId }, select: { coverImage: true } });
    if (!existing?.coverImage) return res.json({ success: true });

    await prisma.group.update({ where: { id: groupId }, data: { coverImage: null } });
    await deleteImageVariants(existing.coverImage, COVER_VARIANTS);

    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId, status: 'accepted' } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('group:updated', { group: { id: groupId, coverImage: null } });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Group cover image delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ── Patch waveform for a group message ───────────────────────────────────────
router.patch('/:id/messages/:msgId/waveform', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id: groupId, msgId } = req.params;
    const { waveform, duration } = req.body;

    const member = await prisma.groupMember.findFirst({ where: { userId, groupId } });
    if (!member) return res.status(403).json({ error: 'Not a member' });

    await prisma.groupMessage.update({
      where: { id: msgId },
      data: { audioWaveform: waveform, audioDuration: duration },
    });

    if (_io) {
      const members = await prisma.groupMember.findMany({ where: { groupId } });
      for (const m of members) {
        _io.to(`user:${m.userId}`).emit('audio:waveform', { messageId: msgId, waveform, duration });
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Group waveform patch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

