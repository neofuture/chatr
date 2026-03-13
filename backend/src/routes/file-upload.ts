import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { Server } from 'socket.io';
import fs from 'fs';
import { generatePlaceholderWaveform, generateWaveformFromFile } from '../services/waveform';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

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
    fileSize: 50 * 1024 * 1024, // 50MB max (videos can be large)
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
      // Video
      'video/mp4',
      'video/quicktime',
      'video/webm',
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

    const { recipientId, type, waveform, duration: durationParam, caption } = req.body;

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
    let audioDurationFromWaveform: number | undefined;

    // Prefer duration sent explicitly by the client (accurate for any length).
    // NEVER calculate from waveformData.length / 10 — waveforms are always resampled
    // to a fixed bar count (e.g. 100), so length / 10 always gives 10s regardless.
    if (durationParam) {
      const parsed = parseFloat(durationParam);
      if (!isNaN(parsed) && parsed > 0) audioDurationFromWaveform = parsed;
    }

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

    const isVideo = req.file.mimetype.startsWith('video/');
    const messageType = isAudio ? 'audio' : isVideo ? 'video' : (type === 'image' ? 'image' : 'file');

    const message = await prisma.message.create({
      data: {
        senderId: userId,
        recipientId,
        content: isAudio ? 'Voice message' : (caption?.trim() || req.file.originalname),
        type: messageType,
        status: 'sent',
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        audioWaveform: waveformData,
        audioDuration: audioDurationFromWaveform,
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
      duration: audioDurationFromWaveform,
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

// ── GET /api/messages/download/:messageId ─────────────────────────────────────
// Proxies the file through the backend so Content-Disposition: attachment
// with the original filename works in all environments, including S3.
router.get('/download/:messageId', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const message = await prisma.message.findUnique({
      where: { id: req.params.messageId },
      select: { fileUrl: true, fileName: true, fileType: true, senderId: true, recipientId: true },
    });

    if (!message?.fileUrl) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (message.senderId !== userId && message.recipientId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const originalName = message.fileName || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (message.fileType) res.setHeader('Content-Type', message.fileType);

    if (IS_PRODUCTION) {
      // Extract the S3 key from the URL:
      // e.g. https://bucket.s3.eu-west-2.amazonaws.com/uploads/messages/file-123.zip
      // → uploads/messages/file-123.zip
      const s3Url = new URL(message.fileUrl);
      const s3Key = s3Url.pathname.replace(/^\//, '');

      const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
      const s3Response = await s3!.send(command);

      if (s3Response.ContentLength) {
        res.setHeader('Content-Length', s3Response.ContentLength);
      }

      (s3Response.Body as Readable).pipe(res);
    } else {
      // Dev — file is on disk
      // fileUrl is like "http://localhost:3001/uploads/messages/file-123.zip"
      const urlPath = message.fileUrl.replace(/^https?:\/\/[^/]+/, '');
      const diskPath = path.resolve(path.join(__dirname, '../../', urlPath));

      if (!fs.existsSync(diskPath)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }

      res.sendFile(diskPath);
    }
  } catch (err) {
    console.error('❌ Download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

export default router;

