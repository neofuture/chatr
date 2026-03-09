import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All widget endpoints are open to any origin (used by 3rd-party sites)
const widgetCors = cors({ origin: '*', credentials: false });
router.use(widgetCors);
router.options('*', widgetCors);

// ── Shared: delete a guest user and all their data ────────────────────────────
export async function deleteGuestUser(guestId: string): Promise<void> {
  try {
    // Delete messages sent/received by this guest
    await prisma.message.deleteMany({
      where: { OR: [{ senderId: guestId }, { recipientId: guestId }] },
    });
    // Delete conversations involving this guest
    await prisma.conversation.deleteMany({
      where: { OR: [{ participantA: guestId }, { participantB: guestId }] },
    });
    // Delete the guest user record
    await prisma.user.delete({ where: { id: guestId } });
  } catch (err) {
    console.error('❌ deleteGuestUser error:', err);
  }
}

// ── Cleanup: delete guest users with no conversations older than 60 minutes ───
export async function cleanupStaleGuests(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 60 minutes ago

    // Find all guest users created more than 60 minutes ago
    const staleGuests = await prisma.user.findMany({
      where: { isGuest: true, createdAt: { lt: cutoff } },
      select: { id: true },
    });

    if (!staleGuests.length) return;

    // Find which of those have at least one conversation
    const guestIds = staleGuests.map(g => g.id);
    const withConversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participantA: { in: guestIds } },
          { participantB: { in: guestIds } },
        ],
      },
      select: { participantA: true, participantB: true },
    });

    const hasConvo = new Set<string>();
    for (const c of withConversations) {
      hasConvo.add(c.participantA);
      hasConvo.add(c.participantB);
    }

    const toDelete = staleGuests.filter(g => !hasConvo.has(g.id));
    if (!toDelete.length) return;

    // Delete their messages first (safety), then users
    await prisma.message.deleteMany({
      where: { OR: [{ senderId: { in: toDelete.map(g => g.id) } }, { recipientId: { in: toDelete.map(g => g.id) } }] },
    });
    await prisma.user.deleteMany({
      where: { id: { in: toDelete.map(g => g.id) } },
    });

    console.log(`🧹 Cleaned up ${toDelete.length} stale guest user(s)`);
  } catch (err) {
    console.error('❌ cleanupStaleGuests error:', err);
  }
}

// ── GET /api/widget/support-agent ─────────────────────────────────────────────
// Returns the active support agent's public info so the widget can display it
router.get('/support-agent', async (_req: Request, res: Response) => {
  try {
    const agent = await prisma.user.findFirst({
      where: { isSupport: true, emailVerified: true },
      select: {
        id: true,
        displayName: true,
        username: true,
        profileImage: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'No support agent configured' });
    }

    return res.json({
      id: agent.id,
      displayName: agent.displayName || agent.username,
      username: agent.username,
      profileImage: agent.profileImage,
    });
  } catch (err) {
    console.error('❌ widget/support-agent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/widget/guest-session ────────────────────────────────────────────
// Creates (or resumes) a guest user and returns a short-lived JWT
router.post('/guest-session', async (req: Request, res: Response) => {
  try {
    const { guestName, guestId } = req.body as { guestName: string; guestId?: string };

    if (!guestName || !guestName.trim()) {
      return res.status(400).json({ error: 'guestName is required' });
    }

    const trimmedName = guestName.trim().slice(0, 60);

    // Find support agent
    const agent = await prisma.user.findFirst({
      where: { isSupport: true, emailVerified: true },
      select: { id: true },
    });

    if (!agent) {
      return res.status(503).json({ error: 'Support is currently unavailable' });
    }

    let guestUser;

    // If the widget provides a guestId, try to resume that session
    if (guestId) {
      guestUser = await prisma.user.findFirst({
        where: { id: guestId, isGuest: true },
        select: { id: true, username: true, displayName: true },
      });
    }

    // Create a new guest user if no existing session
    if (!guestUser) {
      const slug = `widget_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const hashedPassword = await bcrypt.hash(slug + '_guest', 10);

      guestUser = await prisma.user.create({
        data: {
          username: slug,
          displayName: trimmedName,
          email: null,
          password: hashedPassword,
          emailVerified: true,
          isGuest: true,
          showOnlineStatus: false,
        },
        select: { id: true, username: true, displayName: true },
      });
    } else {
      // Update display name in case it changed
      guestUser = await prisma.user.update({
        where: { id: guestUser.id },
        data: { displayName: trimmedName },
        select: { id: true, username: true, displayName: true },
      });
    }

    // Issue a short-lived JWT (same shape as auth JWT so existing WS middleware accepts it)
    const token = jwt.sign(
      { userId: guestUser.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      guestId: guestUser.id,
      guestName: guestUser.displayName,
      supportAgentId: agent.id,
    });
  } catch (err) {
    console.error('❌ widget/guest-session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/widget/history ───────────────────────────────────────────────────
// Returns message history for a resumed guest session (last 100 messages)
router.get('/history', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const guestId = req.user?.userId;
    if (!guestId) return res.status(401).json({ error: 'Unauthorized' });

    const guest = await prisma.user.findUnique({
      where: { id: guestId },
      select: { id: true, isGuest: true },
    });
    if (!guest?.isGuest) return res.status(403).json({ error: 'Not a guest session' });

    const agent = await prisma.user.findFirst({
      where: { isSupport: true, emailVerified: true },
      select: { id: true },
    });
    if (!agent) return res.json({ messages: [] });

    const messages = await prisma.message.findMany({
      where: {
        type: { not: 'system' },
        OR: [
          { senderId: guestId,  recipientId: agent.id },
          { senderId: agent.id, recipientId: guestId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        content: true,
        type: true,
        createdAt: true,
      },
    });

    return res.json({ messages });
  } catch (err) {
    console.error('❌ widget/history error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/widget/end-chat ─────────────────────────────────────────────────
// Also disconnects cleanly — does NOT delete the user (agent may still want to review).
let _widgetIo: any = null;
export function setWidgetSocketIO(io: any) { _widgetIo = io; }

router.post('/end-chat', authenticateToken as any, async (req: any, res: Response) => {
  try {
    const guestId = req.user?.userId;
    if (!guestId) return res.status(401).json({ error: 'Unauthorized' });

    // Verify this is actually a guest user
    const guest = await prisma.user.findUnique({
      where: { id: guestId },
      select: { id: true, isGuest: true, displayName: true },
    });
    if (!guest?.isGuest) return res.status(403).json({ error: 'Not a guest session' });

    // Find the support agent
    const agent = await prisma.user.findFirst({
      where: { isSupport: true, emailVerified: true },
      select: { id: true },
    });

    const guestName = guest.displayName || 'Guest';

    if (agent) {
      // Send a system message so it's visible in chat history
      await prisma.message.create({
        data: {
          senderId: guestId,
          recipientId: agent.id,
          content: `${guestName} has left the chat.`,
          type: 'system',
        },
      });

      // Emit real-time notification to the support agent
      if (_widgetIo) {
        _widgetIo.to(`user:${agent.id}`).emit('guest:left', {
          guestId,
          guestName,
          message: `${guestName} has left the chat.`,
        });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ widget/end-chat error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

