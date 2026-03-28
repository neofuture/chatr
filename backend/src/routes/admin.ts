import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

let _adminIo: any = null;
export function setAdminSocketIO(io: any) { _adminIo = io; }

async function requireSupport(req: Request, res: Response): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { isSupport: true },
  });
  if (!user?.isSupport) {
    res.status(403).json({ error: 'Support access required' });
    return false;
  }
  return true;
}

router.get('/widget-contacts', authenticateToken, async (req: Request, res: Response) => {
  try {
  if (!(await requireSupport(req, res))) return;

  const guests = await prisma.user.findMany({
    where: { isGuest: true },
    select: {
      id: true,
      displayName: true,
      contactEmail: true,
      createdAt: true,
      sentMessages: {
        select: { id: true, content: true, type: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      _count: {
        select: {
          sentMessages: true,
          receivedMessages: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const contacts = guests.map((g) => {
    const totalMessages = g._count.sentMessages + g._count.receivedMessages;
    const firstMessage = g.sentMessages[0] || null;

    return {
      id: g.id,
      name: g.displayName,
      contactEmail: g.contactEmail,
      createdAt: g.createdAt,
      hasConversation: totalMessages > 0,
      totalMessages,
      firstMessage: firstMessage
        ? { content: firstMessage.content, createdAt: firstMessage.createdAt }
        : null,
    };
  });

  return res.json(contacts);
  } catch (err) {
    console.error('Admin widget-contacts error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/widget-contacts/:guestId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
  if (!(await requireSupport(req, res))) return;

  const { guestId } = req.params;

  const guest = await prisma.user.findFirst({
    where: { id: guestId, isGuest: true },
    select: { id: true, displayName: true, contactEmail: true, widgetContext: true },
  });

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: guestId }, { recipientId: guestId }],
    },
    select: {
      id: true,
      content: true,
      type: true,
      senderId: true,
      recipientId: true,
      createdAt: true,
      sender: { select: { displayName: true, isGuest: true, isSupport: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return res.json({ guest, messages });
  } catch (err) {
    console.error('Admin widget-contacts messages error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/widget-contacts/:guestId', authenticateToken, async (req: Request, res: Response) => {
  try {
  if (!(await requireSupport(req, res))) return;

  const { guestId } = req.params;

  const guest = await prisma.user.findFirst({
    where: { id: guestId, isGuest: true },
  });

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found' });
  }

  await prisma.message.deleteMany({
    where: { OR: [{ senderId: guestId }, { recipientId: guestId }] },
  });
  await prisma.conversation.deleteMany({
    where: { OR: [{ participantA: guestId }, { participantB: guestId }] },
  });
  await prisma.user.delete({ where: { id: guestId } });

  return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete widget-contact error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/widget-contacts/:guestId/reply', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!(await requireSupport(req, res))) return;

    const { guestId } = req.params;
    const { content } = req.body as { content?: string };

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const guest = await prisma.user.findFirst({
      where: { id: guestId, isGuest: true },
    });

    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    const supportUserId = req.user!.userId;

    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participantA: supportUserId, participantB: guestId },
          { participantA: guestId, participantB: supportUserId },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { participantA: supportUserId, participantB: guestId, initiatorId: supportUserId, status: 'accepted' },
      });
    }

    const message = await prisma.message.create({
      data: {
        senderId: supportUserId,
        recipientId: guestId,
        content: content.trim(),
        type: 'text',
      },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        content: true,
        type: true,
        createdAt: true,
        sender: { select: { displayName: true, isGuest: true, isSupport: true } },
      },
    });

    if (_adminIo) {
      _adminIo.to(`user:${guestId}`).emit('message:received', message);
    }

    return res.json({ message });
  } catch (err) {
    console.error('Admin reply error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
