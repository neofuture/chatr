import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { sendVerificationEmail, sendLoginVerificationEmail, sendPasswordResetEmail } from '../services/email';
import { sendPhoneVerificationSMS, sendLoginVerificationSMS, validatePhoneNumber, formatPhoneNumber } from '../services/sms';
import {
  checkRateLimit,
  storeVerificationCode,
  getVerificationCode,
  deleteVerificationCode,
  blacklistToken,
  isTokenBlacklisted,
} from '../lib/redis';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Rate-limit middleware factory
function rateLimit(prefix: string, maxAttempts: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: Function) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${prefix}:${ip}`;
    try {
      const result = await checkRateLimit(key, maxAttempts, windowSeconds);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too many attempts. Please try again later.',
          retryAfter: result.retryAfter,
        });
      }
    } catch (_) { /* Redis down — allow request through */ }
    next();
  };
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Must include at least one capital letter and one special character
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 requiresTwoFactorSetup:
 *                   type: boolean
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email or username already exists
 */
// POST /api/auth/register - User registration (5 attempts per 15 min per IP)
router.post('/register', rateLimit('register', 5, 900), async (req: Request, res: Response) => {
  try {
    console.log('\n🔵 === REGISTRATION REQUEST START ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { email, phoneNumber, username, password, firstName, lastName, gender } = req.body;

    console.log('Extracted values:', { email, phoneNumber, username, firstName, lastName, gender, hasPassword: !!password });

    // Validate input - require either email or phone number
    if ((!email && !phoneNumber) || !username || !password) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        error: 'Email or phone number, username, and password are required'
      });
    }

    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: 'First name is required' });
    }
    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ error: 'Last name is required' });
    }

    // Validate gender if provided
    const validGenders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
    if (gender && !validGenders.includes(gender)) {
      return res.status(400).json({ error: 'Invalid gender value' });
    }

    const displayName = `${firstName.trim()} ${lastName.trim()}`;

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Validate phone number format if provided
    let formattedPhone = null;
    if (phoneNumber) {
      console.log('📱 Validating phone number:', phoneNumber);
      if (!validatePhoneNumber(phoneNumber)) {
        console.log('❌ Phone validation failed');
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
      formattedPhone = formatPhoneNumber(phoneNumber);
      console.log('✅ Phone formatted to:', formattedPhone);
    }

    // Validate username (must start with @ and be alphanumeric)
    const usernameWithAt = username.startsWith('@') ? username : `@${username}`;
    const usernameRegex = /^@[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(usernameWithAt)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters, alphanumeric and underscores only'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters'
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        error: 'Password must include at least one capital letter'
      });
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return res.status(400).json({
        error: 'Password must include at least one special character'
      });
    }

    // Check if email already exists (only if email is provided)
    let existingEmail = null;
    if (email) {
      existingEmail = await prisma.user.findUnique({
        where: { email }
      });

      // If email exists but is NOT verified, allow re-registration with new code
      if (existingEmail && existingEmail.emailVerified) {
        return res.status(409).json({ error: 'Email already registered and verified. Please login.' });
      }
    }

    // Dev phone numbers that allow multiple registrations (for testing)
    const DEV_PHONE_NUMBERS = [
      '+447940147138',  // Main dev number
      '07940147138',    // UK format
    ];

    console.log('🔍 Checking dev phone bypass...');
    console.log('   Formatted phone:', formattedPhone);
    console.log('   Dev numbers whitelist:', DEV_PHONE_NUMBERS);

    // Check if phone number already exists (only if phone is provided)
    let existingPhone = null;
    const isDevPhone = formattedPhone && DEV_PHONE_NUMBERS.includes(formattedPhone);

    console.log('   Is dev phone?', isDevPhone);

    if (formattedPhone && !isDevPhone) {
      // For NON-dev phones: check for duplicates
      console.log('🔍 Checking for existing phone in database...');
      existingPhone = await prisma.user.findFirst({
        where: { phoneNumber: formattedPhone }
      });
      console.log('   Found existing phone?', !!existingPhone);

      // If phone exists and is verified, don't allow re-registration
      if (existingPhone && existingPhone.phoneVerified) {
        console.log('❌ Phone already verified (not dev phone)');
        return res.status(409).json({ error: 'Phone number already registered and verified. Please login.' });
      }
    } else if (isDevPhone) {
      // For dev phones: allow duplicates, but check if one exists for update logic
      console.log('🔧 Dev phone detected - allowing duplicate registration');
      existingPhone = await prisma.user.findFirst({
        where: { phoneNumber: formattedPhone }
      });
      if (existingPhone) {
        console.log(`   Existing dev phone user found: ${existingPhone.username}`);
      }
    }

    // Check if username already exists (but different from existing unverified user)
    const existingUsername = await prisma.user.findUnique({
      where: { username: usernameWithAt }
    });
    if (existingUsername) {
      // Allow if it's the same user trying to re-register (unverified)
      const isSameUser = (email && existingUsername.email === email) ||
                         (formattedPhone && existingUsername.phoneNumber === formattedPhone);
      if (!isSameUser) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry to 15 minutes from now
    const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000);

    let user;

    // If user exists but is unverified, update them instead of creating new
    if (existingEmail && !existingEmail.emailVerified) {
      user = await prisma.user.update({
        where: { email },
        data: {
          username: usernameWithAt,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName,
          password: hashedPassword,
          phoneNumber: formattedPhone,
          gender: gender || null,
          emailVerificationCode: verificationCode,
          verificationExpiry: verificationExpiry,
        },
        select: { id: true, email: true, phoneNumber: true, username: true, displayName: true, createdAt: true }
      });
      console.log(`📧 Re-sending verification code to unverified user: ${email}`);
    } else if (existingPhone && !existingPhone.phoneVerified && formattedPhone && !isDevPhone) {
      user = await prisma.user.update({
        where: { id: existingPhone.id },
        data: {
          username: usernameWithAt,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName,
          password: hashedPassword,
          email: email,
          gender: gender || null,
          emailVerificationCode: verificationCode,
          verificationExpiry: verificationExpiry,
        },
        select: { id: true, email: true, phoneNumber: true, username: true, displayName: true, createdAt: true }
      });
      console.log(`📱 Re-sending verification code to unverified user: ${formattedPhone}`);
    } else {
      console.log('📝 Creating new user...');
      if (isDevPhone) console.log('🔧 Creating new user with dev phone number (duplicates allowed)');

      user = await prisma.user.create({
        data: {
          email,
          phoneNumber: formattedPhone,
          username: usernameWithAt,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName,
          password: hashedPassword,
          gender: gender || null,
          emailVerified: false,
          phoneVerified: false,
          emailVerificationCode: verificationCode,
          verificationExpiry: verificationExpiry,
        },
        select: { id: true, email: true, phoneNumber: true, username: true, displayName: true, createdAt: true }
      });
    }

    // Store verification code in Redis (15 min TTL — auto-expires)
    await storeVerificationCode('email', user.id, verificationCode).catch(() => {});

    console.log(`Verification code for user ${user.id}: ${verificationCode}`);

    // Send email verification (if email provided)
    if (email) {
      console.log(`Email: ${email}`);
      console.log(`Email verification link: http://localhost:3000/verify?code=${verificationCode}&userId=${user.id}`);
      await sendVerificationEmail(email, verificationCode, user.id);
      console.log('✅ Email verification sent');
    }

    // Don't send SMS yet - it will be sent after email verification
    if (formattedPhone) {
      console.log(`📱 Phone number saved: ${formattedPhone}`);
      console.log(`📱 SMS will be sent after email verification`);
    }

    // Return user ID for verification
    console.log('✅ Registration successful for user:', user.id);
    console.log('🔵 === REGISTRATION REQUEST END ===\n');

    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification code.',
      userId: user.id,
      requiresEmailVerification: true,
    });
  } catch (error) {
    console.error('❌ === REGISTRATION ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('🔴 === REGISTRATION REQUEST END WITH ERROR ===\n');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user with email or username
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email address or username (with or without @ prefix)
 *                 example: user@example.com or @johndoe or johndoe
 *               password:
 *                 type: string
 *               twoFactorCode:
 *                 type: string
 *                 description: 6-digit TOTP code (required if 2FA enabled)
 *     responses:
 *       200:
 *         description: Login successful or 2FA required
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     requiresTwoFactor:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *       401:
 *         description: Invalid credentials or 2FA code
 */
// POST /api/auth/login - User login (10 attempts per 15 min per IP)
router.post('/login', rateLimit('login', 10, 900), async (req: Request, res: Response) => {
  try {
    const { email, password, loginVerificationCode, verificationMethod } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email/username and password are required'
      });
    }

    // Find user by email OR username
    let user;

    // Check if input looks like an email (contains @ and .)
    if (email.includes('@') && email.includes('.')) {
      // Login with email
      user = await prisma.user.findUnique({
        where: { email }
      });
    } else {
      // Login with username
      const usernameWithAt = email.startsWith('@') ? email : `@${email}`;
      user = await prisma.user.findUnique({
        where: { username: usernameWithAt }
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      // Generate new email verification code
      const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationCode: emailCode,
          verificationExpiry: expiry,
        },
      });

      await sendVerificationEmail(user.email!, emailCode, user.id);

      return res.status(200).json({
        requiresEmailVerification: true,
        message: 'Please verify your email before logging in',
        userId: user.id,
      });
    }

    // Check if phone is verified
    if (!user.phoneVerified) {
      // Generate new phone verification code
      const phoneCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          phoneVerificationCode: phoneCode,
          verificationExpiry: expiry,
        },
      });

      if (user.phoneNumber) {
        await sendPhoneVerificationSMS(user.phoneNumber, phoneCode, user.username);
      }

      return res.status(200).json({
        requiresPhoneVerification: true,
        message: 'Please verify your phone number before logging in',
        userId: user.id,
      });
    }

    // If loginVerificationCode is provided, verify it
    if (loginVerificationCode) {
      // Check Redis first, fall back to DB
      let loginCodeValid = false;
      const redisLoginCode = await getVerificationCode('login', user.id).catch(() => null);
      if (redisLoginCode) {
        loginCodeValid = redisLoginCode.code === loginVerificationCode;
      } else {
        if (!user.loginVerificationCode || !user.loginVerificationExpiry) {
          return res.status(400).json({ error: 'No verification code found. Please log in again.' });
        }
        if (new Date() > user.loginVerificationExpiry) {
          return res.status(401).json({ error: 'Verification code has expired. Please log in again.' });
        }
        loginCodeValid = user.loginVerificationCode === loginVerificationCode;
      }

      if (!loginCodeValid) {
        return res.status(401).json({ error: 'Invalid verification code' });
      }

      // Clear the verification code
      await deleteVerificationCode('login', user.id).catch(() => {});
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginVerificationCode: null,
          loginVerificationExpiry: null,
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || 'your_secret_key_change_in_production',
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt,
          emailVerified: user.emailVerified,
        },
      });
    }

    // Password is correct, send verification code via chosen method
    // Default to SMS if no method specified
    const method = verificationMethod || 'sms';

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry to 15 minutes from now
    const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000);

    // Store in both Redis (primary, auto-expires) and DB (fallback)
    await storeVerificationCode('login', user.id, verificationCode, { method }).catch(() => {});
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginVerificationCode: verificationCode,
        loginVerificationExpiry: verificationExpiry,
        loginVerificationMethod: method,
      },
    });

    console.log(`Login verification code for ${user.email}: ${verificationCode} (method: ${method})`);

    // Send verification code via chosen method
    if (method === 'sms') {
      // Send SMS
      if (user.phoneNumber) {
        await sendLoginVerificationSMS(user.phoneNumber, verificationCode, user.username);
        res.status(200).json({
          requiresLoginVerification: true,
          verificationMethod: 'sms',
          message: 'Please check your phone for the verification code',
          userId: user.id,
        });
      } else {
        return res.status(400).json({ error: 'No phone number on file. Please use email verification.' });
      }
    } else {
      // Send email (default)
      await sendLoginVerificationEmail(user.email!, verificationCode, user.username);
      res.status(200).json({
        requiresLoginVerification: true,
        verificationMethod: 'email',
        message: 'Please check your email for the verification code',
        userId: user.id,
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/2fa/setup:
 *   post:
 *     summary: Generate 2FA secret and QR code
 *     tags: [2FA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 2FA setup data generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret:
 *                   type: string
 *                 qrCode:
 *                   type: string
 *                   description: Base64 encoded QR code image
 *                 otpauth:
 *                   type: string
 *       404:
 *         description: User not found
 */
// POST /api/auth/2fa/setup - Generate 2FA secret and QR code
router.post('/2fa/setup', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Chatr (${user.username})`,
      issuer: 'Chatr',
    });

    // Save secret to user (but don't enable 2FA yet)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false, // Will be enabled after verification
      },
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    res.status(200).json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      otpauth: secret.otpauth_url,
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/2fa/verify:
 *   post:
 *     summary: Verify 2FA code and enable 2FA
 *     tags: [2FA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - code
 *             properties:
 *               userId:
 *                 type: string
 *               code:
 *                 type: string
 *                 description: 6-digit TOTP code
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid 2FA code
 */
// POST /api/auth/2fa/verify - Verify 2FA code and enable 2FA
router.post('/2fa/verify', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { code } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      return res.status(404).json({ error: 'User not found or 2FA not set up' });
    }

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    // Enable 2FA for the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your_secret_key_change_in_production',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: '2FA enabled successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        twoFactorEnabled: true,
      },
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout - User logout (blacklist the JWT in Redis)
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(400).json({ error: 'No token provided' });

    // Hash the token for storage (don't store raw JWTs)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Decode to get the expiry so we only blacklist until it naturally expires
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 7 * 24 * 60 * 60;

    if (expiresIn > 0) {
      await blacklistToken(tokenHash, expiresIn);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email with 6-digit code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - code
 *             properties:
 *               userId:
 *                 type: string
 *               code:
 *                 type: string
 *                 description: 6-digit verification code
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       401:
 *         description: Invalid or expired code
 */
// POST /api/auth/verify-email - Verify email with code
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and code are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Check Redis first for verification code, fall back to DB
    let codeValid = false;
    const redisCode = await getVerificationCode('email', userId).catch(() => null);
    if (redisCode) {
      codeValid = redisCode.code === code;
    } else {
      // Fallback to DB columns
      codeValid = user.emailVerificationCode === code;
      if (codeValid && user.verificationExpiry && user.verificationExpiry < new Date()) {
        return res.status(401).json({ error: 'Verification code expired. Please request a new one.' });
      }
    }

    if (!codeValid) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Mark email as verified and clear DB columns
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerificationCode: null,
        verificationExpiry: null,
      },
    });

    // Clear Redis code
    await deleteVerificationCode('email', userId).catch(() => {});

    // If no phone number, skip phone verification — issue token immediately
    if (!user.phoneNumber) {
      await prisma.user.update({
        where: { id: userId },
        data: { phoneVerified: true },
      });


      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || 'your_secret_key_change_in_production',
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        message: 'Email verified successfully. Registration complete!',
        token,
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: null,
          username: user.username,
          emailVerified: true,
          phoneVerified: true,
        },
      });
    }

    // User has a phone number — send phone verification code
    const phoneCode = Math.floor(100000 + Math.random() * 900000).toString();
    const phoneExpiry = new Date(Date.now() + 15 * 60 * 1000);

    // Store in both Redis (primary, auto-expires) and DB (fallback)
    await storeVerificationCode('phone', userId, phoneCode).catch(() => {});
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerificationCode: phoneCode,
        verificationExpiry: phoneExpiry,
      },
    });

    console.log(`Phone verification code for ${user.phoneNumber}: ${phoneCode}`);

    try {
      await sendPhoneVerificationSMS(user.phoneNumber, phoneCode, user.username);
      console.log('✅ SMS sent successfully');
    } catch (smsError) {
      console.error('❌ Failed to send SMS:', smsError);
    }

    res.status(200).json({
      message: 'Email verified successfully. Please verify your phone number.',
      requiresPhoneVerification: true,
      phoneNumber: user.phoneNumber,
      userId: user.id,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/verify-phone:
 *   post:
 *     summary: Verify phone number with code (returns JWT token)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - code
 *             properties:
 *               userId:
 *                 type: string
 *               code:
 *                 type: string
 *                 description: 6-digit verification code
 *     responses:
 *       200:
 *         description: Phone verified successfully, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT token (valid for 7 days)
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     username:
 *                       type: string
 *                     emailVerified:
 *                       type: boolean
 *                     phoneVerified:
 *                       type: boolean
 *       401:
 *         description: Invalid or expired code
 */
// POST /api/auth/verify-phone - Verify phone with code
router.post('/verify-phone', async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and code are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is verified first
    if (!user.emailVerified) {
      return res.status(400).json({ error: 'Please verify your email first' });
    }

    // Check if already verified
    if (user.phoneVerified) {
      return res.status(400).json({ error: 'Phone already verified' });
    }

    // Check Redis first, fall back to DB
    let phoneCodeValid = false;
    const redisPhoneCode = await getVerificationCode('phone', userId).catch(() => null);
    if (redisPhoneCode) {
      phoneCodeValid = redisPhoneCode.code === code;
    } else {
      phoneCodeValid = user.phoneVerificationCode === code;
      if (phoneCodeValid && user.verificationExpiry && user.verificationExpiry < new Date()) {
        return res.status(401).json({ error: 'Verification code expired. Please request a new one.' });
      }
    }

    if (!phoneCodeValid) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Mark phone as verified
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerificationCode: null,
        verificationExpiry: null,
      },
    });
    await deleteVerificationCode('phone', userId).catch(() => {});


    // Generate JWT token - user is now fully registered
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'your_secret_key_change_in_production',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Phone verified successfully. Registration complete!',
      token,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        username: user.username,
        emailVerified: true,
        phoneVerified: true,
      },
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent (or user not found - same response for security)
 */
// POST /api/auth/forgot-password - Request password reset (3 attempts per 15 min per IP)
router.post('/forgot-password', rateLimit('forgot-pw', 3, 900), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Always return success even if user doesn't exist (security best practice)
    // This prevents user enumeration attacks
    if (!user) {
      return res.status(200).json({
        message: 'If an account exists with that email, a password reset link has been sent.'
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry to 15 minutes from now
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000);

    // Store in both Redis (primary, auto-expires) and DB (fallback)
    await storeVerificationCode('reset', user.id, resetCode).catch(() => {});
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCode: resetCode,
        passwordResetExpiry: resetExpiry,
      },
    });

    await sendPasswordResetEmail(email, resetCode, user.username);

    res.status(200).json({
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;

