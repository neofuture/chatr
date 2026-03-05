import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { acceptConversation, declineConversation, nukeConversation, nukeByParticipants } from '../lib/conversation';
import { invalidateConversationCache, getSocketId } from '../lib/redis';
import { Server } from 'socket.io';

const router = Router();
const prisma = new PrismaClient();

let _io: Server | null = null;
export function setConversationsSocketIO(io: Server) { _io = io; }

interface AuthenticatedRequest {
  user?: { userId: string; username: string };
  params: any;
}

/**
 * @swagger
 * /api/conversations/{id}/accept:
 *   post:
 *     summary: Accept a message request
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Message request accepted
 *       403:
 *         description: Not authorised to accept this request
 *       404:
 *         description: Conversation not found
 */
router.post('/:id/accept', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const updated = await acceptConversation(id, userId);

    if (!updated) {
      return res.status(403).json({ error: 'Not authorised or conversation not found' });
    }

    // Invalidate cache for both participants
    await Promise.all([
      invalidateConversationCache(updated.participantA),
      invalidateConversationCache(updated.participantB),
    ]);

    // Notify the initiator via socket
    if (_io) {
      const initiatorSocketId = await getSocketId(updated.initiatorId);
      if (initiatorSocketId) {
        _io.to(`user:${updated.initiatorId}`).emit('conversation:accepted', {
          conversationId: updated.id,
          acceptedBy: userId,
        });
      }
    }

    res.json({ conversation: updated });
  } catch (error) {
    console.error('Error accepting conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/conversations/{id}/decline:
 *   post:
 *     summary: Decline a message request
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Message request declined
 *       403:
 *         description: Not authorised to decline this request
 *       404:
 *         description: Conversation not found
 */
router.post('/:id/decline', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    const result = await declineConversation(id, userId);
    if (!result) {
      return res.status(403).json({ error: 'Not authorised or conversation not found' });
    }

    // Invalidate cache for both participants
    await Promise.all([
      invalidateConversationCache(result.participantA),
      invalidateConversationCache(result.participantB),
    ]);

    // Notify the initiator via socket
    if (_io) {
      _io.to(`user:${result.initiatorId}`).emit('conversation:declined', {
        conversationId: id,
        declinedBy: userId,
        otherUserId: userId,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error declining conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/conversations/{id}/nuke:
 *   post:
 *     summary: Nuke a conversation (delete conversation + all messages between both users)
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation nuked
 *       403:
 *         description: Not authorised
 *       404:
 *         description: Conversation not found
 */
router.post('/:id/nuke', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const result = await nukeConversation(id, userId);
    if (!result) {
      return res.status(403).json({ error: 'Not authorised or conversation not found' });
    }

    await Promise.all([
      invalidateConversationCache(result.participantA),
      invalidateConversationCache(result.participantB),
    ]);

    // Notify both participants to remove the conversation
    if (_io) {
      _io.to(`user:${result.participantA}`).emit('conversation:declined', {
        conversationId: id,
        declinedBy: userId,
        otherUserId: result.participantB,
      });
      _io.to(`user:${result.participantB}`).emit('conversation:declined', {
        conversationId: id,
        declinedBy: userId,
        otherUserId: result.participantA,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error nuking conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/conversations/nuke-by-user/{recipientId}:
 *   post:
 *     summary: Nuke all messages and conversation with a specific user
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The other user's ID
 *     responses:
 *       200:
 *         description: Conversation nuked
 */
router.post('/nuke-by-user/:recipientId', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { recipientId } = req.params;
    const result = await nukeByParticipants(userId, recipientId);
    if (!result) {
      return res.status(500).json({ error: 'Failed to nuke' });
    }

    await Promise.all([
      invalidateConversationCache(result.participantA),
      invalidateConversationCache(result.participantB),
    ]);

    if (_io) {
      _io.to(`user:${result.participantA}`).emit('conversation:declined', {
        conversationId: null,
        declinedBy: userId,
        otherUserId: recipientId,
      });
      _io.to(`user:${result.participantB}`).emit('conversation:declined', {
        conversationId: null,
        declinedBy: userId,
        otherUserId: userId,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error nuking by user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
