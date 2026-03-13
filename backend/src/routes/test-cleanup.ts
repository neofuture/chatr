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
  'ProfileGrp ', 'Test Group ',
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
 * POST /api/test/mode
 * Body: { enabled: boolean }
 * Toggles E2E test mode at runtime. No auth required (but blocked in production).
 */
router.post('/mode', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled (boolean) required' });
  }
  const ok = setTestMode(enabled);
  res.json({ ok, testMode: enabled });
});

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
 * POST /api/test/restore-images
 * Restore profileImage and/or coverImage to their pre-test values.
 * Body: { profileImage?: string | null, coverImage?: string | null }
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

export default router;
