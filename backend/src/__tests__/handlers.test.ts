import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

jest.mock('../lib/redis', () => ({
  setPresence: jest.fn().mockResolvedValue(undefined),
  getPresence: jest.fn().mockResolvedValue(null),
  removePresence: jest.fn().mockResolvedValue(undefined),
  setSocketMapping: jest.fn().mockResolvedValue(undefined),
  getSocketId: jest.fn().mockResolvedValue(null),
  removeSocketMapping: jest.fn().mockResolvedValue(undefined),
  getAllOnlineUserIds: jest.fn().mockResolvedValue([]),
  getMultiplePresences: jest.fn().mockResolvedValue([]),
  invalidateConversationCache: jest.fn().mockResolvedValue(undefined),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
}));

jest.mock('../lib/conversation', () => ({
  getOrCreateConversation: jest.fn().mockResolvedValue({ id: 'conv-1', status: 'accepted', initiatorId: 'u1' }),
  acceptConversation: jest.fn(),
  findConversation: jest.fn(),
  getConnectedUserIds: jest.fn().mockResolvedValue({ all: new Set(), pendingInitiatedByMe: new Set() }),
  getBlockBetween: jest.fn().mockResolvedValue({ blocked: false }),
}));

jest.mock('../services/openai', () => ({
  generateAIReply: jest.fn().mockResolvedValue('AI response'),
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_MAX_TOKENS: 4096,
}));

import { setupSocketHandlers } from '../socket/handlers';

const prisma = new PrismaClient();

function createMockSocket(overrides: Record<string, any> = {}) {
  return {
    id: 'sock-test-123',
    userId: undefined as string | undefined,
    username: undefined as string | undefined,
    displayName: undefined as string | undefined,
    profileImage: undefined as string | undefined,
    handshake: {
      auth: { token: '' },
      headers: {},
    },
    join: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    ...overrides,
  };
}

function createMockIO() {
  const connectionHandlers: ((socket: any) => void)[] = [];
  const middlewareHandlers: ((socket: any, next: (err?: Error) => void) => void)[] = [];

  return {
    use: jest.fn((fn: any) => { middlewareHandlers.push(fn); }),
    on: jest.fn((event: string, fn: any) => {
      if (event === 'connection') connectionHandlers.push(fn);
    }),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    sockets: { adapter: { rooms: new Map() } },
    _middlewareHandlers: middlewareHandlers,
    _connectionHandlers: connectionHandlers,
  };
}

describe('Socket Handlers', () => {
  let mockIO: ReturnType<typeof createMockIO>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIO = createMockIO();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('setupSocketHandlers', () => {
    it('should register middleware and connection handler', () => {
      setupSocketHandlers(mockIO as any);

      expect(mockIO.use).toHaveBeenCalledTimes(1);
      expect(mockIO.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('Authentication Middleware', () => {
    it('should reject connections without a token', async () => {
      setupSocketHandlers(mockIO as any);
      const middleware = mockIO._middlewareHandlers[0];
      const socket = createMockSocket();
      const next = jest.fn();

      await middleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Authentication error'),
      }));
    });

    it('should reject connections with invalid token', async () => {
      setupSocketHandlers(mockIO as any);
      const middleware = mockIO._middlewareHandlers[0];
      const socket = createMockSocket({
        handshake: { auth: { token: 'invalid-token' }, headers: {} },
      });
      const next = jest.fn();

      await middleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Authentication error'),
      }));
    });

    it('should reject when user not found in database', async () => {
      setupSocketHandlers(mockIO as any);
      const middleware = mockIO._middlewareHandlers[0];
      const token = jwt.sign({ userId: 'nonexistent-user' }, process.env.JWT_SECRET || 'test-secret');
      const socket = createMockSocket({
        handshake: { auth: { token }, headers: {} },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const next = jest.fn();

      await middleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('User not found'),
      }));
    });

    it('should authenticate valid user and attach user data to socket', async () => {
      setupSocketHandlers(mockIO as any);
      const middleware = mockIO._middlewareHandlers[0];
      const token = jwt.sign({ userId: 'user-123' }, process.env.JWT_SECRET || 'test-secret');
      const socket = createMockSocket({
        handshake: { auth: { token }, headers: {} },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123', username: '@testuser', email: 'test@test.com',
        profileImage: 'img.png', displayName: 'Test User',
      });
      const next = jest.fn();

      await middleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe('user-123');
      expect(socket.username).toBe('@testuser');
      expect(socket.displayName).toBe('Test User');
    });

    it('should accept token from authorization header', async () => {
      setupSocketHandlers(mockIO as any);
      const middleware = mockIO._middlewareHandlers[0];
      const token = jwt.sign({ userId: 'user-456' }, process.env.JWT_SECRET || 'test-secret');
      const socket = createMockSocket({
        handshake: { auth: {}, headers: { authorization: `Bearer ${token}` } },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-456', username: '@headeruser', email: 'h@test.com',
        profileImage: null, displayName: 'Header User',
      });
      const next = jest.fn();

      await middleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe('user-456');
    });
  });

  describe('Connection Handler', () => {
    it('should register event handlers on connection', async () => {
      const redisModule = require('../lib/redis');
      const convoModule = require('../lib/conversation');

      setupSocketHandlers(mockIO as any);
      const connectionHandler = mockIO._connectionHandlers[0];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ showOnlineStatus: true });
      (convoModule.getConnectedUserIds as jest.Mock).mockResolvedValue({
        all: new Set(), pendingInitiatedByMe: new Set(),
      });
      (redisModule.getMultiplePresences as jest.Mock).mockResolvedValue([]);

      const socket = createMockSocket({ userId: 'user-1', username: '@user1' });
      await connectionHandler(socket);

      expect(redisModule.setSocketMapping).toHaveBeenCalledWith('user-1', 'sock-test-123');
      expect(redisModule.setPresence).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', status: 'online' })
      );
      expect(socket.join).toHaveBeenCalledWith('user:user-1');
      expect(socket.emit).toHaveBeenCalledWith('socket:ready', { userId: 'user-1' });

      const registeredEvents = socket.on.mock.calls.map((c: any[]) => c[0]);
      expect(registeredEvents).toContain('message:send');
      expect(registeredEvents).toContain('disconnect');
      expect(registeredEvents).toContain('typing:start');
      expect(registeredEvents).toContain('typing:stop');
    });
  });
});
