import request from 'supertest';
import express from 'express';
import authRouter from '../routes/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock email and sms services
jest.mock('../services/email', () => ({
  sendVerificationEmail: jest.fn(),
  sendLoginVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('../services/sms', () => ({
  sendPhoneVerificationSMS: jest.fn(),
  sendLoginVerificationSMS: jest.fn(),
  validatePhoneNumber: jest.fn().mockReturnValue(true),
  formatPhoneNumber: jest.fn().mockImplementation(phone => phone),
}));

// Mock Redis to bypass rate limiting and verification code storage in tests
jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  storeVerificationCode: jest.fn().mockResolvedValue(undefined),
  getVerificationCode: jest.fn().mockResolvedValue(null),
  deleteVerificationCode: jest.fn().mockResolvedValue(undefined),
  blacklistToken: jest.fn().mockResolvedValue(undefined),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(() => ({
    base32: 'TESTSECRET',
    otpauth_url: 'otpauth://totp/Chatr?secret=TESTSECRET',
  })),
  totp: { verify: jest.fn(() => true) },
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,QRCODE')),
}));

jest.mock('../lib/testMode', () => ({
  isTestMode: jest.fn(() => false),
  getTestBypassCode: jest.fn(() => null),
}));

const redisModule = require('../lib/redis');
const emailModule = require('../services/email');
const smsModule = require('../services/sms');
const speakeasyModule = require('speakeasy');
const qrcodeModule = require('qrcode');
const testModeModule = require('../lib/testMode');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

// Get mocked Prisma
const prisma = new PrismaClient();

const testUserId = 'test-user-id-123';

