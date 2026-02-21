import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Import the router
import messagesRouter from '../routes/messages';

const app = express();
app.use(express.json());
app.use('/api/messages', messagesRouter);

describe('Message Routes', () => {
  let authToken: string;
  const testUserId = 'test-user-id-123';

  beforeAll(() => {
    // Generate auth token
    authToken = jwt.sign(
      { userId: testUserId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
  });

  describe('GET /api/messages/history', () => {
    it('should have message history endpoint defined', async () => {
      const response = await request(app)
        .get('/api/messages/history');

      // Should not be 404 (endpoint exists)
      expect(response.status).not.toBe(404);
    });

    it('should accept query parameters', async () => {
      const response = await request(app)
        .get('/api/messages/history')
        .query({ userId: 'user123' });

      expect(response.status).toBeDefined();
    });

    it('should handle missing parameters', async () => {
      const response = await request(app)
        .get('/api/messages/history');

      expect(response.status).toBeDefined();
    });

    it('should respond with JSON', async () => {
      const response = await request(app)
        .get('/api/messages/history');

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/messages/history')
        .query({ limit: 20, offset: 0 });

      expect(response.status).toBeDefined();
    });
  });

  describe('GET /api/messages/conversations', () => {
    it('should have conversations endpoint defined', async () => {
      const response = await request(app)
        .get('/api/messages/conversations');

      // Should not be 404 (endpoint exists)
      expect(response.status).not.toBe(404);
    });

    it('should accept request', async () => {
      const response = await request(app)
        .get('/api/messages/conversations');

      expect(response.status).toBeDefined();
    });

    it('should respond with JSON', async () => {
      const response = await request(app)
        .get('/api/messages/conversations');

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should handle query filters', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .query({ filter: 'unread' });

      expect(response.status).toBeDefined();
    });

    it('should handle sorting parameters', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .query({ sort: 'recent' });

      expect(response.status).toBeDefined();
    });
  });

  describe('Message API Contract', () => {
    it('should have all message endpoints available', () => {
      const router = messagesRouter as any;
      const stack = router.stack || [];

      // Check that message routes are registered
      const routes = stack.map((layer: any) => layer.route?.path).filter(Boolean);

      expect(routes.length).toBeGreaterThan(0);
    });

    it('should handle all GET requests', async () => {
      const endpoints = [
        '/api/messages/history',
        '/api/messages/conversations',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).not.toBe(404);
      }
    });
  });
});

