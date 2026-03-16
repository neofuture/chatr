import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

jest.mock('../services/waveform', () => ({
  generatePlaceholderWaveform: jest.fn(() => new Array(50).fill(0.5)),
  generateWaveformFromFile: jest.fn(() => Promise.resolve({ waveform: new Array(50).fill(0.5), duration: 5.0 })),
}));

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

const mockS3Send = jest.fn().mockResolvedValue({});
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn().mockImplementation((args: any) => args),
  DeleteObjectCommand: jest.fn().mockImplementation((args: any) => args),
  GetObjectCommand: jest.fn().mockImplementation((args: any) => args),
}));

import fileUploadRouter, { setSocketIO, deleteFromS3 } from '../routes/file-upload';

const prisma = new PrismaClient() as any;
const redisModule = require('../lib/redis');
const waveformModule = require('../services/waveform');

const app = express();
app.use(express.json());
app.use('/api/messages', fileUploadRouter);

const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
const mockIo = { to: mockTo } as any;

const TEST_USER_ID = 'user-123';
const OTHER_USER_ID = 'user-456';
const UNRELATED_USER_ID = 'user-789';

const DOWNLOAD_FILE_NAME = 'test-download-fixture.txt';
const uploadsDir = path.resolve(__dirname, '../../uploads/messages');
const downloadFilePath = path.join(uploadsDir, DOWNLOAD_FILE_NAME);
const DOWNLOAD_FILE_URL = `http://localhost:3001/uploads/messages/${DOWNLOAD_FILE_NAME}`;