describe('Auth Routes', () => {
  let authToken: string;

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-apply Redis mock implementations (resetMocks clears them)
    (redisModule.checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 });
    (redisModule.storeVerificationCode as jest.Mock).mockResolvedValue(undefined);
    (redisModule.getVerificationCode as jest.Mock).mockResolvedValue(null);
    (redisModule.deleteVerificationCode as jest.Mock).mockResolvedValue(undefined);
    (redisModule.blacklistToken as jest.Mock).mockResolvedValue(undefined);
    (redisModule.isTokenBlacklisted as jest.Mock).mockResolvedValue(false);

    // Re-apply SMS mock implementations
    (smsModule.validatePhoneNumber as jest.Mock).mockReturnValue(true);
    (smsModule.formatPhoneNumber as jest.Mock).mockImplementation(phone => phone);

    // Re-apply speakeasy mock implementations
    (speakeasyModule.generateSecret as jest.Mock).mockReturnValue({
      base32: 'TESTSECRET',
      otpauth_url: 'otpauth://totp/Chatr?secret=TESTSECRET',
    });
    (speakeasyModule.totp.verify as jest.Mock).mockReturnValue(true);

    // Re-apply qrcode mock implementations
    (qrcodeModule.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,QRCODE');

    // Re-apply testMode mock implementations
    (testModeModule.isTestMode as jest.Mock).mockReturnValue(false);
    (testModeModule.getTestBypassCode as jest.Mock).mockReturnValue(null);

    // Generate auth token for protected routes
    authToken = jwt.sign(
      { userId: testUserId, username: '@testuser' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should register a new user successfully', async () => {
      // Route calls: findUnique(email) → null, findFirst(phone) → null, findUnique(username) → null, then create
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)  // email check
        .mockResolvedValueOnce(null); // username check
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null); // phone check
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '1',
        email: validUser.email,
        username: `@${validUser.username}`,
        displayName: 'Test User',
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('userId');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should reject registration with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
          password: 'Test123!@#',
          // no email, no phoneNumber
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should reject registration with missing username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'Test123!@#',
          // no username
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should reject registration with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          username: 'testuser',
          // no password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid email');
    });

    it('should reject registration with weak password (too short)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          password: 'Test1!',
        })
        .expect(400);

      expect(response.body.error).toContain('at least 8 characters');
    });

    it('should reject registration with password missing capital letter', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          password: 'test123!@#',
        })
        .expect(400);

      expect(response.body.error).toContain('capital letter');
    });

    it('should reject registration with password missing special character', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          password: 'Test12345',
        })
        .expect(400);

      expect(response.body.error).toContain('special character');
    });

    it('should reject registration with invalid username format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          username: 'ab', // Too short
        })
        .expect(400);

      expect(response.body.error).toContain('3-20 characters');
    });

    it('should reject registration when email already exists', async () => {
      // Route calls findUnique(email), then findFirst(phone), then findUnique(username)
      // We only need the first one to return a verified user to trigger 409
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: '1',
        email: validUser.email,
        username: '@existinguser',
        emailVerified: true, // verified → triggers 409
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(409);

      expect(response.body.error).toContain('Email already registered');
    });

    it('should handle username with @ prefix', async () => {
      // Route: findUnique(email) → null, findFirst(phone) → null, findUnique(username) → null, then create
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)   // email check
        .mockResolvedValueOnce(null);  // username check
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null); // phone check
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '1',
        email: validUser.email,
        username: '@testuser',
        displayName: 'Test User',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          username: '@testuser',
        })
        .expect(201);

      expect(response.body).toHaveProperty('userId');
    });

    it('should handle database errors gracefully', async () => {
      // Route hits findUnique(email) first — throw there
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    const loginCredentials = {
      email: 'test@example.com',
      password: 'Test123!@#',
    };

    it('should initiate login verification with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(loginCredentials.password, 1);

      // Mock user exists
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: loginCredentials.email,
        username: '@testuser',
        password: hashedPassword,
        phoneNumber: '+1234567890', // Add phone number for SMS verification path
        emailVerified: true,
        phoneVerified: true, // Mark verified to bypass phone verification check
        twoFactorEnabled: false,
      });

      // Mock update for storing verification code
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: '1',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials)
        .expect(200);

      expect(response.body).toHaveProperty('requiresLoginVerification');
      expect(response.body.requiresLoginVerification).toBe(true);
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('message');
    });

    it('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Test123!@#',
        })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should reject login with non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials)
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });

    it('should reject login with incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('DifferentPassword123!', 1);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: loginCredentials.email,
        password: hashedPassword,
        emailVerified: true,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials)
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });

    it('should complete login with valid verification code', async () => {
      const hashedPassword = await bcrypt.hash(loginCredentials.password, 1);
      const verificationCode = '123456';
      const futureDate = new Date(Date.now() + 15 * 60 * 1000);

      // Mock user with verification code
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: loginCredentials.email,
        username: '@testuser',
        password: hashedPassword,
        emailVerified: true,
        phoneVerified: true, // Mark verified
        loginVerificationCode: verificationCode,
        loginVerificationExpiry: futureDate,
      });

      // Mock update to clear verification code
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: '1',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          ...loginCredentials,
          loginVerificationCode: verificationCode,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginCredentials.email);
    });

    it('should reject login with expired verification code', async () => {
      const hashedPassword = await bcrypt.hash(loginCredentials.password, 1);
      const verificationCode = '123456';
      const pastDate = new Date(Date.now() - 1000); // Expired

      // Mock user with expired code
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: loginCredentials.email,
        password: hashedPassword,
        emailVerified: true,
        phoneVerified: true, // Mark verified
        loginVerificationCode: verificationCode,
        loginVerificationExpiry: pastDate,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          ...loginCredentials,
          loginVerificationCode: verificationCode,
        })
        .expect(401);

      expect(response.body.error).toContain('expired');
    });

    it('should reject login with invalid verification code', async () => {
      const hashedPassword = await bcrypt.hash(loginCredentials.password, 1);
      const correctCode = '123456';
      const wrongCode = '654321';
      const futureDate = new Date(Date.now() + 15 * 60 * 1000);

      // Mock user with different code
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: loginCredentials.email,
        password: hashedPassword,
        emailVerified: true,
        phoneVerified: true, // Mark verified
        loginVerificationCode: correctCode,
        loginVerificationExpiry: futureDate,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          ...loginCredentials,
          loginVerificationCode: wrongCode,
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid verification code');
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend email verification code', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        emailVerified: false,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ userId: testUserId, type: 'email' })
        .expect(200);

      expect(response.body.message).toContain('resent');
      expect(emailModule.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        testUserId
      );
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should return 400 if email already verified when resending email type', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        emailVerified: true,
      });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ userId: testUserId, type: 'email' })
        .expect(400);

      expect(response.body.error).toContain('already verified');
    });

    it('should resend login verification code via SMS', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        phoneNumber: '+1234567890',
        loginVerificationMethod: 'sms',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ userId: testUserId, type: 'login' })
        .expect(200);

      expect(response.body.message).toContain('resent');
      expect(smsModule.sendLoginVerificationSMS).toHaveBeenCalledWith(
        '+1234567890',
        expect.any(String),
        '@testuser'
      );
    });

    it('should resend login verification code via email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        loginVerificationMethod: 'email',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ userId: testUserId, type: 'login' })
        .expect(200);

      expect(response.body.message).toContain('resent');
      expect(emailModule.sendLoginVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        '@testuser'
      );
    });

    it('should reject invalid type', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
      });

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ userId: testUserId, type: 'invalid' })
        .expect(400);

      expect(response.body.error).toContain('Invalid type');
    });

    it('should reject missing params', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should return 404 if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ userId: 'nonexistent', type: 'email' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/auth/2fa/setup', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/setup')
        .send({})
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should generate QR code for authenticated user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        username: '@testuser',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('secret', 'TESTSECRET');
      expect(response.body).toHaveProperty('qrCode', 'data:image/png;base64,QRCODE');
      expect(response.body).toHaveProperty('otpauth');
      expect(speakeasyModule.generateSecret).toHaveBeenCalled();
      expect(qrcodeModule.toDataURL).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testUserId },
          data: expect.objectContaining({ twoFactorSecret: 'TESTSECRET', twoFactorEnabled: false }),
        })
      );
    });

    it('should return 404 if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/auth/2fa/verify', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .send({ code: '123456' })
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should verify 2FA code and enable 2FA', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        twoFactorSecret: 'TESTSECRET',
        createdAt: new Date(),
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '123456' })
        .expect(200);

      expect(response.body.message).toContain('2FA enabled');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.twoFactorEnabled).toBe(true);
      expect(speakeasyModule.totp.verify).toHaveBeenCalledWith(
        expect.objectContaining({ secret: 'TESTSECRET', token: '123456' })
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ twoFactorEnabled: true }),
        })
      );
    });

    it('should reject invalid 2FA code', async () => {
      (speakeasyModule.totp.verify as jest.Mock).mockReturnValue(false);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        twoFactorSecret: 'TESTSECRET',
      });

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '000000' })
        .expect(401);

      expect(response.body.error).toContain('Invalid 2FA code');
    });

    it('should return 400 if code not provided', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should return 404 if user not found or 2FA not set up', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '123456' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 404 if user exists but has no twoFactorSecret', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        twoFactorSecret: null,
      });

      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '123456' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({})
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should blacklist token and log out', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.message).toContain('Logged out');
      expect(redisModule.blacklistToken).toHaveBeenCalledWith(
        expect.any(String), // token hash
        expect.any(Number)  // expiresIn
      );
    });
  });

  describe('POST /api/auth/verify-email', () => {
    it('should return 400 if userId or code missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should return 404 if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ userId: 'nonexistent', code: '123456' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 400 if email already verified', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        emailVerified: true,
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ userId: testUserId, code: '123456' })
        .expect(400);

      expect(response.body.error).toContain('already verified');
    });

    it('should verify email via Redis code match', async () => {
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue({ code: '123456' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        emailVerified: false,
        phoneNumber: null,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ userId: testUserId, code: '123456' })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.message).toContain('verified');
      expect(redisModule.deleteVerificationCode).toHaveBeenCalledWith('email', testUserId);
    });

    it('should verify email via DB fallback when Redis returns null', async () => {
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue(null);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        emailVerified: false,
        emailVerificationCode: '654321',
        verificationExpiry: new Date(Date.now() + 15 * 60 * 1000),
        phoneNumber: null,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ userId: testUserId, code: '654321' })
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should accept bypass code when test mode is enabled', async () => {
      (testModeModule.getTestBypassCode as jest.Mock).mockReturnValue('000000');

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        emailVerified: false,
        phoneNumber: null,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ userId: testUserId, code: '000000' })
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should return 401 for expired DB verification code', async () => {
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue(null);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        emailVerified: false,
        emailVerificationCode: '123456',
        verificationExpiry: new Date(Date.now() - 1000),
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ userId: testUserId, code: '123456' })
        .expect(401);

      expect(response.body.error).toContain('expired');
    });

    it('should return 401 for invalid verification code', async () => {
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue(null);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        emailVerified: false,
        emailVerificationCode: '123456',
        verificationExpiry: new Date(Date.now() + 15 * 60 * 1000),
      });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ userId: testUserId, code: '999999' })
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });

    it('should issue token immediately when user has no phone number', async () => {
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue({ code: '123456' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        emailVerified: false,
        phoneNumber: null,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ userId: testUserId, code: '123456' })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.phoneVerified).toBe(true);
      expect(smsModule.sendPhoneVerificationSMS).not.toHaveBeenCalled();
    });

    it('should send SMS verification when user has a phone number', async () => {
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue({ code: '123456' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        emailVerified: false,
        phoneNumber: '+1234567890',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ userId: testUserId, code: '123456' })
        .expect(200);

      expect(response.body.requiresPhoneVerification).toBe(true);
      expect(response.body.phoneNumber).toBe('+1234567890');
      expect(response.body).not.toHaveProperty('token');
      expect(smsModule.sendPhoneVerificationSMS).toHaveBeenCalledWith(
        '+1234567890',
        expect.any(String),
        '@testuser'
      );
      expect(redisModule.storeVerificationCode).toHaveBeenCalledWith('phone', testUserId, expect.any(String));
    });
  });

  describe('POST /api/auth/verify-phone', () => {
    it('should return 400 if userId or code missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should return 404 if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({ userId: 'nonexistent', code: '123456' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 400 if email not verified', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        emailVerified: false,
        phoneVerified: false,
      });

      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({ userId: testUserId, code: '123456' })
        .expect(400);

      expect(response.body.error).toContain('verify your email');
    });

    it('should return 400 if phone already verified', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        emailVerified: true,
        phoneVerified: true,
      });

      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({ userId: testUserId, code: '123456' })
        .expect(400);

      expect(response.body.error).toContain('already verified');
    });

    it('should verify phone via Redis code and issue JWT', async () => {
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue({ code: '123456' });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        phoneNumber: '+1234567890',
        emailVerified: true,
        phoneVerified: false,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({ userId: testUserId, code: '123456' })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.phoneVerified).toBe(true);
      expect(response.body.message).toContain('verified');
      expect(redisModule.deleteVerificationCode).toHaveBeenCalledWith('phone', testUserId);
    });

    it('should verify phone via DB fallback when Redis returns null', async () => {
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue(null);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        phoneNumber: '+1234567890',
        emailVerified: true,
        phoneVerified: false,
        phoneVerificationCode: '654321',
        verificationExpiry: new Date(Date.now() + 15 * 60 * 1000),
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({ userId: testUserId, code: '654321' })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.phoneVerified).toBe(true);
    });

    it('should return 401 for invalid code', async () => {
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue(null);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        emailVerified: true,
        phoneVerified: false,
        phoneVerificationCode: '123456',
        verificationExpiry: new Date(Date.now() + 15 * 60 * 1000),
      });

      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({ userId: testUserId, code: '999999' })
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });

    it('should return 401 for expired DB verification code', async () => {
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue(null);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        emailVerified: true,
        phoneVerified: false,
        phoneVerificationCode: '123456',
        verificationExpiry: new Date(Date.now() - 1000),
      });

      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({ userId: testUserId, code: '123456' })
        .expect(401);

      expect(response.body.error).toContain('expired');
    });

    it('should accept bypass code when test mode is enabled', async () => {
      (testModeModule.getTestBypassCode as jest.Mock).mockReturnValue('000000');

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
        phoneNumber: '+1234567890',
        emailVerified: true,
        phoneVerified: false,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({ userId: testUserId, code: '000000' })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.phoneVerified).toBe(true);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return 400 if email missing', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should return 200 even if user not found (prevents enumeration)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.message).toContain('reset');
      expect(emailModule.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should send password reset email when user exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: 'test@example.com',
        username: '@testuser',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.message).toContain('reset');
      expect(emailModule.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        '@testuser'
      );
      expect(redisModule.storeVerificationCode).toHaveBeenCalledWith('reset', testUserId, expect.any(String));
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: testUserId },
          data: expect.objectContaining({
            passwordResetCode: expect.any(String),
            passwordResetExpiry: expect.any(Date),
          }),
        })
      );
    });
  });

  // ── Additional register coverage ───────────────────────────────────────────

  describe('POST /api/auth/register (additional)', () => {
    const validUser = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should reject registration with missing firstName', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'a@b.com', username: 'user1', password: 'Test123!@#', lastName: 'U' })
        .expect(400);
      expect(response.body.error).toContain('First name');
    });

    it('should reject registration with missing lastName', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'a@b.com', username: 'user1', password: 'Test123!@#', firstName: 'T' })
        .expect(400);
      expect(response.body.error).toContain('Last name');
    });

    it('should reject registration with invalid gender', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, gender: 'invalid-value' })
        .expect(400);
      expect(response.body.error).toContain('Invalid gender');
    });

    it('should reject registration with invalid phone format', async () => {
      (smsModule.validatePhoneNumber as jest.Mock).mockReturnValue(false);
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, phoneNumber: 'bad-phone' })
        .expect(400);
      expect(response.body.error).toContain('Invalid phone');
    });

    it('should reject when phone already verified', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null); // email check
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: '2', phoneNumber: '+1234567890', phoneVerified: true,
      });
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, phoneNumber: '+1234567890' })
        .expect(409);
      expect(response.body.error).toContain('Phone number already registered');
    });

    it('should reject when username taken by different user', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'other', email: 'other@x.com', phoneNumber: null }); // username check
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(409);
      expect(response.body.error).toContain('Username already taken');
    });

    it('should update unverified email user on re-registration', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing', email: validUser.email, emailVerified: false })
        .mockResolvedValueOnce(null); // username check
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'existing', email: validUser.email, username: '@testuser', displayName: 'Test User',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);
      expect(response.body.userId).toBe('existing');
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ── Additional login coverage ──────────────────────────────────────────────

  describe('POST /api/auth/login (additional)', () => {
    it('should require email verification when email not verified', async () => {
      const hashedPassword = await bcrypt.hash('Test123!@#', 1);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'test@example.com', username: '@testuser',
        password: hashedPassword, emailVerified: false,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: '1' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Test123!@#' })
        .expect(200);
      expect(response.body.requiresEmailVerification).toBe(true);
      expect(response.body.userId).toBe('1');
      expect(emailModule.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should require phone verification when phone not verified', async () => {
      const hashedPassword = await bcrypt.hash('Test123!@#', 1);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'test@example.com', username: '@testuser',
        password: hashedPassword, phoneNumber: '+1234567890',
        emailVerified: true, phoneVerified: false,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: '1' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Test123!@#' })
        .expect(200);
      expect(response.body.requiresPhoneVerification).toBe(true);
      expect(smsModule.sendPhoneVerificationSMS).toHaveBeenCalled();
    });

    it('should login via username', async () => {
      const hashedPassword = await bcrypt.hash('Test123!@#', 1);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'test@example.com', username: '@testuser',
        password: hashedPassword, phoneNumber: '+1234567890',
        emailVerified: true, phoneVerified: true,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: '1' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'testuser', password: 'Test123!@#' })
        .expect(200);
      expect(response.body.requiresLoginVerification).toBe(true);
    });

    it('should verify login code via Redis', async () => {
      const hashedPassword = await bcrypt.hash('Test123!@#', 1);
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue({ code: '123456' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'test@example.com', username: '@testuser',
        password: hashedPassword, emailVerified: true, phoneVerified: true,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: '1' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Test123!@#', loginVerificationCode: '123456' })
        .expect(200);
      expect(response.body).toHaveProperty('token');
      expect(redisModule.deleteVerificationCode).toHaveBeenCalledWith('login', '1');
    });

    it('should return 400 when no verification code found in DB', async () => {
      const hashedPassword = await bcrypt.hash('Test123!@#', 1);
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'test@example.com', username: '@testuser',
        password: hashedPassword, emailVerified: true, phoneVerified: true,
        loginVerificationCode: null, loginVerificationExpiry: null,
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Test123!@#', loginVerificationCode: '123456' })
        .expect(400);
      expect(response.body.error).toContain('No verification code found');
    });

    it('should return 400 when SMS chosen but no phone', async () => {
      const hashedPassword = await bcrypt.hash('Test123!@#', 1);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'test@example.com', username: '@testuser',
        password: hashedPassword, phoneNumber: null,
        emailVerified: true, phoneVerified: true,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: '1' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Test123!@#', verificationMethod: 'sms' })
        .expect(400);
      expect(response.body.error).toContain('No phone number');
    });

    it('should send verification via email when method is email', async () => {
      const hashedPassword = await bcrypt.hash('Test123!@#', 1);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'test@example.com', username: '@testuser',
        password: hashedPassword, phoneNumber: '+1234567890',
        emailVerified: true, phoneVerified: true,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: '1' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Test123!@#', verificationMethod: 'email' })
        .expect(200);
      expect(response.body.requiresLoginVerification).toBe(true);
      expect(response.body.verificationMethod).toBe('email');
      expect(emailModule.sendLoginVerificationEmail).toHaveBeenCalled();
    });

    it('should accept test bypass code for login verification', async () => {
      (testModeModule.getTestBypassCode as jest.Mock).mockReturnValue('000000');
      const hashedPassword = await bcrypt.hash('Test123!@#', 1);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1', email: 'test@example.com', username: '@testuser',
        password: hashedPassword, emailVerified: true, phoneVerified: true,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: '1' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Test123!@#', loginVerificationCode: '000000' })
        .expect(200);
      expect(response.body).toHaveProperty('token');
    });
  });

  // ── Rate limiting ──────────────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      (redisModule.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: false, remaining: 0, retryAfter: 60,
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'a@b.com', username: 'user1', password: 'Test123!@#',
          firstName: 'T', lastName: 'U',
        })
        .expect(429);
      expect(response.body.error).toContain('Too many attempts');
      expect(response.body.retryAfter).toBe(60);
    });

    it('should bypass rate limit in test mode', async () => {
      (testModeModule.isTestMode as jest.Mock).mockReturnValue(true);
      (redisModule.checkRateLimit as jest.Mock).mockResolvedValue({
        allowed: false, remaining: 0, retryAfter: 60,
      });
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '1', email: 'a@b.com', username: '@user1', displayName: 'T U',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'a@b.com', username: 'user1', password: 'Test123!@#',
          firstName: 'T', lastName: 'U',
        })
        .expect(201);
      expect(response.body).toHaveProperty('userId');
      expect(redisModule.checkRateLimit).not.toHaveBeenCalled();
    });
  });

  // ── Dev phone & phone re-registration coverage ─────────────────────────────

  describe('POST /api/auth/register (dev phone & phone re-registration)', () => {
    const validUser = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should allow dev phone registration and find existing dev phone user', async () => {
      (smsModule.formatPhoneNumber as jest.Mock).mockReturnValue('+447940147138');
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)   // email check
        .mockResolvedValueOnce(null);  // username check
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev-user', username: '@devuser', phoneVerified: true,
      });
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-dev', email: validUser.email, username: '@testuser', displayName: 'Test User',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, phoneNumber: '+447940147138' })
        .expect(201);

      expect(response.body).toHaveProperty('userId', 'new-dev');
    });

    it('should update unverified phone user on re-registration (non-dev phone)', async () => {
      (smsModule.formatPhoneNumber as jest.Mock).mockReturnValue('+15550001111');
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)   // email check — no existing email user
        .mockResolvedValueOnce(null);  // username check
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'phone-user', phoneNumber: '+15550001111', phoneVerified: false,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'phone-user', email: validUser.email, phoneNumber: '+15550001111',
        username: '@testuser', displayName: 'Test User',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, phoneNumber: '+15550001111' })
        .expect(201);

      expect(response.body.userId).toBe('phone-user');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'phone-user' } })
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should log phone number on new registration with phone', async () => {
      (smsModule.formatPhoneNumber as jest.Mock).mockReturnValue('+19998887777');
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)   // email check
        .mockResolvedValueOnce(null);  // username check
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-phone', email: validUser.email, phoneNumber: '+19998887777',
        username: '@testuser', displayName: 'Test User',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, phoneNumber: '+19998887777' })
        .expect(201);

      expect(response.body).toHaveProperty('userId', 'new-phone');
    });
  });

  // ── 2FA with missing userId in JWT token ──────────────────────────────────

  describe('2FA with missing userId in token', () => {
    let noUserIdToken: string;

    beforeEach(() => {
      noUserIdToken = jwt.sign(
        { username: '@testuser' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );
    });

    it('2fa/setup should return 401 when token has no userId', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${noUserIdToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('2fa/verify should return 401 when token has no userId', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${noUserIdToken}`)
        .send({ code: '123456' })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  // ── Error handler coverage ─────────────────────────────────────────────────

  describe('error handling (catch blocks)', () => {
    it('login: should return 500 on internal error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a@b.com', password: 'Test123!@#' })
        .expect(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('resend-verification: should return 500 on internal error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ userId: testUserId, type: 'email' })
        .expect(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('2fa/setup: should return 500 on internal error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const response = await request(app)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('2fa/verify: should return 500 on internal error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '123456' })
        .expect(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('logout: should return 500 on internal error', async () => {
      (redisModule.blacklistToken as jest.Mock).mockRejectedValue(new Error('Redis'));
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('verify-email: should return 500 on internal error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ userId: testUserId, code: '123456' })
        .expect(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('verify-email: should handle SMS send failure gracefully', async () => {
      (redisModule.getVerificationCode as jest.Mock).mockResolvedValue({ code: '123456' });
      (smsModule.sendPhoneVerificationSMS as jest.Mock).mockRejectedValue(new Error('SMS failed'));
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId, email: 'test@example.com', username: '@testuser',
        emailVerified: false, phoneNumber: '+1234567890',
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({ id: testUserId });

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ userId: testUserId, code: '123456' })
        .expect(200);
      expect(response.body.requiresPhoneVerification).toBe(true);
    });

    it('verify-phone: should return 500 on internal error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const response = await request(app)
        .post('/api/auth/verify-phone')
        .send({ userId: testUserId, code: '123456' })
        .expect(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('forgot-password: should return 500 on internal error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});
