import express from 'express';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync, existsSync } from 'fs';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import path from 'path';
import { createAdapter } from '@socket.io/redis-adapter';

// Database & Cache
import { prisma } from './lib/prisma';
import { connectRedis, disconnectRedis, isRedisConnected, redis, redisPub, redisSub } from './lib/redis';
import { restoreTestMode } from './lib/testMode';

// Import REST API routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import messageRoutes from './routes/messages';
import groupRoutes from './routes/groups';
import emailTemplatesRoutes from './routes/email-templates';
import fileUploadRoutes from './routes/file-upload';
import friendRoutes from './routes/friends';
import conversationRoutes from './routes/conversations';
import widgetRoutes from './routes/widget';
import dashboardRoutes from './routes/dashboard';
import linkPreviewRoutes from './routes/link-preview';
import testCleanupRoutes from './routes/test-cleanup';
import contactRoutes from './routes/contact';
import adminRoutes, { setAdminSocketIO } from './routes/admin';
import { setWidgetSocketIO, cleanupStaleGuests } from './routes/widget';

// Import Socket.io handlers
import { setupSocketHandlers } from './socket/handlers';
import { setSocketIO } from './routes/file-upload';
import { setMessagesSocketIO } from './routes/messages';
import { setConversationsSocketIO } from './routes/conversations';
import { setUsersSocketIO } from './routes/users';
import { setGroupsSocketIO } from './routes/groups';

dotenv.config();

const app = express();

const certDir = path.join(__dirname, '../../certs');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');
const useHttps = process.env.NODE_ENV !== 'production' && existsSync(keyPath) && existsSync(certPath);

// HTTPS server for browser connections; plain HTTP server for Next.js rewrite proxy
const httpServer = createServer(app);
const httpsServer = useHttps
  ? createHttpsServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, app)
  : null;
const socketOpts = {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: false,
  },
};
const io = new Server(socketOpts);
io.attach(httpServer);
if (httpsServer) io.attach(httpsServer);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  ...(process.env.WEBSITE_URL ? [process.env.WEBSITE_URL] : []),
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  ...(process.env.FRONTEND_URL ? [
    process.env.FRONTEND_URL.replace('https://', 'https://www.'),
  ] : []),
  ...(process.env.WEBSITE_URL ? [
    process.env.WEBSITE_URL.replace('https://', 'https://www.'),
  ] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Health check (includes Redis status)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: isRedisConnected() ? 'connected' : 'disconnected',
  });
});

// Swagger API Documentation — basic auth in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/docs', (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Basic ')) {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
      const [user, pass] = decoded.split(':');
      const expectedUser = process.env.SWAGGER_USER || 'admin';
      const expectedPass = process.env.SWAGGER_PASS || process.env.DB_PASSWORD || 'chatr';
      if (user === expectedUser && pass === expectedPass) return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Chatr API Docs"');
    res.status(401).send('Unauthorized');
  });
}
app.use('/api/docs', swaggerUi.serve);
app.get('/api/docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Chatr API Documentation',
}));

// Static file serving for uploads with CORS + cache headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Static public assets (default avatars etc) — open CORS, no user data
app.use('/assets', (_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
}, express.static(path.join(__dirname, '../assets')));

// REST API Routes (HTTP)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/messages', fileUploadRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/link-preview', linkPreviewRoutes);
app.use('/api/test', testCleanupRoutes);
app.use('/api', emailTemplatesRoutes);
app.use('/api', contactRoutes);
app.use('/api/admin', adminRoutes);

// Serve the embeddable widget JS with open CORS so any site can load it
app.use('/widget', (_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // No cache in dev so edits to chatr.js are picked up immediately
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Cache-Control', 'public, max-age=300');
  } else {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
}, express.static(path.join(__dirname, '../../widget')));

const PORT = process.env.PORT || 3001;

async function start() {
  // Warm up Prisma connection pool before handling any requests
  try {
    await prisma.$connect();
    console.log('🟢 Prisma connected');
  } catch (err) {
    console.error('⚠️  Prisma connection failed:', (err as Error).message);
  }

  // Connect Redis and verify with a ping
  try {
    await connectRedis();
    await redis.ping();
    console.log('🔴 Redis ready');
    await restoreTestMode();
  } catch (err) {
    console.error('⚠️  Redis connection failed — running without Redis:', (err as Error).message);
  }

  // Attach Socket.io Redis adapter for horizontal scaling
  if (isRedisConnected()) {
    io.adapter(createAdapter(redisPub, redisSub));
    console.log('📡 Socket.io Redis adapter attached');
  }

  // WebSocket handlers (Real-time chat only)
  setupSocketHandlers(io);
  setSocketIO(io);
  setMessagesSocketIO(io);
  setConversationsSocketIO(io);
  setUsersSocketIO(io);
  setGroupsSocketIO(io);
  setWidgetSocketIO(io);
  setAdminSocketIO(io);

  // Stale guest cleanup: run immediately on startup then every 30 minutes
  cleanupStaleGuests();
  setInterval(cleanupStaleGuests, 30 * 60 * 1000);

  // One-time migration: set group creators' role to 'owner' (idempotent)
  (async () => {
    try {
      const { prisma: p } = await import('./lib/prisma');
      const groups = await p.group.findMany({ select: { id: true, ownerId: true } });
      if (groups.length) {
        await p.$executeRawUnsafe(
          `UPDATE "GroupMember" SET role = 'owner' WHERE role != 'owner' AND (${
            groups.map(g => `("userId" = '${g.ownerId}' AND "groupId" = '${g.id}')`).join(' OR ')
          })`,
        );
        console.log(`✅ Migrated ${groups.length} group owner roles`);
      }
    } catch (e) { console.warn('Owner role migration skipped:', e); }
  })();

  httpServer.keepAliveTimeout = 30_000;
  httpServer.headersTimeout = 35_000;

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  });

  if (httpsServer) {
    const HTTPS_PORT = Number(PORT) + 1; // 3002
    httpsServer.keepAliveTimeout = 30_000;
    httpsServer.headersTimeout = 35_000;
    httpsServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`⚠️  HTTPS port ${HTTPS_PORT} already in use — HTTPS disabled this run`);
      } else {
        console.error('⚠️  HTTPS server error:', err.message);
      }
    });
    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`🔒 HTTPS: https://localhost:${HTTPS_PORT}`);
      console.log(`🔒 WebSocket: wss://localhost:${HTTPS_PORT}`);
    });
  }
}

process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught exception (process kept alive):', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled rejection (process kept alive):', reason);
});

start().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log('🛑 Shutting down gracefully...');

  try {
    await prisma.$disconnect();
    console.log('🟢 Prisma disconnected');
  } catch (e) {
    console.error('⚠️  Error disconnecting Prisma:', e);
  }

  try {
    await disconnectRedis();
    console.log('🔴 Redis disconnected');
  } catch (e) {
    console.error('⚠️  Error disconnecting Redis:', e);
  }

  if (httpsServer) httpsServer.close();
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
