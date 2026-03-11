import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Import the router
import usersRouter from '../routes/users';

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

describe('Image Upload Routes', () => {
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

  describe('POST /api/users/profile-image', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/users/profile-image');

      expect(response.status).toBe(401);
    });

    it('should reject request without file', async () => {
      const response = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No file uploaded');
    });

    it('should have profile-image endpoint defined', async () => {
      // This tests that the endpoint exists and requires auth
      const response = await request(app)
        .post('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`);

      // Should get 400 (no file) not 404 (not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('DELETE /api/users/profile-image', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .delete('/api/users/profile-image');

      expect(response.status).toBe(401);
    });

    it('should have delete profile-image endpoint defined', async () => {
      const response = await request(app)
        .delete('/api/users/profile-image')
        .set('Authorization', `Bearer ${authToken}`);

      // Should not be 404 (endpoint exists)
      expect(response.status).not.toBe(404);
    });
  });

  describe('POST /api/users/cover-image', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/users/cover-image');

      expect(response.status).toBe(401);
    });

    it('should reject request without file', async () => {
      const response = await request(app)
        .post('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No file uploaded');
    });

    it('should have cover-image endpoint defined', async () => {
      const response = await request(app)
        .post('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`);

      // Should get 400 (no file) not 404 (not found)
      expect(response.status).not.toBe(404);
    });
  });

  describe('DELETE /api/users/cover-image', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .delete('/api/users/cover-image');

      expect(response.status).toBe(401);
    });

    it('should have delete cover-image endpoint defined', async () => {
      const response = await request(app)
        .delete('/api/users/cover-image')
        .set('Authorization', `Bearer ${authToken}`);

      // Should not be 404 (endpoint exists)
      expect(response.status).not.toBe(404);
    });
  });

  describe('API Contract Tests', () => {
    it('should have all image endpoints available', () => {
      const router = usersRouter as any;
      const stack = router.stack || [];

      // Check that our image routes are registered
      const routes = stack.map((layer: any) => layer.route?.path).filter(Boolean);

      expect(routes).toContain('/profile-image');
      expect(routes).toContain('/cover-image');
    });

    it('should require authentication for all image operations', async () => {
      const endpoints = [
        { method: 'post', path: '/api/users/profile-image' },
        { method: 'delete', path: '/api/users/profile-image' },
        { method: 'post', path: '/api/users/cover-image' },
        { method: 'delete', path: '/api/users/cover-image' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method as 'post' | 'delete'](endpoint.path);
        expect(response.status).toBe(401);
      }
    });
  });
});

