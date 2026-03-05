import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { isTokenBlacklisted } from '../lib/redis';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Check if token has been blacklisted (logout)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const blacklisted = await isTokenBlacklisted(tokenHash).catch(() => false);
    if (blacklisted) {
      return res.status(403).json({ error: 'Token has been revoked' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your_secret_key_change_in_production'
    ) as { userId: string; username: string };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
