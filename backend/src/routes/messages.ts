import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { Server } from 'socket.io';

const router = Router();
const prisma = new PrismaClient();

// io injected by index.ts
let _io: Server | null = null;
export function setMessagesSocketIO(io: Server) { _io = io; }

interface AuthenticatedRequest extends Request {
  user?: { userId: string; username: string; };
}

// GET /api/messages/history?otherUserId=xxx&limit=50&before=messageId - Get message history
router.get('/history', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { otherUserId, limit = '50', before } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!otherUserId) {
      return res.status(400).json({ error: 'otherUserId is required' });
    }

    const limitNum = parseInt(limit as string, 10);

    // Build query
    const whereClause: any = {
      OR: [
        { senderId: userId, recipientId: otherUserId as string },
        { senderId: otherUserId as string, recipientId: userId }
      ]
    };

    // If before cursor provided, only get messages before that ID
    if (before) {
      const beforeMessage = await prisma.message.findUnique({
        where: { id: before as string },
        select: { createdAt: true }
      });

      if (beforeMessage) {
        whereClause.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            profileImage: true
          }
        },
        reactions: {
          include: { user: { select: { id: true, username: true } } }
        }
      }
    });

    // Mark messages as read if they're for the current user
    const unreadMessageIds = messages
      .filter((m: any) => m.recipientId === userId && !m.isRead)
      .map((m: any) => m.id);

    if (unreadMessageIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadMessageIds } },
        data: { isRead: true, readAt: new Date() }
      });
    }

    // Format messages for frontend
    const formattedMessages = messages.map((m: any) => ({
      id: m.id,
      senderId: m.senderId,
      senderUsername: m.sender.username,
      senderDisplayName: m.sender.displayName ?? null,
      senderProfileImage: m.sender.profileImage,
      recipientId: m.recipientId,
      content: m.deletedAt ? '' : m.content,
      unsent: !!m.deletedAt,
      type: m.deletedAt ? 'text' : m.type,
      status: m.status,
      isRead: m.isRead,
      readAt: m.readAt,
      createdAt: m.createdAt,
      // File metadata (hide for unsent)
      fileUrl: m.deletedAt ? null : m.fileUrl,
      fileName: m.deletedAt ? null : m.fileName,
      fileSize: m.deletedAt ? null : m.fileSize,
      fileType: m.deletedAt ? null : m.fileType,
      // Audio metadata
      waveform: m.deletedAt ? null : (m.audioWaveform as number[] | null),
      duration: m.deletedAt ? null : m.audioDuration,
      // Reactions (cleared on unsend)
      reactions: (m.reactions || []).map((r: any) => ({ userId: r.userId, username: r.user.username, emoji: r.emoji })),
      // Reply snapshot
      replyTo: m.replyToId ? {
        id: m.replyToId,
        content: m.replyToContent || '',
        senderDisplayName: m.replyToSenderName || null,
        senderUsername: m.replyToSenderName || '',
        type: m.replyToType || 'text',
        duration: m.replyToDuration || null,
      } : undefined,
    }));

    res.json({
      messages: formattedMessages.reverse(), // Reverse to get chronological order
      hasMore: messages.length === limitNum
    });

  } catch (error) {
    console.error('Error fetching message history:', error);
    res.status(500).json({ error: 'Failed to fetch message history' });
  }
});

// GET /api/messages/conversations - Get user's conversations
router.get('/conversations', (req, res) => {
  // TODO: Implement get conversations
  // - Get all conversations for current user
  // - Include last message preview
  // - Include unread count
  res.status(501).json({ message: 'Get conversations not implemented yet' });
});

// PATCH /api/messages/:id/waveform - Update waveform after client-side analysis
router.patch('/:id/waveform', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { waveform, duration } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!waveform || !Array.isArray(waveform)) return res.status(400).json({ error: 'waveform array required' });

    const message = await prisma.message.update({
      where: { id },
      data: {
        audioWaveform: waveform,
        audioDuration: duration ?? undefined,
      },
    });

    // Push real waveform to both sender and recipient via socket
    if (_io) {
      const payload = { messageId: id, waveform, duration: message.audioDuration };
      _io.to(`user:${message.senderId}`).emit('audio:waveform', payload);
      _io.to(`user:${message.recipientId}`).emit('audio:waveform', payload);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating waveform:', err);
    res.status(500).json({ error: 'Failed to update waveform' });
  }
});

export default router;

