import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import path from 'path';
import { createAdapter } from '@socket.io/redis-adapter';

// Redis
import { connectRedis, disconnectRedis, isRedisConnected, redisPub, redisSub } from './lib/redis';

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
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => callback(null, true), // allow widget from any origin
    methods: ['GET', 'POST'],
    credentials: false,
  },
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.FRONTEND_URL ? [
    process.env.FRONTEND_URL.replace('https://', 'https://www.'),
  ] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
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

// Static file serving for uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
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
app.use('/api', emailTemplatesRoutes);

// Serve the embeddable widget JS with open CORS so any site can load it
app.use('/widget', (_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache
  next();
}, express.static(path.join(__dirname, '../../widget')));

const PORT = process.env.PORT || 3001;

async function start() {
  // Connect Redis first
  try {
    await connectRedis();
    console.log('🔴 Redis ready');
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

  // Stale guest cleanup: run immediately on startup then every 30 minutes
  cleanupStaleGuests();
  setInterval(cleanupStaleGuests, 30 * 60 * 1000);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log('🛑 Shutting down gracefully...');

  // Disconnect Redis
  try {
    await disconnectRedis();
    console.log('🔴 Redis disconnected');
  } catch (e) {
    console.error('⚠️  Error disconnecting Redis:', e);
  }

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
