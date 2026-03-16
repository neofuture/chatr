import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { Server } from 'socket.io';

const router = Router();

// io injected by index.ts
let _io: Server | null = null;
export function setMessagesSocketIO(io: Server) { _io = io; }

interface AuthenticatedRequest extends Request {
  user?: { userId: string; username: string; };
}

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Direct messaging endpoints
 *
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         senderId:
 *           type: string
 *         senderUsername:
 *           type: string
 *         senderDisplayName:
 *           type: string
 *           nullable: true
 *         senderProfileImage:
 *           type: string
 *           nullable: true
 *         recipientId:
 *           type: string
 *         content:
 *           type: string
 *         type:
 *           type: string
 *           enum: [text, image, file, audio]
 *         status:
 *           type: string
 *           enum: [sent, delivered, read]
 *         unsent:
 *           type: boolean
 *         edited:
 *           type: boolean
 *         fileUrl:
 *           type: string
 *           nullable: true
 *         fileName:
 *           type: string
 *           nullable: true
 *         fileSize:
 *           type: integer
 *           nullable: true
 *         fileType:
 *           type: string
 *           nullable: true
 *         waveform:
 *           type: array
 *           items:
 *             type: number
 *           nullable: true
 *           description: Audio waveform samples (0–1), 10 samples per second
 *         duration:
 *           type: number
 *           nullable: true
 *           description: Audio duration in seconds
 *         reactions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               username:
 *                 type: string
 *               emoji:
 *                 type: string
 *         replyTo:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *             content:
 *               type: string
 *             senderDisplayName:
 *               type: string
 *               nullable: true
 *             senderUsername:
 *               type: string
 *             type:
 *               type: string
 *             duration:
 *               type: number
 *               nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/messages/{recipientId}:
 *   get:
 *     summary: Get message history with a user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the other user
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Max number of messages to return
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *         description: Cursor — return messages before this message ID (for pagination)
 *     responses:
 *       200:
 *         description: Paginated message history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 hasMore:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 */
// GET /api/messages/:recipientId - Get message history
router.get('/:recipientId', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { recipientId } = req.params;
    const { limit = '50', before } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    /* istanbul ignore next -- defensive guard; Express route param is always non-empty */
    if (!recipientId) {
      return res.status(400).json({ error: 'recipientId is required' });
    }

    const limitNum = Math.min(Math.max(parseInt(limit as string, 10) || 50, 1), 100);

    // Build query
    const whereClause: any = {
      OR: [
        { senderId: userId, recipientId: recipientId as string },
        { senderId: recipientId as string, recipientId: userId }
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
      edited: !m.deletedAt && !!m.edited,
      editedAt: !m.deletedAt && m.editedAt ? m.editedAt : null,
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
      // Link preview
      linkPreview: m.deletedAt ? null : (m.linkPreview ?? null),
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


/**
 * @swagger
 * /api/messages/{id}/edits:
 *   get:
 *     summary: Get the edit history of a message
 *     description: Returns the full audit trail of previous content versions. Accessible to sender and recipient only. History is retained even after unsend for legal compliance.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Edit history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messageId:
 *                   type: string
 *                 edits:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       previousContent:
 *                         type: string
 *                       editedAt:
 *                         type: string
 *                         format: date-time
 *                       editedBy:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                             nullable: true
 *       403:
 *         description: Forbidden — not sender or recipient
 *       404:
 *         description: Message not found
 */
// GET /api/messages/:id/edits - Retrieve full edit-history audit trail (both parties, legal record)
router.get('/:id/edits', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Only the sender or recipient may view the history
    const message = await prisma.message.findUnique({
      where: { id },
      select: { senderId: true, recipientId: true }
    });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId !== userId && message.recipientId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const history = await (prisma as any).messageEditHistory.findMany({
      where: { messageId: id },
      orderBy: { editedAt: 'asc' },
      include: { editedBy: { select: { id: true, username: true, displayName: true } } }
    });

    res.json({
      messageId: id,
      edits: history.map((h: any) => ({
        id: h.id,
        previousContent: h.previousContent,
        editedAt: h.editedAt,
        editedBy: {
          id: h.editedBy.id,
          username: h.editedBy.username,
          displayName: h.editedBy.displayName ?? null,
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching edit history:', error);
    res.status(500).json({ error: 'Failed to fetch edit history' });
  }
});

/**
 * @swagger
 * /api/messages/{id}/waveform:
 *   patch:
 *     summary: Update audio waveform data
 *     description: Called after client-side waveform analysis completes. Stores the waveform samples and broadcasts them to both parties via `audio:waveform` socket event.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - waveform
 *             properties:
 *               waveform:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Normalised amplitude samples (0–1), 10 per second
 *               duration:
 *                 type: number
 *                 description: Audio duration in seconds
 *     responses:
 *       200:
 *         description: Waveform saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: waveform array required
 *       401:
 *         description: Unauthorized
 */
// PATCH /api/messages/:id/waveform - Update waveform after client-side analysis
router.patch('/:id/waveform', authenticateToken as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { waveform, duration } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!waveform || !Array.isArray(waveform)) return res.status(400).json({ error: 'waveform array required' });

    const existing = await prisma.message.findUnique({ where: { id }, select: { senderId: true } });
    if (!existing) return res.status(404).json({ error: 'Message not found' });
    if (existing.senderId !== userId) return res.status(403).json({ error: 'Access denied' });

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

