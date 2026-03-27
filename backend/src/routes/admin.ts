import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

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
  if (!(await requireSupport(req, res))) return;

  const guests = await prisma.user.findMany({
    where: { isGuest: true },
    select: {
      id: true,
      displayName: true,
      contactEmail: true,
      createdAt: true,
      conversationsAsA: {
        select: {
          id: true,
          participantB: true,
          createdAt: true,
          messages: {
            select: { id: true, content: true, type: true, senderId: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
      },
      conversationsAsB: {
        select: {
          id: true,
          participantA: true,
          createdAt: true,
          messages: {
            select: { id: true, content: true, type: true, senderId: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const contacts = guests.map((g) => {
    const convos = [...g.conversationsAsA, ...g.conversationsAsB];
    const firstConvo = convos[0];
    const firstMessage = firstConvo?.messages[0] || null;
    const totalMessages = convos.reduce((sum, c) => sum + c._count.messages, 0);

    return {
      id: g.id,
      name: g.displayName,
      contactEmail: g.contactEmail,
      createdAt: g.createdAt,
      hasConversation: convos.length > 0,
      totalMessages,
      firstMessage: firstMessage
        ? { content: firstMessage.content, createdAt: firstMessage.createdAt }
        : null,
    };
  });

  return res.json(contacts);
});

router.get('/widget-contacts/:guestId/messages', authenticateToken, async (req: Request, res: Response) => {
  if (!(await requireSupport(req, res))) return;

  const { guestId } = req.params;

  const guest = await prisma.user.findFirst({
    where: { id: guestId, isGuest: true },
    select: { id: true, displayName: true, contactEmail: true },
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
});

router.delete('/widget-contacts/:guestId', authenticateToken, async (req: Request, res: Response) => {
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
});

export default router;
