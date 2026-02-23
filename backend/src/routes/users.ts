import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const router = Router();
const prisma = new PrismaClient();

// ── S3 (production only) ─────────────────────────────────────────────────────
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

async function uploadImageToS3(buffer: Buffer, key: string, mimeType: string): Promise<string> {
  if (!s3) throw new Error('S3 not configured');
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buffer, ContentType: mimeType }));
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

async function deleteImageFromS3(url: string): Promise<void> {
  if (!s3 || !url) return;
  try {
    // Extract S3 key from full URL
    const key = url.replace(`https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/`, '');
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    console.log('🗑️  Deleted from S3:', key);
  } catch (err) {
    console.error('⚠️  Failed to delete from S3:', err);
  }
}

function deleteLocalFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error('⚠️  Failed to delete local file:', err);
  }
}

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all verified users (for contacts/testing)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of verified users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                       emailVerified:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 */
// GET /api/users - Get all verified users
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        emailVerified: true, // Only show verified users
      },
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        displayName: true,
        firstName: true,
        lastName: true,
        profileImage: true,
      },
      orderBy: {
        username: 'asc',
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Ensure covers directory exists
const coversDir = path.join(__dirname, '../../uploads/covers');
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

// Use memory storage so we can access userId from body before saving
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// Separate multer config for cover images with larger size limit
const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for cover images
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

/**
 * @swagger
 * /api/users/check-username:
 *   get:
 *     summary: Check if username is available
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username to check (with or without @ prefix)
 *     responses:
 *       200:
 *         description: Username availability status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *       400:
 *         description: Username is required
 *       500:
 *         description: Internal server error
 */
// GET /api/users/check-username?username=test - Check if username is available
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Add @ prefix if not present
    const usernameWithAt = username.startsWith('@') ? username : `@${username}`;

    // Check if username exists
    const existingUser = await prisma.user.findUnique({
      where: { username: usernameWithAt },
    });

    res.json({ available: !existingUser });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/users/suggest-username:
 *   get:
 *     summary: Get username suggestions
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Base username to generate suggestions from
 *     responses:
 *       200:
 *         description: Username suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Array of 3 available username suggestions
 *       400:
 *         description: Username is required
 *       500:
 *         description: Internal server error
 */
// GET /api/users/suggest-username?username=test - Get username suggestions
router.get('/suggest-username', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Remove @ if present for generation
    const baseUsername = username.startsWith('@') ? username.substring(1) : username;
    const suggestions: string[] = [];

    // Generate suggestions with different strategies
    const strategies = [
      // Strategy 1: Add random numbers
      () => `${baseUsername}${Math.floor(Math.random() * 999) + 1}`,
      // Strategy 2: Add random 2-digit number
      () => `${baseUsername}${Math.floor(Math.random() * 90) + 10}`,
      // Strategy 3: Add random 3-digit number
      () => `${baseUsername}${Math.floor(Math.random() * 900) + 100}`,
      // Strategy 4: Add underscore and number
      () => `${baseUsername}_${Math.floor(Math.random() * 999) + 1}`,
      // Strategy 5: Add year
      () => `${baseUsername}${new Date().getFullYear()}`,
      // Strategy 6: Add random 4-digit
      () => `${baseUsername}${Math.floor(Math.random() * 9000) + 1000}`,
    ];

    // Try to find 3 available usernames
    let attempts = 0;
    const maxAttempts = 20;

    while (suggestions.length < 3 && attempts < maxAttempts) {
      // Pick a random strategy
      const strategy = strategies[Math.floor(Math.random() * strategies.length)];
      const suggestion = strategy();
      const suggestionWithAt = `@${suggestion}`;

      // Check if this suggestion is already in our list
      if (suggestions.includes(suggestion)) {
        attempts++;
        continue;
      }

      // Check if username is available
      const existingUser = await prisma.user.findUnique({
        where: { username: suggestionWithAt },
      });

      if (!existingUser) {
        suggestions.push(suggestion);
      }

      attempts++;
    }

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggest username error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/search?q=username - Search users by username
router.get('/search', (req, res) => {
  // TODO: Implement user search
  // - Search by @username
  // - Return paginated results
  // - Exclude current user
  res.status(501).json({ message: 'User search not implemented yet' });
});

// GET /api/users/:username - Get user profile
router.get('/:username', (req, res) => {
  // TODO: Implement get user profile
  // - Get user by username
  // - Return public profile info
  // - Include online status
  res.status(501).json({ message: 'Get user profile not implemented yet' });
});

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *                 username:
 *                   type: string
 *                 profileImage:
 *                   type: string
 *                 emailVerified:
 *                   type: boolean
 *                 phoneVerified:
 *                   type: boolean
 *       401:
 *         description: Access token required
 *       403:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found
 */
// GET /api/users/me - Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        username: true,
        displayName: true,
        profileImage: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/me - Update profile (displayName etc.)
router.put('/me', authenticateToken as any, async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { displayName } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(displayName !== undefined ? { displayName: displayName || null } : {}),
      },
      select: { id: true, username: true, displayName: true, profileImage: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/users/profile-image:
 *   post:
 *     summary: Upload profile image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - profileImage
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, WebP, max 5MB)
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: URL to access the uploaded image
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Access token required
 *       403:
 *         description: Invalid or expired token
 *       500:
 *         description: Failed to update database
 */
// POST /api/users/profile-image - Upload profile image
router.post('/profile-image', authenticateToken as any, upload.single('profileImage') as any, async (req, res) => {
  try {
    // Get userId from authenticated token
    const userId = req.user?.userId;
    const file = req.file;

    console.log('📸 Profile image upload request:', { userId, hasFile: !!file });

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Generate filename
    const ext = path.extname(file.originalname);
    const filename = `${userId}-${Date.now()}${ext}`;

    let fileUrl: string;

    if (IS_PRODUCTION) {
      const s3Key = `uploads/profiles/${filename}`;
      console.log(`☁️  Uploading profile image to S3: ${s3Key}`);
      fileUrl = await uploadImageToS3(file.buffer, s3Key, file.mimetype);
      console.log(`✅ S3 profile upload complete: ${fileUrl}`);
    } else {
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, file.buffer);
      console.log('💾 File saved:', filename);
      fileUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/profiles/${filename}`;
    }

    // Update user's profile image in database
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileImage: true },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { profileImage: fileUrl },
      });
      console.log('✅ Profile image saved to database for user:', userId);

      // Delete old image
      if (existingUser?.profileImage) {
        if (IS_PRODUCTION) {
          await deleteImageFromS3(existingUser.profileImage);
        } else {
          let oldPath = existingUser.profileImage;
          if (oldPath.startsWith('http')) oldPath = new URL(oldPath).pathname;
          deleteLocalFile(path.join(__dirname, '../..', oldPath));
        }
      }
    } catch (dbError) {
      console.error('❌ Database update failed:', dbError);
      return res.status(500).json({ error: 'Failed to update database' });
    }

    res.json({ url: fileUrl });
    console.log('✅ Profile image upload successful');
  } catch (error) {
    console.error('❌ Profile image upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/users/cover-image:
 *   post:
 *     summary: Upload cover image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               coverImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cover image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Upload failed
 */
// POST /api/users/cover-image - Upload cover image
router.post('/cover-image', authenticateToken as any, coverUpload.single('coverImage') as any, async (req, res) => {
  try {
    // Get userId from authenticated token
    const userId = req.user?.userId;
    const file = req.file;

    console.log('🖼️  Cover image upload request:', { userId, hasFile: !!file });

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Generate filename
    const ext = path.extname(file.originalname);
    const filename = `${userId}-${Date.now()}${ext}`;

    let fileUrl: string;

    if (IS_PRODUCTION) {
      const s3Key = `uploads/covers/${filename}`;
      console.log(`☁️  Uploading cover image to S3: ${s3Key}`);
      fileUrl = await uploadImageToS3(file.buffer, s3Key, file.mimetype);
      console.log(`✅ S3 cover upload complete: ${fileUrl}`);
    } else {
      const filepath = path.join(coversDir, filename);
      fs.writeFileSync(filepath, file.buffer);
      console.log('💾 File saved:', filename);
      fileUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/uploads/covers/${filename}`;
    }

    // Update user's cover image in database
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { coverImage: true },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { coverImage: fileUrl },
      });
      console.log('✅ Cover image saved to database for user:', userId);

      // Delete old image
      if (existingUser?.coverImage) {
        if (IS_PRODUCTION) {
          await deleteImageFromS3(existingUser.coverImage);
        } else {
          let oldPath = existingUser.coverImage;
          if (oldPath.startsWith('http')) oldPath = new URL(oldPath).pathname;
          deleteLocalFile(path.join(__dirname, '../..', oldPath));
        }
      }
    } catch (dbError) {
      console.error('❌ Database update failed:', dbError);
      return res.status(500).json({ error: 'Failed to update database' });
    }

    res.json({ url: fileUrl });
    console.log('✅ Cover image upload successful');
  } catch (error) {
    console.error('❌ Cover image upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/users/profile-image:
 *   delete:
 *     summary: Delete profile image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile image deleted successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to delete image
 */
// DELETE /api/users/profile-image - Delete profile image
router.delete('/profile-image', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('🗑️  Profile image delete request:', userId);

    // Get current profile image path
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileImage: true },
    });

    if (!user?.profileImage) {
      return res.json({ message: 'No profile image to delete' });
    }

    // Delete image from storage
    if (IS_PRODUCTION) {
      await deleteImageFromS3(user.profileImage);
    } else {
      let filePath = user.profileImage;
      if (filePath.startsWith('http')) filePath = new URL(filePath).pathname;
      deleteLocalFile(path.join(__dirname, '../..', filePath));
    }

    // Update database
    await prisma.user.update({
      where: { id: userId },
      data: { profileImage: null },
    });

    console.log('✅ Profile image removed from database for user:', userId);
    res.json({ message: 'Profile image deleted successfully' });

  } catch (error) {
    console.error('❌ Profile image delete error:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/users/cover-image:
 *   delete:
 *     summary: Delete cover image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cover image deleted successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to delete image
 */
// DELETE /api/users/cover-image - Delete cover image
router.delete('/cover-image', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('🗑️  Cover image delete request:', userId);

    // Get current cover image path
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coverImage: true },
    });

    if (!user?.coverImage) {
      return res.json({ message: 'No cover image to delete' });
    }

    // Delete image from storage
    if (IS_PRODUCTION) {
      await deleteImageFromS3(user.coverImage);
    } else {
      let filePath = user.coverImage;
      if (filePath.startsWith('http')) filePath = new URL(filePath).pathname;
      deleteLocalFile(path.join(__dirname, '../..', filePath));
    }

    // Update database
    await prisma.user.update({
      where: { id: userId },
      data: { coverImage: null },
    });

    console.log('✅ Cover image removed from database for user:', userId);
    res.json({ message: 'Cover image deleted successfully' });

  } catch (error) {
    console.error('❌ Cover image delete error:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

