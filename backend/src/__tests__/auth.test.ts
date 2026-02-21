import request from 'supertest';
import express from 'express';
import authRouter from '../routes/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

// Get mocked Prisma
const prisma = new PrismaClient();

describe('Auth Routes', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Test123!@#',
    };

    it('should register a new user successfully', async () => {
      // Mock Prisma responses
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null); // No existing user
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '1',
        email: validUser.email,
        username: `@${validUser.username}`,
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
          username: 'testuser',
          password: 'Test123!@#',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should reject registration with missing username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('should reject registration with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
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
      // Mock existing verified user
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: '1',
        email: validUser.email,
        username: '@existinguser',
        emailVerified: true, // Must be verified to trigger 409
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(409);

      expect(response.body.error).toContain('Email already registered');
    });

    it('should handle username with @ prefix', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '1',
        email: validUser.email,
        username: '@testuser',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          username: '@testuser', // With @ prefix
        })
        .expect(201);

      expect(response.body).toHaveProperty('userId');
    });

    it('should handle database errors gracefully', async () => {
      (prisma.user.findFirst as jest.Mock).mockRejectedValue(
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
      const hashedPassword = await bcrypt.hash(loginCredentials.password, 10);

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
      const hashedPassword = await bcrypt.hash('DifferentPassword123!', 10);

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
      const hashedPassword = await bcrypt.hash(loginCredentials.password, 10);
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
      const hashedPassword = await bcrypt.hash(loginCredentials.password, 10);
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
      const hashedPassword = await bcrypt.hash(loginCredentials.password, 10);
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
});

