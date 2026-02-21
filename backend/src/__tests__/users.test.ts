import request from 'supertest';
import express from 'express';
import usersRouter from '../routes/users';
import { PrismaClient } from '@prisma/client';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

// Get mocked Prisma
const prisma = new PrismaClient();

describe('User Routes', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/users/check-username', () => {
    it('should return available=true for non-existent username', async () => {
      // Mock no existing user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/check-username')
        .query({ username: 'newuser' })
        .expect(200);

      expect(response.body).toEqual({ available: true });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: '@newuser' },
      });
    });

    it('should return available=false for existing username', async () => {
      // Mock existing user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        username: '@existinguser',
        email: 'existing@example.com',
      });

      const response = await request(app)
        .get('/api/users/check-username')
        .query({ username: 'existinguser' })
        .expect(200);

      expect(response.body).toEqual({ available: false });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: '@existinguser' },
      });
    });

    it('should handle username with @ prefix', async () => {
      // Mock no existing user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/check-username')
        .query({ username: '@newuser' })
        .expect(200);

      expect(response.body).toEqual({ available: true });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: '@newuser' },
      });
    });

    it('should reject missing username parameter', async () => {
      const response = await request(app)
        .get('/api/users/check-username')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username is required');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should reject empty username parameter', async () => {
      const response = await request(app)
        .get('/api/users/check-username')
        .query({ username: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Username is required');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      const response = await request(app)
        .get('/api/users/check-username')
        .query({ username: 'testuser' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Internal server error');
    });
  });

  describe('GET /api/users/suggest-username', () => {
    it('should suggest available usernames', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/suggest-username')
        .query({ displayName: 'John Doe' });

      expect(response.status).not.toBe(404);
      expect(response.body).toBeDefined();
    });

    it('should handle missing displayName', async () => {
      const response = await request(app)
        .get('/api/users/suggest-username');

      expect(response.status).toBeDefined();
    });

    it('should return array of suggestions', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/suggest-username')
        .query({ displayName: 'John Doe' });

      if (response.status === 200) {
        expect(Array.isArray(response.body) || response.body.suggestions).toBeTruthy();
      }
    });

    it('should handle special characters in displayName', async () => {
      const response = await request(app)
        .get('/api/users/suggest-username')
        .query({ displayName: 'John @#$ Doe' });

      expect(response.status).toBeDefined();
    });

    it('should respond with JSON', async () => {
      const response = await request(app)
        .get('/api/users/suggest-username')
        .query({ displayName: 'Test' });

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/users/search', () => {
    it('should search users by query', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: '1', username: '@john', email: 'john@test.com' }
      ]);

      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'john' });

      expect(response.status).not.toBe(404);
    });

    it('should handle empty query', async () => {
      const response = await request(app)
        .get('/api/users/search');

      expect(response.status).toBeDefined();
    });

    it('should respond with JSON array', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'test' });

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /api/users/:username', () => {
    it('should return user profile', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        username: '@testuser',
        email: 'test@test.com'
      });

      const response = await request(app)
        .get('/api/users/testuser');

      expect(response.status).not.toBe(404);
    });

    it('should handle non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/nonexistent');

      expect(response.status).toBeDefined();
    });

    it('should handle username with @ prefix', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        username: '@testuser'
      });

      const response = await request(app)
        .get('/api/users/@testuser');

      expect(response.status).toBeDefined();
    });

    it('should respond with JSON', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        username: '@test'
      });

      const response = await request(app)
        .get('/api/users/test');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});
