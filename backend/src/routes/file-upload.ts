import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import fs from 'fs';
import { generatePlaceholderWaveform, generateWaveformFromFile } from '../services/waveform';

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


// Ensure uploads directories exist
const messagesDir = path.join(__dirname, '../../uploads/messages');
const audioDir = path.join(__dirname, '../../uploads/audio');

if (!fs.existsSync(messagesDir)) {
  fs.mkdirSync(messagesDir, { recursive: true });
}
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Route audio files to audio subfolder, everything else to messages
    const isAudio = file.mimetype.startsWith('audio/');
    const destination = isAudio ? audioDir : messagesDir;
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
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
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Recipient ID required' });
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const isAudio = req.file.mimetype.startsWith('audio/');
    const subfolder = isAudio ? 'audio' : 'messages';
    const fileUrl = `${backendUrl}/uploads/${subfolder}/${req.file.filename}`;

    const userId = req.user?.userId;
    if (!userId) {
      fs.unlinkSync(req.file.path);
      return res.status(401).json({ error: 'Unauthorized' });
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
    if (needsWaveformGeneration && _io) {
      const filePath = req.file.path;
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
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'File upload failed' });
  }
});

export default router;

