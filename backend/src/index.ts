import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import path from 'path';

// Import REST API routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import messageRoutes from './routes/messages';
import groupRoutes from './routes/groups';
import emailTemplatesRoutes from './routes/email-templates';
import fileUploadRoutes from './routes/file-upload';

// Import Socket.io handlers
import { setupSocketHandlers } from './socket/handlers';
import { setSocketIO } from './routes/file-upload';
import { setMessagesSocketIO } from './routes/messages';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for Swagger UI
  frameguard: false, // Disabled to allow email preview in iframe
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource loading
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger API Documentation
app.use('/api/docs', swaggerUi.serve);
app.get('/api/docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Chatr API Documentation',
}));

// Static file serving for uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// REST API Routes (HTTP)
app.use('/api/auth', authRoutes);        // Registration, Login, Logout
app.use('/api/users', userRoutes);       // User search, profiles
app.use('/api/messages', messageRoutes); // Message history, conversations
app.use('/api/messages', fileUploadRoutes); // File uploads
app.use('/api/groups', groupRoutes);     // Group CRUD operations
app.use('/api', emailTemplatesRoutes);   // Email template preview

// WebSocket handlers (Real-time chat only)
setupSocketHandlers(io);
setSocketIO(io);
setMessagesSocketIO(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = () => {
  console.log('🛑 Shutting down gracefully...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force close after 10s if not closed
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
