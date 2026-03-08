import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';

const router = Router();
const prisma = new PrismaClient();

// All widget endpoints are open to any origin (used by 3rd-party sites)
const widgetCors = cors({ origin: '*', credentials: false });
router.use(widgetCors);
router.options('*', widgetCors);

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

export default router;

