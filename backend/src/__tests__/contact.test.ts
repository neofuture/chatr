import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';

jest.mock('../services/email', () => ({
  mailtrapClient: { send: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../services/logo-base64-constant', () => ({
  LOGO_BASE64: 'data:image/png;base64,ABC123',
}));

const emailModule = require('../services/email');

import contactRouter from '../routes/contact';

const app = express();
app.use(express.json());
app.use('/api', contactRouter);

const prisma = new PrismaClient();

describe('Contact Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (emailModule.mailtrapClient.send as jest.Mock).mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ── POST /api/contact ─────────────────────────────────────────────────────

  describe('POST /api/contact', () => {
    const validPayload = {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello, I have a question about Chatr.',
    };

    // ── Validation ──────────────────────────────────────────────────────────

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({ email: 'john@example.com', message: 'Hello' })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({ name: 'John', message: 'Hello' })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should return 400 when message is missing', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({ name: 'John', email: 'john@example.com' })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should return 400 when all fields are missing', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({ name: 'John', email: 'not-an-email', message: 'Hello' })
        .expect(400);

      expect(response.body.error).toContain('Invalid email');
    });

    it('should return 400 for email without domain', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({ name: 'John', email: 'john@', message: 'Hello' })
        .expect(400);

      expect(response.body.error).toContain('Invalid email');
    });

    it('should return 400 when message exceeds 5000 characters', async () => {
      const response = await request(app)
        .post('/api/contact')
        .send({ name: 'John', email: 'john@example.com', message: 'x'.repeat(5001) })
        .expect(400);

      expect(response.body.error).toContain('too long');
    });

    it('should accept a message exactly 5000 characters', async () => {
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue({ id: 'sub-1' });

      const response = await request(app)
        .post('/api/contact')
        .send({ name: 'John', email: 'john@example.com', message: 'x'.repeat(5000) })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    // ── Success path (mailtrapClient present) ───────────────────────────────

    it('should store submission and send email on success', async () => {
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue({ id: 'sub-1' });

      const response = await request(app)
        .post('/api/contact')
        .send(validPayload)
        .expect(200);

      expect(response.body).toEqual({ success: true });

      expect(prisma.contactSubmission.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          company: null,
          message: validPayload.message,
        },
      });

      expect(emailModule.mailtrapClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.objectContaining({ email: expect.any(String) }),
          to: expect.arrayContaining([expect.objectContaining({ email: expect.any(String) })]),
          subject: expect.stringContaining('John Doe'),
          html: expect.stringContaining('John Doe'),
          text: expect.stringContaining('John Doe'),
        })
      );
    });

    it('should include company in submission when provided', async () => {
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue({ id: 'sub-2' });

      await request(app)
        .post('/api/contact')
        .send({ ...validPayload, company: 'Acme Corp' })
        .expect(200);

      expect(prisma.contactSubmission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ company: 'Acme Corp' }),
      });

      expect(emailModule.mailtrapClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Acme Corp'),
        })
      );
    });

    it('should include reply_to with sender email', async () => {
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue({ id: 'sub-3' });

      await request(app)
        .post('/api/contact')
        .send(validPayload)
        .expect(200);

      expect(emailModule.mailtrapClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          reply_to: { email: 'john@example.com', name: 'John Doe' },
        })
      );
    });

    it('should include logo attachment', async () => {
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue({ id: 'sub-4' });

      await request(app)
        .post('/api/contact')
        .send(validPayload)
        .expect(200);

      expect(emailModule.mailtrapClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'logo.png',
              content: 'ABC123',
              content_id: 'logo',
            }),
          ]),
        })
      );
    });

    // ── DB save failure (should still succeed) ──────────────────────────────

    it('should return success even if DB save fails', async () => {
      (prisma.contactSubmission.create as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

      const response = await request(app)
        .post('/api/contact')
        .send(validPayload)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(emailModule.mailtrapClient.send).toHaveBeenCalled();
    });

    // ── Email send failure ──────────────────────────────────────────────────

    it('should return 500 when email send fails', async () => {
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue({ id: 'sub-5' });
      (emailModule.mailtrapClient.send as jest.Mock).mockRejectedValue(new Error('SMTP error'));

      const response = await request(app)
        .post('/api/contact')
        .send(validPayload)
        .expect(500);

      expect(response.body.error).toContain('Failed to send');
    });

    // ── Fallback when mailtrapClient is null ─────────────────────────────────

    it('should return success with console.log fallback when mailtrapClient is null', async () => {
      const originalClient = emailModule.mailtrapClient;
      emailModule.mailtrapClient = null;

      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue({ id: 'sub-6' });

      const response = await request(app)
        .post('/api/contact')
        .send(validPayload)
        .expect(200);

      expect(response.body).toEqual({ success: true });

      emailModule.mailtrapClient = originalClient;
    });

    // ── No auth required ────────────────────────────────────────────────────

    it('should not require authentication', async () => {
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue({ id: 'sub-7' });

      const response = await request(app)
        .post('/api/contact')
        .send(validPayload);

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });
});
