import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import fs from 'fs';
import { generatePlaceholderWaveform, generateWaveformFromFile } from '../services/waveform';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// ── S3 client (only used in production) ──────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const S3_BUCKET = process.env.S3_BUCKET || '';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-2';

const s3 = IS_PRODUCTION ? new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
}) : null;

/**
 * Upload a file buffer to S3 and return the public HTTPS URL.
 */
async function uploadToS3(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  if (!s3) throw new Error('S3 not configured');
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Delete an object from S3 by its key.
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!s3) return;
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

const router = express.Router();
const prisma = new PrismaClient();

// io instance set by index.ts after server starts
let _io: Server | null = null;
export function setSocketIO(io: Server) {
  _io = io;
}

// Extend Request type to include authenticated user
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
  file?: Express.Multer.File;
}


// Ensure local upload directories exist (dev only)
const messagesDir = path.join(__dirname, '../../uploads/messages');
const audioDir = path.join(__dirname, '../../uploads/audio');

if (!IS_PRODUCTION) {
  if (!fs.existsSync(messagesDir)) fs.mkdirSync(messagesDir, { recursive: true });
  if (!fs.existsSync(audioDir))    fs.mkdirSync(audioDir,    { recursive: true });
}

// In production use memory storage (buffer goes straight to S3).
// In development use disk storage.
const storage = IS_PRODUCTION
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const isAudio = file.mimetype.startsWith('audio/');
        cb(null, isAudio ? audioDir : messagesDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
      },
    });

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Allow images, audio, and common document types
    const allowedMimes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      // Audio (for voice messages)
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/x-m4a',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
});

/**
 * @swagger
 * /api/messages/upload:
 *   post:
 *     summary: Upload file or image for messaging
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - recipientId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File or image to upload
 *               recipientId:
 *                 type: string
 *                 description: Recipient user ID
 *               type:
 *                 type: string
 *                 enum: [image, file, audio]
 *                 description: Type of content (image, file, or audio for voice messages)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 messageId:
 *                   type: string
 *                 fileUrl:
 *                   type: string
 *                 fileName:
 *                   type: string
 *                 fileSize:
 *                   type: number
 *                 fileType:
 *                   type: string
 *       400:
 *         description: Bad request
 *       413:
 *         description: File too large
 */
router.post('/upload',
  authenticateToken as any,
  upload.single('file') as any,
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { recipientId, type, waveform } = req.body;

    if (!recipientId) {
      if (!IS_PRODUCTION && req.file.path) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Recipient ID required' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      if (!IS_PRODUCTION && req.file.path) fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isAudio = req.file.mimetype.startsWith('audio/');
    const subfolder = isAudio ? 'audio' : 'messages';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(req.file.originalname);
    const nameWithoutExt = path.basename(req.file.originalname, ext);
    const filename = `${nameWithoutExt}-${uniqueSuffix}${ext}`;

    let fileUrl: string;
    let localFilePath: string | null = null;

    if (IS_PRODUCTION) {
      // Upload buffer directly to S3
      const s3Key = `uploads/${subfolder}/${filename}`;
      console.log(`☁️  Uploading to S3: ${s3Key}`);
      fileUrl = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);
      console.log(`✅ S3 upload complete: ${fileUrl}`);
    } else {
      // Local dev — file already on disk via diskStorage
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      localFilePath = req.file.path;
      fileUrl = `${backendUrl}/uploads/${subfolder}/${req.file.filename}`;
    }

    // Use provided waveform (voice recorder) or placeholder (MP3 upload)
    let waveformData: number[] | undefined;
    if (waveform) {
      try {
        waveformData = JSON.parse(waveform);
      } catch {
        waveformData = undefined;
      }
    }

    // For audio without provided waveform (e.g. MP3 upload), use placeholder immediately
    const needsWaveformGeneration = isAudio && (!waveformData || waveformData.length === 0);
    if (needsWaveformGeneration) {
      waveformData = generatePlaceholderWaveform(req.file.filename);
    }

    const messageType = isAudio ? 'audio' : (type === 'image' ? 'image' : 'file');

    const message = await prisma.message.create({
      data: {
        senderId: userId,
        recipientId,
        content: isAudio ? 'Voice message' : req.file.originalname,
        type: messageType,
        status: 'sent',
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        audioWaveform: waveformData,
      },
    });

    console.log(`📎 File uploaded & message created: ${req.file.originalname} → messageId: ${message.id}`);

    // Respond immediately with placeholder waveform
    res.json({
      success: true,
      messageId: message.id,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      waveform: waveformData,
      needsWaveformGeneration,
    });

    // Async: generate real waveform from file and push update via socket
    if (needsWaveformGeneration && _io && localFilePath) {
      const filePath = localFilePath;
      const messageId = message.id;
      const io = _io;

      setImmediate(async () => {
        try {
          console.log(`🎵 Generating real waveform for message ${messageId}...`);
          const { waveform: realWaveform, duration } = await generateWaveformFromFile(filePath);

          // Update DB
          await prisma.message.update({
            where: { id: messageId },
            data: {
              audioWaveform: realWaveform,
              audioDuration: duration || undefined,
            },
          });

          // Push update to sender
          io.to(`user:${userId}`).emit('audio:waveform', {
            messageId,
            waveform: realWaveform,
            duration,
          });

          // Push update to recipient
          io.to(`user:${recipientId}`).emit('audio:waveform', {
            messageId,
            waveform: realWaveform,
            duration,
          });

          console.log(`✅ Real waveform generated for ${messageId}: ${realWaveform.length} bars, ${duration?.toFixed(1)}s`);
        } catch (err) {
          console.error('❌ Waveform generation failed:', err);
        }
      });
    }

  } catch (error) {
    console.error('File upload error:', error);
    if (!IS_PRODUCTION && req.file && (req.file as any).path && fs.existsSync((req.file as any).path)) {
      fs.unlinkSync((req.file as any).path);
    }
    res.status(500).json({ error: 'File upload failed' });
  }
});

export default router;

