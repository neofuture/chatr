/**
 * test-cleanup.ts
 *
 * E2E test support routes:
 *  - POST /api/test/mode       — enable/disable test mode at runtime
 *  - POST /api/test/cleanup    — surgical E2E data removal
 *  - POST /api/test/restore-images — restore profile/cover images
 *
 * All routes return 404 in production.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { isTestMode, setTestMode } from '../lib/testMode';

const router = Router();

const E2E_GROUP_PREFIXES = [
  'UI Group ', 'Admin Test ', 'Ownership Test ', 'Kick Test ',
  'Leave Test ', 'Delete Test ', 'E2E GrpMsg ', 'E2E Group ',
  'ProfileGrp ', 'Test Group ', 'Promote Test ',
];

const E2E_DM_CONTENT_PREFIXES = [
  'Hello ',
  'Unsend ',
  'E2E test msg ',
  'Link https://example.com ',
  'Group msg ',
  'Realtime group ',
  'Check https://example.com ',
  'Accept test ',
  'Decline test ',
  'Nuke test ',
  'UI accept test ',
  'Should fail',
];

const E2E_FILE_NAMES = ['test-image.png', 'test-audio.wav', 'test-file.txt'];

/**
 * @swagger
 * /api/test/mode:
 *   post:
 *     summary: Toggle E2E test mode
 *     description: Enable or disable test mode at runtime. Blocked in production (404).
 *     tags: [Testing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [enabled]
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Test mode toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 testMode:
 *                   type: boolean
 *       404:
 *         description: Not available in production
 */
router.post('/mode', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) required' });
  }
  const ok = await setTestMode(enabled);
  res.json({ ok, testMode: enabled });
});

/**
 * @swagger
 * /api/test/cleanup:
 *   post:
 *     summary: Surgical E2E test-data cleanup
 *     description: >
 *       Deletes DM messages and groups created by E2E tests, matched by
 *       known content prefixes and file names. Also removes empty
 *       conversations left behind. Only available when test mode is active;
 *       returns 404 otherwise.
 *     tags: [Testing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientId]
 *             properties:
 *               recipientId:
 *                 type: string
 *                 format: uuid
 *                 description: The other user in the DM conversation to clean up
 *     responses:
 *       200:
 *         description: Cleanup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 messagesDeleted:
 *                   type: integer
 *                   example: 12
 *                 groupsDeleted:
 *                   type: integer
 *                   example: 3
 *       400:
 *         description: Missing recipientId
 *       401:
 *         description: Unauthorized (invalid or missing JWT)
 *       404:
 *         description: Test mode is not active
 *       500:
 *         description: Cleanup failed
 */