describe('File Upload Routes', () => {
  let authToken: string;
  let otherToken: string;

  beforeAll(() => {
    authToken = jwt.sign(
      { userId: TEST_USER_ID, username: '@testuser' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' },
    );
    otherToken = jwt.sign(
      { userId: OTHER_USER_ID, username: '@otheruser' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' },
    );

    // Create fixture file for download tests
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(downloadFilePath, 'download test content');
  });

  afterAll(() => {
    if (fs.existsSync(downloadFilePath)) fs.unlinkSync(downloadFilePath);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setSocketIO(mockIo);
    mockTo.mockReturnValue({ emit: mockEmit });
    redisModule.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 });
    redisModule.isTokenBlacklisted.mockResolvedValue(false);
    waveformModule.generatePlaceholderWaveform.mockReturnValue(new Array(50).fill(0.5));
    waveformModule.generateWaveformFromFile.mockResolvedValue({ waveform: new Array(50).fill(0.5), duration: 5.0 });
  });

  // ─── POST /api/messages/upload ────────────────────────────────────────────────

  describe('POST /api/messages/upload', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/messages/upload')
        .attach('file', Buffer.from('img'), { filename: 'test.jpg', contentType: 'image/jpeg' })
        .field('recipientId', OTHER_USER_ID);

      expect(res.status).toBe(401);
    });

    it('returns 400 when no file is attached', async () => {
      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('recipientId', OTHER_USER_ID);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/No file uploaded/i);
    });

    it('returns 400 when recipientId is missing', async () => {
      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('img'), { filename: 'test.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Recipient ID required/i);
    });

    it('uploads an image and creates a message', async () => {
      prisma.message.create.mockResolvedValue({
        id: 'msg-img-1',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
        content: 'photo.jpg',
        type: 'image',
        status: 'sent',
        fileUrl: 'http://localhost:3001/uploads/messages/photo.jpg',
        fileName: 'photo.jpg',
        fileSize: 4,
        fileType: 'image/jpeg',
        audioWaveform: null,
        audioDuration: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('img!'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .field('recipientId', OTHER_USER_ID)
        .field('type', 'image');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messageId).toBe('msg-img-1');
      expect(res.body.fileName).toBe('photo.jpg');
      expect(res.body.fileType).toBe('image/jpeg');

      expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          senderId: TEST_USER_ID,
          recipientId: OTHER_USER_ID,
          type: 'image',
        }),
      }));
    });

    it('uploads audio and uses placeholder waveform', async () => {
      prisma.message.create.mockResolvedValue({
        id: 'msg-audio-1',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
        content: 'Voice message',
        type: 'audio',
        status: 'sent',
        fileUrl: 'http://localhost:3001/uploads/audio/voice.webm',
        fileName: 'voice.webm',
        fileSize: 5,
        fileType: 'audio/webm',
        audioWaveform: new Array(50).fill(0.5),
        audioDuration: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('audio'), { filename: 'voice.webm', contentType: 'audio/webm' })
        .field('recipientId', OTHER_USER_ID);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messageId).toBe('msg-audio-1');
      expect(res.body.waveform).toHaveLength(50);
      expect(res.body.needsWaveformGeneration).toBe(true);
      expect(waveformModule.generatePlaceholderWaveform).toHaveBeenCalled();

      expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          type: 'audio',
          content: 'Voice message',
          audioWaveform: expect.any(Array),
        }),
      }));
    });

    it('passes client-provided waveform and duration through', async () => {
      const clientWaveform = [0.1, 0.2, 0.3, 0.4, 0.5];
      prisma.message.create.mockResolvedValue({
        id: 'msg-audio-2',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
        content: 'Voice message',
        type: 'audio',
        status: 'sent',
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('audio'), { filename: 'voice.webm', contentType: 'audio/webm' })
        .field('recipientId', OTHER_USER_ID)
        .field('waveform', JSON.stringify(clientWaveform))
        .field('duration', '12.5');

      expect(res.status).toBe(200);
      expect(res.body.needsWaveformGeneration).toBe(false);
      expect(waveformModule.generatePlaceholderWaveform).not.toHaveBeenCalled();

      expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          audioWaveform: clientWaveform,
          audioDuration: 12.5,
        }),
      }));
    });

    it('rejects disallowed MIME types', async () => {
      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('exe'), { filename: 'malware.exe', contentType: 'application/x-msdownload' })
        .field('recipientId', OTHER_USER_ID);

      expect(res.status).toBe(500);
    });

    it('handles invalid waveform JSON gracefully', async () => {
      prisma.message.create.mockResolvedValue({
        id: 'msg-bad-wf',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
        content: 'Voice message',
        type: 'audio',
        status: 'sent',
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('audio'), { filename: 'voice.webm', contentType: 'audio/webm' })
        .field('recipientId', OTHER_USER_ID)
        .field('waveform', 'NOT_VALID_JSON');

      expect(res.status).toBe(200);
      expect(res.body.needsWaveformGeneration).toBe(true);
      expect(waveformModule.generatePlaceholderWaveform).toHaveBeenCalled();
    });

    it('uploads a video and sets message type to video', async () => {
      prisma.message.create.mockResolvedValue({
        id: 'msg-video-1',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
        content: 'movie.mp4',
        type: 'video',
        status: 'sent',
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('video'), { filename: 'movie.mp4', contentType: 'video/mp4' })
        .field('recipientId', OTHER_USER_ID);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'video' }),
      }));
    });

    it('uses caption as message content when provided', async () => {
      prisma.message.create.mockResolvedValue({
        id: 'msg-cap-1',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
        content: 'Hello world',
        type: 'file',
        status: 'sent',
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('doc'), { filename: 'doc.pdf', contentType: 'application/pdf' })
        .field('recipientId', OTHER_USER_ID)
        .field('caption', '  Hello world  ');

      expect(res.status).toBe(200);
      expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ content: 'Hello world' }),
      }));
    });

    it('triggers async waveform generation and emits socket events', async () => {
      prisma.message.create.mockResolvedValue({
        id: 'msg-async-wf',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
        content: 'Voice message',
        type: 'audio',
        status: 'sent',
        createdAt: new Date(),
      });
      prisma.message.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('audio-data'), { filename: 'voice.webm', contentType: 'audio/webm' })
        .field('recipientId', OTHER_USER_ID);

      expect(res.status).toBe(200);
      expect(res.body.needsWaveformGeneration).toBe(true);

      await new Promise(r => setTimeout(r, 200));

      expect(waveformModule.generateWaveformFromFile).toHaveBeenCalled();
      expect(prisma.message.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'msg-async-wf' },
        data: expect.objectContaining({ audioWaveform: expect.any(Array) }),
      }));
      expect(mockTo).toHaveBeenCalledWith(`user:${TEST_USER_ID}`);
      expect(mockTo).toHaveBeenCalledWith(`user:${OTHER_USER_ID}`);
      expect(mockEmit).toHaveBeenCalledWith('audio:waveform', expect.objectContaining({
        messageId: 'msg-async-wf',
        waveform: expect.any(Array),
        duration: 5.0,
      }));
    });

    it('handles async waveform generation error gracefully', async () => {
      prisma.message.create.mockResolvedValue({
        id: 'msg-wf-err',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
        content: 'Voice message',
        type: 'audio',
        status: 'sent',
        createdAt: new Date(),
      });
      waveformModule.generateWaveformFromFile.mockRejectedValue(new Error('ffprobe not found'));

      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('audio'), { filename: 'voice.webm', contentType: 'audio/webm' })
        .field('recipientId', OTHER_USER_ID);

      expect(res.status).toBe(200);

      await new Promise(r => setTimeout(r, 200));

      expect(waveformModule.generateWaveformFromFile).toHaveBeenCalled();
      expect(prisma.message.update).not.toHaveBeenCalled();
    });

    it('returns 500 when prisma.message.create throws', async () => {
      prisma.message.create.mockRejectedValue(new Error('DB down'));

      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('img'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .field('recipientId', OTHER_USER_ID);

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/upload failed/i);
    });
  });

  // ─── GET /api/messages/download/:messageId ────────────────────────────────────

  describe('GET /api/messages/download/:messageId', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/messages/download/msg-1');
      expect(res.status).toBe(401);
    });

    it('returns 404 when message does not exist', async () => {
      prisma.message.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/messages/download/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('returns 403 when user is not a participant', async () => {
      prisma.message.findUnique.mockResolvedValue({
        fileUrl: DOWNLOAD_FILE_URL,
        fileName: DOWNLOAD_FILE_NAME,
        fileType: 'text/plain',
        senderId: 'someone-else',
        recipientId: 'another-person',
      });

      const res = await request(app)
        .get('/api/messages/download/msg-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Access denied/i);
    });

    it('serves file to the sender', async () => {
      prisma.message.findUnique.mockResolvedValue({
        fileUrl: DOWNLOAD_FILE_URL,
        fileName: DOWNLOAD_FILE_NAME,
        fileType: 'text/plain',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
      });

      const res = await request(app)
        .get('/api/messages/download/msg-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain(DOWNLOAD_FILE_NAME);
      expect(res.text).toBe('download test content');
    });

    it('serves file to the recipient', async () => {
      prisma.message.findUnique.mockResolvedValue({
        fileUrl: DOWNLOAD_FILE_URL,
        fileName: DOWNLOAD_FILE_NAME,
        fileType: 'text/plain',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
      });

      const res = await request(app)
        .get('/api/messages/download/msg-1')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain(DOWNLOAD_FILE_NAME);
    });

    it('returns 404 when file URL is null', async () => {
      prisma.message.findUnique.mockResolvedValue({
        fileUrl: null,
        fileName: null,
        fileType: null,
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
      });

      const res = await request(app)
        .get('/api/messages/download/msg-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 404 when file does not exist on disk', async () => {
      prisma.message.findUnique.mockResolvedValue({
        fileUrl: 'http://localhost:3001/uploads/messages/ghost-file.txt',
        fileName: 'ghost-file.txt',
        fileType: 'text/plain',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
      });

      const res = await request(app)
        .get('/api/messages/download/msg-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect([404, 500]).toContain(res.status);
    });

    it('returns 500 when prisma throws during download', async () => {
      prisma.message.findUnique.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .get('/api/messages/download/msg-err')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Download failed/i);
    });

    it('uses default filename when fileName is null', async () => {
      prisma.message.findUnique.mockResolvedValue({
        fileUrl: DOWNLOAD_FILE_URL,
        fileName: null,
        fileType: null,
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
      });

      const res = await request(app)
        .get('/api/messages/download/msg-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('download');
    });

    it('returns 401 when token has no userId (download)', async () => {
      const noUserIdToken = jwt.sign(
        { username: '@ghost' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .get('/api/messages/download/msg-1')
        .set('Authorization', `Bearer ${noUserIdToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Unauthorized/i);
    });
  });

  // ─── Upload with missing userId ──────────────────────────────────────────────

  describe('Upload with missing userId', () => {
    it('returns 401 when auth passes but userId is missing', async () => {
      const noUserIdToken = jwt.sign(
        { username: '@ghost' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${noUserIdToken}`)
        .attach('file', Buffer.from('img'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .field('recipientId', OTHER_USER_ID);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Unauthorized/i);
    });
  });

  // ─── S3 utility functions ────────────────────────────────────────────────────

  describe('deleteFromS3', () => {
    it('returns immediately when S3 client is not configured', async () => {
      await expect(deleteFromS3('some-key')).resolves.toBeUndefined();
    });

    it('calls S3 send when S3 client is configured (production)', async () => {
      process.env.NODE_ENV = 'production';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.AWS_REGION = 'us-east-1';

      const s3Mod = require('@aws-sdk/client-s3');
      s3Mod.S3Client.mockImplementation(() => ({ send: mockS3Send }));
      s3Mod.DeleteObjectCommand.mockImplementation((args: any) => args);
      mockS3Send.mockResolvedValue({});

      let prodDeleteFromS3: typeof deleteFromS3;
      jest.isolateModules(() => {
        prodDeleteFromS3 = require('../routes/file-upload').deleteFromS3;
      });

      process.env.NODE_ENV = 'test';

      await prodDeleteFromS3!('uploads/messages/file.jpg');
      expect(mockS3Send).toHaveBeenCalled();
    });
  });

  // ─── Production S3 code paths ────────────────────────────────────────────────

  describe('Production S3 code paths', () => {
    it('uploads to S3 and downloads from S3 in production mode', async () => {
      let prodApp: express.Express;
      let prodPrisma: any;

      process.env.NODE_ENV = 'production';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.AWS_REGION = 'us-east-1';

      mockS3Send.mockResolvedValue({});
      redisModule.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 });
      redisModule.isTokenBlacklisted.mockResolvedValue(false);
      waveformModule.generatePlaceholderWaveform.mockReturnValue(new Array(50).fill(0.5));

      // Re-establish S3Client mock implementation (cleared by resetMocks)
      const s3Mod = require('@aws-sdk/client-s3');
      s3Mod.S3Client.mockImplementation(() => ({ send: mockS3Send }));
      s3Mod.PutObjectCommand.mockImplementation((args: any) => args);
      s3Mod.GetObjectCommand.mockImplementation((args: any) => args);

      jest.isolateModules(() => {
        const prodRouter = require('../routes/file-upload').default;
        prodPrisma = require('../lib/prisma').prisma;
        prodApp = express();
        prodApp.use(express.json());
        prodApp.use('/api/messages', prodRouter);
      });

      process.env.NODE_ENV = 'test';

      // ── Test upload ──
      prodPrisma.message.create.mockResolvedValue({
        id: 'msg-s3-1',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
        content: 'photo.jpg',
        type: 'image',
        status: 'sent',
        createdAt: new Date(),
      });

      const uploadRes = await request(prodApp!)
        .post('/api/messages/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('img-data'), { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .field('recipientId', OTHER_USER_ID)
        .field('type', 'image');

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.fileUrl).toContain('s3.');
      expect(mockS3Send).toHaveBeenCalled();

      // ── Test download ──
      const { Readable } = require('stream');
      const readable = Readable.from(['file-content-here']);
      mockS3Send.mockResolvedValue({ Body: readable, ContentLength: 17 });

      prodPrisma.message.findUnique.mockResolvedValue({
        fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/uploads/messages/photo.jpg',
        fileName: 'photo.jpg',
        fileType: 'image/jpeg',
        senderId: TEST_USER_ID,
        recipientId: OTHER_USER_ID,
      });

      const downloadRes = await request(prodApp!)
        .get('/api/messages/download/msg-s3-1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-disposition']).toContain('photo.jpg');
      expect(downloadRes.headers['content-length']).toBe('17');
    });
  });
});