router.post('/cleanup', authenticateToken as any, async (req: Request, res: Response) => {
  if (!isTestMode()) {
    return res.status(404).json({ error: 'Not found' });
  }

  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { recipientId } = req.body;
  if (!recipientId) return res.status(400).json({ error: 'recipientId required' });

  const stats = { messagesDeleted: 0, groupsDeleted: 0 };

  try {
    // ── Delete DM messages matching E2E test patterns ────────────────────
    const dmMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId },
          { senderId: recipientId, recipientId: userId },
        ],
      },
      select: { id: true, content: true, fileName: true },
    });

    const testMsgIds = dmMessages
      .filter(m => {
        if (E2E_DM_CONTENT_PREFIXES.some(p => m.content.startsWith(p))) return true;
        if (m.fileName && E2E_FILE_NAMES.includes(m.fileName)) return true;
        if (m.content === 'Voice message' && m.fileName?.startsWith('voice-')) return true;
        return false;
      })
      .map(m => m.id);

    if (testMsgIds.length > 0) {
      const del = await prisma.message.deleteMany({ where: { id: { in: testMsgIds } } });
      stats.messagesDeleted = del.count;
    }

    // Clean up conversations that now have zero messages between the two users
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participantA: userId, participantB: recipientId },
          { participantA: recipientId, participantB: userId },
        ],
      },
      select: { id: true },
    });

    for (const conv of conversations) {
      const remaining = await prisma.message.count({
        where: {
          OR: [
            { senderId: userId, recipientId },
            { senderId: recipientId, recipientId: userId },
          ],
        },
      });
      if (remaining === 0) {
        await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => {});
      }
    }

    // ── Delete test groups by name prefix ────────────────────────────────
    const testGroups = await prisma.group.findMany({
      where: {
        OR: E2E_GROUP_PREFIXES.map(p => ({ name: { startsWith: p } })),
      },
      select: { id: true },
    });

    if (testGroups.length > 0) {
      const groupIds = testGroups.map(g => g.id);
      await prisma.groupMessage.deleteMany({ where: { groupId: { in: groupIds } } });
      await prisma.groupMember.deleteMany({ where: { groupId: { in: groupIds } } });
      const gDel = await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
      stats.groupsDeleted = gDel.count;
    }

    res.json({ ok: true, ...stats });
  } catch (err) {
    console.error('❌ Test cleanup error:', err);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

/**
 * @swagger
 * /api/test/cleanup-all:
 *   post:
 *     summary: Aggressive cleanup of ALL test groups
 *     description: Deletes all groups matching E2E name prefixes and their messages. No auth required — test mode only.
 *     tags: [Testing]
 *     responses:
 *       200:
 *         description: Cleanup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 groupsDeleted:
 *                   type: integer
 *                 messagesDeleted:
 *                   type: integer
 *       404:
 *         description: Test mode is not active
 */
router.post('/cleanup-all', async (_req: Request, res: Response) => {
  if (!isTestMode()) {
    return res.status(404).json({ error: 'Not found' });
  }

  const stats = { groupsDeleted: 0, messagesDeleted: 0 };

  try {
    // Delete all test groups by name prefix
    const testGroups = await prisma.group.findMany({
      where: {
        OR: E2E_GROUP_PREFIXES.map(p => ({ name: { startsWith: p } })),
      },
      select: { id: true, name: true },
    });

    if (testGroups.length > 0) {
      const groupIds = testGroups.map(g => g.id);
      console.log(`🧹 Cleaning up ${testGroups.length} test groups:`, testGroups.map(g => g.name));
      
      const msgDel = await prisma.groupMessage.deleteMany({ where: { groupId: { in: groupIds } } });
      stats.messagesDeleted = msgDel.count;
      
      await prisma.groupMember.deleteMany({ where: { groupId: { in: groupIds } } });
      const gDel = await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
      stats.groupsDeleted = gDel.count;
    }

    console.log(`✅ Test cleanup complete: ${stats.groupsDeleted} groups, ${stats.messagesDeleted} messages`);
    res.json({ ok: true, ...stats });
  } catch (err) {
    console.error('❌ Test cleanup-all error:', err);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

/**
 * @swagger
 * /api/test/restore-images:
 *   post:
 *     summary: Restore profile/cover images to pre-test values
 *     description: Resets profileImage and/or coverImage for the authenticated user. Test mode only.
 *     tags: [Testing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 nullable: true
 *               coverImage:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Images restored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *       404:
 *         description: Test mode is not active
 */
router.post('/restore-images', authenticateToken as any, async (req: Request, res: Response) => {
  if (!isTestMode()) {
    return res.status(404).json({ error: 'Not found' });
  }

  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const data: Record<string, any> = {};
    if ('profileImage' in req.body) data.profileImage = req.body.profileImage;
    if ('coverImage' in req.body) data.coverImage = req.body.coverImage;

    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: userId }, data });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Restore images error:', err);
    res.status(500).json({ error: 'Restore failed' });
  }
});

/**
 * @swagger
 * /api/test/user/{userId}:
 *   delete:
 *     summary: Delete a test user and all related data
 *     description: Removes the user and cascading data (messages, memberships, friendships, conversations). Test mode only.
 *     tags: [Testing]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the test user to delete
 *     responses:
 *       200:
 *         description: User deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *       404:
 *         description: Test mode is not active
 */
router.delete('/user/:userId', async (req: Request, res: Response) => {
  if (!isTestMode()) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // Delete related data first to satisfy foreign key constraints
    await prisma.messageReaction.deleteMany({ where: { message: { OR: [{ senderId: userId }, { recipientId: userId }] } } });
    await prisma.message.deleteMany({ where: { OR: [{ senderId: userId }, { recipientId: userId }] } });
    await prisma.groupMessage.deleteMany({ where: { senderId: userId } });
    await prisma.groupMember.deleteMany({ where: { userId } });
    await prisma.friendship.deleteMany({ where: { OR: [{ requesterId: userId }, { addresseeId: userId }] } });
    await prisma.conversation.deleteMany({ where: { OR: [{ participantA: userId }, { participantB: userId }] } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Delete test user error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
