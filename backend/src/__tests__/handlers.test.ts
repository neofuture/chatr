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
  getOrCreateConversation: jest.fn().mockResolvedValue({ id: 'conv-1', status: 'accepted', initiatorId: 'other-user' }),
  acceptConversation: jest.fn().mockResolvedValue(true),
  findConversation: jest.fn().mockResolvedValue({ id: 'conv-1', status: 'accepted' }),
  getConnectedUserIds: jest.fn().mockResolvedValue({ all: new Set(), pendingInitiatedByMe: new Set() }),
  getBlockBetween: jest.fn().mockResolvedValue({ blocked: false }),
}));

jest.mock('../services/openai', () => ({
  generateAIReply: jest.fn().mockResolvedValue('AI response'),
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_MAX_TOKENS: 4096,
}));

jest.mock('../socket/rpcHandlers', () => ({
  registerRPCHandlers: jest.fn(),
}));

import { setupSocketHandlers } from '../socket/handlers';

const redis = require('../lib/redis');
const convo = require('../lib/conversation');
const rpc = require('../socket/rpcHandlers');
const prisma = new PrismaClient() as any;

// Add models not present in the global mock
if (!prisma.messageReaction) {
  prisma.messageReaction = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };
}
if (!prisma.messageEditHistory.create) {
  prisma.messageEditHistory.create = jest.fn();
}

function createMockSocket(overrides: Record<string, any> = {}) {
  const socketToRoomEmit = jest.fn();
  return {
    id: 'sock-1',
    userId: undefined as string | undefined,
    username: undefined as string | undefined,
    displayName: undefined as string | undefined,
    profileImage: undefined as string | undefined,
    handshake: { auth: { token: '' }, headers: {} },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    to: jest.fn(() => ({ emit: socketToRoomEmit })),
    _toEmit: socketToRoomEmit,
    ...overrides,
  };
}

function createMockIO() {
  const connectionHandlers: Function[] = [];
  const middlewareHandlers: Function[] = [];
  const toEmit = jest.fn();

  return {
    use: jest.fn((fn: any) => middlewareHandlers.push(fn)),
    on: jest.fn((event: string, fn: any) => {
      if (event === 'connection') connectionHandlers.push(fn);
    }),
    to: jest.fn(() => ({ emit: toEmit })),
    emit: jest.fn(),
    sockets: { adapter: { rooms: new Map<string, Set<string>>() } },
    _middlewareHandlers: middlewareHandlers,
    _connectionHandlers: connectionHandlers,
    _toEmit: toEmit,
  };
}

describe('Socket Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Re-apply redis defaults (resetMocks clears implementations)
    redis.setPresence.mockResolvedValue(undefined);
    redis.getPresence.mockResolvedValue(null);
    redis.removePresence.mockResolvedValue(undefined);
    redis.setSocketMapping.mockResolvedValue(undefined);
    redis.getSocketId.mockResolvedValue(null);
    redis.removeSocketMapping.mockResolvedValue(undefined);
    redis.getAllOnlineUserIds.mockResolvedValue([]);
    redis.getMultiplePresences.mockResolvedValue([]);
    redis.invalidateConversationCache.mockResolvedValue(undefined);
    redis.isTokenBlacklisted.mockResolvedValue(false);
    redis.checkRateLimit.mockResolvedValue({ allowed: true });

    // Re-apply conversation defaults
    convo.getOrCreateConversation.mockResolvedValue({ id: 'conv-1', status: 'accepted', initiatorId: 'other-user' });
    convo.acceptConversation.mockResolvedValue(true);
    convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'accepted' });
    convo.getConnectedUserIds.mockResolvedValue({ all: new Set(), pendingInitiatedByMe: new Set() });
    convo.getBlockBetween.mockResolvedValue({ blocked: false });

    // Prisma defaults for connection handler
    prisma.user.findUnique.mockResolvedValue({ privacyOnlineStatus: 'everyone', isGuest: false });
    prisma.user.update.mockResolvedValue({});
    prisma.message.create.mockResolvedValue(makeMockMessage());
    prisma.message.findUnique.mockResolvedValue(null);
    prisma.message.update.mockResolvedValue({});
    prisma.message.updateMany.mockResolvedValue({ count: 0 });
    prisma.messageReaction.findUnique.mockResolvedValue(null);
    prisma.messageReaction.findMany.mockResolvedValue([]);
    prisma.messageReaction.upsert.mockResolvedValue({});
    prisma.messageReaction.delete.mockResolvedValue({});
    prisma.messageEditHistory.create.mockResolvedValue({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function makeMockMessage(overrides: Record<string, any> = {}) {
    return {
      id: 'msg-1',
      senderId: 'user-1',
      recipientId: 'user-2',
      content: 'Hello!',
      type: 'text',
      status: 'sent',
      createdAt: new Date('2024-01-01'),
      fileUrl: null, fileName: null, fileSize: null, fileType: null,
      audioWaveform: null, audioDuration: null,
      replyToId: null, replyToContent: null, replyToSenderName: null,
      replyToType: null, replyToDuration: null,
      linkPreview: null, deletedAt: null, edited: false, editedAt: null,
      sender: { id: 'user-1', username: '@testuser', email: 'test@test.com' },
      ...overrides,
    };
  }

  /** Run setupSocketHandlers, then invoke the connection handler with a socket. */
  async function connectSocket(socketOverrides: Record<string, any> = {}) {
    const io = createMockIO();
    setupSocketHandlers(io as any);

    const socket = createMockSocket({
      userId: 'user-1',
      username: '@testuser',
      displayName: 'Test User',
      profileImage: null,
      ...socketOverrides,
    });

    await io._connectionHandlers[0](socket);

    const events: Record<string, Function> = {};
    socket.on.mock.calls.forEach(([ev, fn]: any) => { events[ev] = fn; });

    return { io, socket, events };
  }

  // ─── Setup ────────────────────────────────────────────────────────────────────

  describe('setupSocketHandlers', () => {
    it('registers middleware and connection handler', () => {
      const io = createMockIO();
      setupSocketHandlers(io as any);

      expect(io.use).toHaveBeenCalledTimes(1);
      expect(io.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  // ─── Auth Middleware ──────────────────────────────────────────────────────────

  describe('Authentication Middleware', () => {
    function getMiddleware() {
      const io = createMockIO();
      setupSocketHandlers(io as any);
      return io._middlewareHandlers[0];
    }

    it('rejects connection without token', async () => {
      const next = jest.fn();
      await getMiddleware()(createMockSocket(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Authentication error'),
      }));
    });

    it('rejects connection with invalid JWT', async () => {
      const next = jest.fn();
      const socket = createMockSocket({
        handshake: { auth: { token: 'bad.token.here' }, headers: {} },
      });

      await getMiddleware()(socket, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Authentication error'),
      }));
    });

    it('rejects connection when user not found in DB', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const token = jwt.sign({ userId: 'ghost' }, process.env.JWT_SECRET || 'test-secret');
      const socket = createMockSocket({
        handshake: { auth: { token }, headers: {} },
      });
      const next = jest.fn();

      await getMiddleware()(socket, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('User not found'),
      }));
    });

    it('accepts valid token and attaches user data to socket', async () => {
      const token = jwt.sign({ userId: 'user-123' }, process.env.JWT_SECRET || 'test-secret');
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-123', username: '@alice', email: 'a@b.com',
        profileImage: 'pic.png', displayName: 'Alice',
      });
      const socket = createMockSocket({
        handshake: { auth: { token }, headers: {} },
      });
      const next = jest.fn();

      await getMiddleware()(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe('user-123');
      expect(socket.username).toBe('@alice');
      expect(socket.displayName).toBe('Alice');
      expect(socket.profileImage).toBe('pic.png');
    });

    it('accepts token from Authorization header', async () => {
      const token = jwt.sign({ userId: 'user-456' }, process.env.JWT_SECRET || 'test-secret');
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-456', username: '@bob', email: 'b@b.com',
        profileImage: null, displayName: 'Bob',
      });
      const socket = createMockSocket({
        handshake: { auth: {}, headers: { authorization: `Bearer ${token}` } },
      });
      const next = jest.fn();

      await getMiddleware()(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe('user-456');
    });
  });

  // ─── Connection Handler ───────────────────────────────────────────────────────

  describe('Connection Handler', () => {
    it('stores socket mapping and presence in Redis', async () => {
      await connectSocket();

      expect(redis.setSocketMapping).toHaveBeenCalledWith('user-1', 'sock-1');
      expect(redis.setPresence).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', status: 'online' }),
      );
    });

    it('joins user to their personal room', async () => {
      const { socket } = await connectSocket();
      expect(socket.join).toHaveBeenCalledWith('user:user-1');
    });

    it('emits socket:ready after setup', async () => {
      const { socket } = await connectSocket();
      expect(socket.emit).toHaveBeenCalledWith('socket:ready', { userId: 'user-1' });
    });

    it('registers RPC handlers', async () => {
      const { io, socket } = await connectSocket();
      expect(rpc.registerRPCHandlers).toHaveBeenCalledWith(socket, io, 'user-1');
    });

    it('registers expected event handlers on socket', async () => {
      const { events } = await connectSocket();
      const expected = [
        'message:send', 'message:edit', 'message:unsend', 'message:react',
        'message:read', 'message:received',
        'typing:start', 'typing:stop',
        'disconnect',
      ];
      for (const ev of expected) {
        expect(events[ev]).toBeDefined();
      }
    });

    it('broadcasts online status to connected users', async () => {
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1', 'friend-2']),
        pendingInitiatedByMe: new Set(),
      });

      const { io } = await connectSocket();

      expect(io.to).toHaveBeenCalledWith('user:friend-1');
      expect(io.to).toHaveBeenCalledWith('user:friend-2');
      expect(io._toEmit).toHaveBeenCalledWith('user:status', expect.objectContaining({
        userId: 'user-1', status: 'online',
      }));
    });

    it('skips broadcasting to pending outgoing friend request recipients', async () => {
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1', 'pending-target']),
        pendingInitiatedByMe: new Set(['pending-target']),
      });

      const { io } = await connectSocket();

      const toRooms = io.to.mock.calls.map((c: any[]) => c[0]);
      expect(toRooms).not.toContain('user:pending-target');
    });
  });

  // ─── message:send ─────────────────────────────────────────────────────────────

  describe('message:send', () => {
    it('rejects empty content', async () => {
      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['message:send']({ recipientId: 'user-2', content: '' });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Message content is required' });
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('rejects missing recipientId', async () => {
      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['message:send']({ content: 'hi' });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Recipient ID is required' });
    });

    it('blocks message when user is blocked', async () => {
      convo.getBlockBetween.mockResolvedValue({ blocked: true, blockerId: 'user-1' });
      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['message:send']({ recipientId: 'user-2', content: 'hi', tempId: 't1' });

      expect(socket.emit).toHaveBeenCalledWith('message:blocked', expect.objectContaining({
        recipientId: 'user-2',
        tempId: 't1',
      }));
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('creates message and emits to recipient', async () => {
      const msg = makeMockMessage();
      prisma.message.create.mockResolvedValue(msg);
      prisma.user.findUnique.mockResolvedValue({ privacyOnlineStatus: 'everyone', isGuest: false });

      const { io, socket, events } = await connectSocket();
      socket.emit.mockClear();
      io._toEmit.mockClear();
      io.to.mockClear();

      await events['message:send']({ recipientId: 'user-2', content: 'Hello!' });

      expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          senderId: 'user-1', recipientId: 'user-2', content: 'Hello!',
        }),
      }));

      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('message:received', expect.objectContaining({
        id: 'msg-1', senderId: 'user-1', recipientId: 'user-2', content: 'Hello!',
      }));

      expect(socket.emit).toHaveBeenCalledWith('message:sent', expect.objectContaining({
        id: 'msg-1', senderId: 'user-1',
      }));
    });

    it('sets delivered status when recipient is online', async () => {
      const msg = makeMockMessage();
      prisma.message.create.mockResolvedValue(msg);
      redis.getSocketId.mockResolvedValue('sock-recipient');

      const { io, events } = await connectSocket();

      await events['message:send']({ recipientId: 'user-2', content: 'Hello!' });

      expect(prisma.message.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'msg-1' },
        data: { status: 'delivered' },
      }));
    });

    it('auto-accepts pending conversation when non-initiator replies', async () => {
      convo.getOrCreateConversation.mockResolvedValue({
        id: 'conv-1', status: 'pending', initiatorId: 'user-2',
      });
      convo.acceptConversation.mockResolvedValue(true);
      prisma.message.create.mockResolvedValue(makeMockMessage());

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['message:send']({ recipientId: 'user-2', content: 'Sure!' });

      expect(convo.acceptConversation).toHaveBeenCalledWith('conv-1', 'user-1');
      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('conversation:accepted', expect.objectContaining({
        conversationId: 'conv-1', acceptedBy: 'user-1',
      }));
    });

    it('invalidates conversation cache for both parties', async () => {
      prisma.message.create.mockResolvedValue(makeMockMessage());
      const { events } = await connectSocket();

      await events['message:send']({ recipientId: 'user-2', content: 'Hello!' });

      expect(redis.invalidateConversationCache).toHaveBeenCalledWith('user-1');
      expect(redis.invalidateConversationCache).toHaveBeenCalledWith('user-2');
    });
  });

  // ─── message:edit ─────────────────────────────────────────────────────────────

  describe('message:edit', () => {
    const existingMsg = {
      senderId: 'user-1', recipientId: 'user-2',
      content: 'old text', deletedAt: null, type: 'text',
    };

    it('edits message and stores edit history', async () => {
      prisma.message.findUnique.mockResolvedValue(existingMsg);
      const { events } = await connectSocket();

      await events['message:edit']({ messageId: 'msg-1', content: 'new text' });

      expect(prisma.messageEditHistory.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          messageId: 'msg-1', editedById: 'user-1', previousContent: 'old text',
        }),
      }));
      expect(prisma.message.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'msg-1' },
        data: expect.objectContaining({ content: 'new text', edited: true }),
      }));
    });

    it('broadcasts message:edited to both sender and recipient', async () => {
      prisma.message.findUnique.mockResolvedValue(existingMsg);
      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['message:edit']({ messageId: 'msg-1', content: 'edited' });

      expect(io.to).toHaveBeenCalledWith('user:user-1');
      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('message:edited', expect.objectContaining({
        messageId: 'msg-1', content: 'edited',
      }));
    });

    it('rejects edit by non-owner', async () => {
      prisma.message.findUnique.mockResolvedValue({ ...existingMsg, senderId: 'someone-else' });
      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['message:edit']({ messageId: 'msg-1', content: 'hacked' });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Not authorised to edit this message' });
      expect(prisma.message.update).not.toHaveBeenCalled();
    });

    it('rejects edit of deleted message', async () => {
      prisma.message.findUnique.mockResolvedValue({ ...existingMsg, deletedAt: new Date() });
      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['message:edit']({ messageId: 'msg-1', content: 'nope' });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Cannot edit an unsent message' });
    });

    it('rejects edit of non-text message', async () => {
      prisma.message.findUnique.mockResolvedValue({ ...existingMsg, type: 'image' });
      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['message:edit']({ messageId: 'msg-1', content: 'change' });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Only text messages can be edited' });
    });

    it('invalidates conversation cache after edit', async () => {
      prisma.message.findUnique.mockResolvedValue(existingMsg);
      const { events } = await connectSocket();
      redis.invalidateConversationCache.mockClear();

      await events['message:edit']({ messageId: 'msg-1', content: 'updated' });

      expect(redis.invalidateConversationCache).toHaveBeenCalledWith('user-1');
      expect(redis.invalidateConversationCache).toHaveBeenCalledWith('user-2');
    });
  });

  // ─── message:unsend ───────────────────────────────────────────────────────────

  describe('message:unsend', () => {
    const ownedMsg = { senderId: 'user-1', recipientId: 'user-2', deletedAt: null };

    it('soft-deletes the message', async () => {
      prisma.message.findUnique.mockResolvedValue(ownedMsg);
      const { events } = await connectSocket();

      await events['message:unsend']('msg-1');

      expect(prisma.message.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'msg-1' },
        data: { deletedAt: expect.any(Date) },
      }));
    });

    it('broadcasts message:unsent to both parties', async () => {
      prisma.message.findUnique.mockResolvedValue(ownedMsg);
      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['message:unsend']('msg-1');

      expect(io.to).toHaveBeenCalledWith('user:user-1');
      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('message:unsent', expect.objectContaining({
        messageId: 'msg-1',
      }));
    });

    it('ignores unsend by non-owner', async () => {
      prisma.message.findUnique.mockResolvedValue({ ...ownedMsg, senderId: 'someone-else' });
      const { events } = await connectSocket();

      await events['message:unsend']('msg-1');

      expect(prisma.message.update).not.toHaveBeenCalled();
    });

    it('ignores already-deleted message', async () => {
      prisma.message.findUnique.mockResolvedValue({ ...ownedMsg, deletedAt: new Date() });
      const { events } = await connectSocket();

      await events['message:unsend']('msg-1');

      expect(prisma.message.update).not.toHaveBeenCalled();
    });

    it('invalidates conversation cache for both parties', async () => {
      prisma.message.findUnique.mockResolvedValue(ownedMsg);
      const { events } = await connectSocket();
      redis.invalidateConversationCache.mockClear();

      await events['message:unsend']('msg-1');

      expect(redis.invalidateConversationCache).toHaveBeenCalledWith('user-1');
      expect(redis.invalidateConversationCache).toHaveBeenCalledWith('user-2');
    });
  });

  // ─── message:react ────────────────────────────────────────────────────────────

  describe('message:react', () => {
    const targetMsg = { senderId: 'user-2', recipientId: 'user-1' };

    it('adds a new reaction via upsert', async () => {
      prisma.message.findUnique.mockResolvedValue(targetMsg);
      prisma.messageReaction.findUnique.mockResolvedValue(null);
      prisma.messageReaction.findMany.mockResolvedValue([
        { userId: 'user-1', emoji: '❤️', user: { id: 'user-1', username: '@testuser' } },
      ]);

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['message:react']({ messageId: 'msg-1', emoji: '❤️' });

      expect(prisma.messageReaction.upsert).toHaveBeenCalled();
      expect(io._toEmit).toHaveBeenCalledWith('message:reaction', expect.objectContaining({
        messageId: 'msg-1',
        reactions: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1', emoji: '❤️' }),
        ]),
      }));
    });

    it('removes reaction when same emoji toggled', async () => {
      prisma.message.findUnique.mockResolvedValue(targetMsg);
      prisma.messageReaction.findUnique.mockResolvedValue({ emoji: '❤️' });
      prisma.messageReaction.findMany.mockResolvedValue([]);

      const { events } = await connectSocket();

      await events['message:react']({ messageId: 'msg-1', emoji: '❤️' });

      expect(prisma.messageReaction.delete).toHaveBeenCalled();
      expect(prisma.messageReaction.upsert).not.toHaveBeenCalled();
    });

    it('broadcasts updated reactions to both sender and recipient', async () => {
      prisma.message.findUnique.mockResolvedValue(targetMsg);
      prisma.messageReaction.findUnique.mockResolvedValue(null);
      prisma.messageReaction.findMany.mockResolvedValue([]);

      const { io, events } = await connectSocket();
      io.to.mockClear();

      await events['message:react']({ messageId: 'msg-1', emoji: '👍' });

      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io.to).toHaveBeenCalledWith('user:user-1');
    });
  });

  // ─── Typing Events ───────────────────────────────────────────────────────────

  describe('Typing Events', () => {
    it('typing:start emits typing:status to recipient', async () => {
      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      events['typing:start']({ recipientId: 'user-2' });
      await new Promise(r => setTimeout(r, 10));

      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('typing:status', expect.objectContaining({
        userId: 'user-1', isTyping: true, type: 'direct',
      }));
    });

    it('typing:stop emits typing:status to recipient', async () => {
      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      events['typing:stop']({ recipientId: 'user-2' });
      await new Promise(r => setTimeout(r, 10));

      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('typing:status', expect.objectContaining({
        userId: 'user-1', isTyping: false, type: 'direct',
      }));
    });

    it('suppresses typing:start for pending conversation initiated by current user', async () => {
      convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'pending', initiatorId: 'user-1' });
      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      events['typing:start']({ recipientId: 'user-2' });
      await new Promise(r => setTimeout(r, 10));

      expect(io._toEmit).not.toHaveBeenCalledWith('typing:status', expect.anything());
    });

    it('typing:start broadcasts to group room', async () => {
      const { socket, events } = await connectSocket();

      events['typing:start']({ groupId: 'grp-1' });

      expect(socket.to).toHaveBeenCalledWith('group:grp-1');
      expect(socket._toEmit).toHaveBeenCalledWith('typing:status', expect.objectContaining({
        userId: 'user-1', isTyping: true, type: 'group', groupId: 'grp-1',
      }));
    });
  });

  // ─── Read Receipts ────────────────────────────────────────────────────────────

  describe('Read Receipts', () => {
    it('message:read marks message as read and emits status to sender', async () => {
      prisma.message.findUnique.mockResolvedValue({ senderId: 'user-2', recipientId: 'user-1' });
      convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'accepted' });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['message:read']('msg-1');

      expect(prisma.message.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'msg-1' },
        data: expect.objectContaining({ status: 'read', readAt: expect.any(Date) }),
      }));
      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('message:status', expect.objectContaining({
        messageId: 'msg-1', status: 'read',
      }));
    });

    it('message:read suppresses status event for pending conversation', async () => {
      prisma.message.findUnique.mockResolvedValue({ senderId: 'user-2', recipientId: 'user-1' });
      convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'pending' });

      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      await events['message:read']('msg-1');

      expect(prisma.message.update).toHaveBeenCalled();
      expect(io._toEmit).not.toHaveBeenCalledWith('message:status', expect.anything());
    });

    it('message:received marks message as delivered', async () => {
      prisma.message.findUnique.mockResolvedValue({ senderId: 'user-2', recipientId: 'user-1' });
      convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'accepted' });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['message:received']('msg-1');

      expect(prisma.message.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'msg-1' },
        data: { status: 'delivered' },
      }));
      expect(io._toEmit).toHaveBeenCalledWith('message:status', expect.objectContaining({
        messageId: 'msg-1', status: 'delivered',
      }));
    });

    it('message:read does nothing for missing message', async () => {
      prisma.message.findUnique.mockResolvedValue(null);
      const { events } = await connectSocket();

      await events['message:read']('nonexistent');

      expect(prisma.message.update).not.toHaveBeenCalled();
    });
  });

  // ─── Disconnect ───────────────────────────────────────────────────────────────

  describe('Disconnect', () => {
    it('removes presence and socket mapping from Redis', async () => {
      redis.getPresence.mockResolvedValue({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: new Date().toISOString(), hideOnlineStatus: false,
      });
      const { events } = await connectSocket();
      redis.setPresence.mockClear();
      redis.removeSocketMapping.mockClear();
      redis.removePresence.mockClear();

      await events['disconnect']();

      expect(redis.setPresence).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', status: 'offline' }),
      );
      expect(redis.removeSocketMapping).toHaveBeenCalledWith('user-1');
      expect(redis.removePresence).toHaveBeenCalledWith('user-1');
    });

    it('broadcasts offline status to connected users', async () => {
      redis.getPresence.mockResolvedValue({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: new Date().toISOString(), hideOnlineStatus: false,
      });
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1']),
        pendingInitiatedByMe: new Set(),
      });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['disconnect']();

      expect(io.to).toHaveBeenCalledWith('user:friend-1');
      expect(io._toEmit).toHaveBeenCalledWith('user:status', expect.objectContaining({
        userId: 'user-1', status: 'offline',
      }));
    });

    it('updates lastSeen in the database', async () => {
      redis.getPresence.mockResolvedValue(null);
      const { events } = await connectSocket();
      prisma.user.update.mockClear();

      await events['disconnect']();

      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'user-1' },
        data: { lastSeen: expect.any(Date) },
      }));
    });

    it('skips offline broadcast when online status is hidden', async () => {
      redis.getPresence.mockResolvedValue({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: new Date().toISOString(), hideOnlineStatus: true,
      });
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1']),
        pendingInitiatedByMe: new Set(),
      });

      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      await events['disconnect']();

      expect(io._toEmit).not.toHaveBeenCalledWith('user:status', expect.anything());
    });

    it('handles DB error when updating lastSeen', async () => {
      redis.getPresence.mockResolvedValue(null);
      prisma.user.update.mockRejectedValue(new Error('DB down'));
      const { events } = await connectSocket();

      await events['disconnect']();

      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  // ─── Auth Middleware Catch-All ─────────────────────────────────────────────
  describe('Auth Middleware - catch-all error', () => {
    it('calls next with error when an unexpected error is thrown', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('Unexpected DB crash'));
      const io = createMockIO();
      setupSocketHandlers(io as any);
      const middleware = io._middlewareHandlers[0];

      const token = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET || 'test-secret');
      const socket = createMockSocket({
        handshake: { auth: { token }, headers: {} },
      });
      const next = jest.fn();

      await middleware(socket, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Authentication error'),
      }));
    });
  });

  // ─── Connection - privacyOnlineStatus error ──────────────────────────────
  describe('Connection - privacy status error', () => {
    it('handles error loading privacyOnlineStatus gracefully', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ privacyOnlineStatus: 'everyone', isGuest: false })
        .mockRejectedValueOnce(new Error('DB error'));

      // The first call is from middleware, the connection handler calls it again
      // Actually looking at code, middleware uses prisma directly, connection also.
      // Let's reset and set up properly:
      prisma.user.findUnique.mockReset();
      prisma.user.findUnique
        .mockRejectedValueOnce(new Error('DB error loading privacy'));

      const io = createMockIO();
      setupSocketHandlers(io as any);
      const socket = createMockSocket({
        userId: 'user-1',
        username: '@testuser',
        displayName: 'Test User',
        profileImage: null,
      });

      await io._connectionHandlers[0](socket);

      expect(redis.setPresence).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', hideOnlineStatus: false }),
      );
    });
  });

  // ─── Connection - presence:update with hideOnlineStatus filter ────────────
  describe('Connection - presence filtering', () => {
    it('filters out users with hideOnlineStatus from presence:update', async () => {
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1', 'friend-2']),
        pendingInitiatedByMe: new Set(),
      });
      redis.getMultiplePresences.mockResolvedValue([
        { userId: 'friend-1', status: 'online', hideOnlineStatus: false },
        { userId: 'friend-2', status: 'online', hideOnlineStatus: true },
      ]);

      const { socket } = await connectSocket();

      const presenceCall = socket.emit.mock.calls.find(
        ([ev]: any) => ev === 'presence:update',
      );
      expect(presenceCall).toBeDefined();
      const onlineUsers = presenceCall![1].onlineUsers;
      expect(onlineUsers).toEqual(
        expect.arrayContaining([expect.objectContaining({ userId: 'friend-1' })]),
      );
      expect(onlineUsers).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ userId: 'friend-2' })]),
      );
    });
  });

  // ─── messages:history ──────────────────────────────────────────────────────
  describe('messages:history', () => {
    it('returns formatted messages with ack', async () => {
      const msgs = [
        {
          id: 'msg-1', senderId: 'user-2', recipientId: 'user-1',
          content: 'Hi', type: 'text', status: 'sent', isRead: false,
          createdAt: new Date('2024-01-01'), deletedAt: null,
          edited: false, editedAt: null,
          fileUrl: null, fileName: null, fileSize: null, fileType: null,
          audioWaveform: null, audioDuration: null,
          replyToId: null, replyToContent: null, replyToSenderName: null,
          replyToType: null, replyToDuration: null, linkPreview: null,
          sender: { id: 'user-2', username: '@other', displayName: 'Other', profileImage: null },
          reactions: [],
        },
      ];
      prisma.message.findMany.mockResolvedValue(msgs);
      prisma.message.updateMany.mockResolvedValue({ count: 1 });

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['messages:history']({ recipientId: 'user-2', limit: 20 }, ack);

      expect(prisma.message.findMany).toHaveBeenCalled();
      expect(prisma.message.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: { in: ['msg-1'] } },
      }));
      expect(ack).toHaveBeenCalledWith(expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ id: 'msg-1', content: 'Hi' }),
        ]),
        hasMore: false,
      }));
    });

    it('returns error when recipientId is missing', async () => {
      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['messages:history']({}, ack);

      expect(ack).toHaveBeenCalledWith({ error: 'recipientId is required' });
    });

    it('supports cursor-based pagination with before param', async () => {
      prisma.message.findUnique.mockResolvedValue({ createdAt: new Date('2024-06-01') });
      prisma.message.findMany.mockResolvedValue([]);

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['messages:history']({ recipientId: 'user-2', before: 'msg-cursor' }, ack);

      expect(prisma.message.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'msg-cursor' } }),
      );
      expect(ack).toHaveBeenCalledWith({ messages: [], hasMore: false });
    });

    it('handles deleted messages (strips content/files)', async () => {
      const msgs = [{
        id: 'msg-del', senderId: 'user-2', recipientId: 'user-1',
        content: 'secret', type: 'image', status: 'sent', isRead: true,
        createdAt: new Date('2024-01-01'), deletedAt: new Date(),
        edited: true, editedAt: new Date(),
        fileUrl: 'file.jpg', fileName: 'file.jpg', fileSize: 1000, fileType: 'image/jpeg',
        audioWaveform: [1, 2], audioDuration: 5,
        replyToId: null, replyToContent: null, replyToSenderName: null,
        replyToType: null, replyToDuration: null, linkPreview: { url: 'x' },
        sender: { id: 'user-2', username: '@other', displayName: null, profileImage: null },
        reactions: [],
      }];
      prisma.message.findMany.mockResolvedValue(msgs);

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['messages:history']({ recipientId: 'user-2' }, ack);

      const formatted = ack.mock.calls[0][0].messages[0];
      expect(formatted.content).toBe('');
      expect(formatted.unsent).toBe(true);
      expect(formatted.edited).toBe(false);
      expect(formatted.type).toBe('text');
      expect(formatted.fileUrl).toBeNull();
      expect(formatted.linkPreview).toBeNull();
      expect(formatted.waveform).toBeNull();
      expect(formatted.duration).toBeNull();
    });

    it('includes replyTo data when present', async () => {
      const msgs = [{
        id: 'msg-r', senderId: 'user-1', recipientId: 'user-2',
        content: 'Reply', type: 'text', status: 'sent', isRead: true,
        createdAt: new Date(), deletedAt: null,
        edited: false, editedAt: null,
        fileUrl: null, fileName: null, fileSize: null, fileType: null,
        audioWaveform: null, audioDuration: null,
        replyToId: 'msg-orig', replyToContent: 'Original', replyToSenderName: 'Alice',
        replyToType: 'text', replyToDuration: null, linkPreview: null,
        sender: { id: 'user-1', username: '@testuser', displayName: 'Test', profileImage: null },
        reactions: [],
      }];
      prisma.message.findMany.mockResolvedValue(msgs);

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['messages:history']({ recipientId: 'user-2' }, ack);

      const formatted = ack.mock.calls[0][0].messages[0];
      expect(formatted.replyTo).toEqual(expect.objectContaining({
        id: 'msg-orig', content: 'Original',
      }));
    });

    it('handles DB errors gracefully', async () => {
      prisma.message.findMany.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['messages:history']({ recipientId: 'user-2' }, ack);

      expect(ack).toHaveBeenCalledWith({ error: 'Failed to load messages' });
    });
  });

  // ─── group:messages:history ────────────────────────────────────────────────
  describe('group:messages:history', () => {
    it('returns group messages for an accepted member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ userId: 'user-1', groupId: 'grp-1', status: 'accepted' });
      const msgs = [{
        id: 'gmsg-1', groupId: 'grp-1', senderId: 'user-1', content: 'Hi group',
        type: 'text', createdAt: new Date(), deletedAt: null,
        sender: { id: 'user-1', username: '@testuser', displayName: 'Test', profileImage: null },
      }];
      prisma.groupMessage.findMany.mockResolvedValue(msgs);

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['group:messages:history']({ groupId: 'grp-1' }, ack);

      expect(ack).toHaveBeenCalledWith({ messages: msgs });
    });

    it('returns error for missing groupId', async () => {
      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['group:messages:history']({}, ack);

      expect(ack).toHaveBeenCalledWith({ error: 'groupId is required' });
    });

    it('returns error for non-member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue(null);

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['group:messages:history']({ groupId: 'grp-1' }, ack);

      expect(ack).toHaveBeenCalledWith({ error: 'Not a member' });
    });

    it('returns error for non-accepted member', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ userId: 'user-1', groupId: 'grp-1', status: 'pending' });

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['group:messages:history']({ groupId: 'grp-1' }, ack);

      expect(ack).toHaveBeenCalledWith({ error: 'Accept the group invite first' });
    });

    it('strips content from deleted group messages', async () => {
      prisma.groupMember.findUnique.mockResolvedValue({ userId: 'user-1', groupId: 'grp-1', status: 'accepted' });
      prisma.groupMessage.findMany.mockResolvedValue([{
        id: 'gmsg-del', groupId: 'grp-1', senderId: 'user-2', content: 'secret',
        type: 'text', createdAt: new Date(), deletedAt: new Date(),
        fileUrl: 'f.jpg', fileName: 'f.jpg', fileSize: 100, fileType: 'image/jpeg',
        audioWaveform: [1], audioDuration: 3, linkPreview: { url: 'x' },
        sender: { id: 'user-2', username: '@other', displayName: null, profileImage: null },
      }]);

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['group:messages:history']({ groupId: 'grp-1' }, ack);

      const msg = ack.mock.calls[0][0].messages[0];
      expect(msg.content).toBe('');
      expect(msg.unsent).toBe(true);
      expect(msg.fileUrl).toBeNull();
    });

    it('handles DB errors gracefully', async () => {
      prisma.groupMember.findUnique.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['group:messages:history']({ groupId: 'grp-1' }, ack);

      expect(ack).toHaveBeenCalledWith({ error: 'Failed to load group messages' });
    });
  });

  // ─── message:send with pre-existing messageId ─────────────────────────────
  describe('message:send - pre-existing message', () => {
    it('uses pre-existing message when messageId is provided', async () => {
      const existing = makeMockMessage({ id: 'pre-msg', audioDuration: null, audioWaveform: null });
      prisma.message.findUnique.mockResolvedValue(existing);
      prisma.user.findUnique.mockResolvedValue({ isGuest: false });

      const { io, socket, events } = await connectSocket();
      socket.emit.mockClear();
      io._toEmit.mockClear();

      await events['message:send']({
        recipientId: 'user-2', content: 'Hello!', messageId: 'pre-msg',
        duration: 5, waveform: [0.1, 0.5],
      });

      expect(prisma.message.create).not.toHaveBeenCalled();
      expect(prisma.message.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'pre-msg' },
        data: expect.objectContaining({ audioDuration: 5 }),
      }));
      expect(io._toEmit).toHaveBeenCalledWith('message:received', expect.objectContaining({
        id: 'pre-msg',
      }));
    });

    it('emits error when pre-existing messageId not found', async () => {
      prisma.message.findUnique.mockResolvedValue(null);

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['message:send']({
        recipientId: 'user-2', content: 'Hello!', messageId: 'nonexistent',
      });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Message not found' });
    });
  });

  // ─── message:send - AI bot auto-accept ────────────────────────────────────
  describe('message:send - AI bot auto-accept', () => {
    const origEnv = process.env.AI_BOT_USER_ID;

    beforeEach(() => {
      process.env.AI_BOT_USER_ID = 'ai-bot';
    });
    afterEach(() => {
      if (origEnv !== undefined) process.env.AI_BOT_USER_ID = origEnv;
      else delete process.env.AI_BOT_USER_ID;
    });

    it('auto-accepts conversation with AI bot', async () => {
      convo.getOrCreateConversation.mockResolvedValue({ id: 'conv-ai', status: 'pending', initiatorId: 'user-1' });
      prisma.message.create.mockResolvedValue(makeMockMessage({ recipientId: 'ai-bot', type: 'text' }));
      prisma.user.findUnique.mockResolvedValue({ isGuest: false });
      prisma.conversation.update.mockResolvedValue({});

      const { events } = await connectSocket();

      await events['message:send']({ recipientId: 'ai-bot', content: 'Hi bot' });

      expect(prisma.conversation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'conv-ai' },
        data: { status: 'accepted' },
      }));
    });
  });

  // ─── message:send - AI bot reply (lines 477-595) ──────────────────────────
  describe('message:send - AI bot reply', () => {
    const origEnv = process.env.AI_BOT_USER_ID;
    const openai = require('../services/openai');

    beforeEach(() => {
      process.env.AI_BOT_USER_ID = 'ai-bot';
      openai.generateAIReply.mockResolvedValue('AI response');
    });
    afterEach(() => {
      if (origEnv !== undefined) process.env.AI_BOT_USER_ID = origEnv;
      else delete process.env.AI_BOT_USER_ID;
    });

    it('generates and delivers AI bot reply', async () => {
      convo.getOrCreateConversation.mockResolvedValue({ id: 'conv-ai', status: 'accepted', initiatorId: 'user-1' });
      prisma.message.create.mockResolvedValueOnce(makeMockMessage({ recipientId: 'ai-bot', type: 'text' }));
      prisma.message.findMany.mockResolvedValue([]);
      prisma.message.create.mockResolvedValueOnce({ id: 'bot-msg', createdAt: new Date(), content: 'AI response' });
      prisma.user.findUnique
        .mockResolvedValueOnce({ privacyOnlineStatus: 'everyone', isGuest: false })
        .mockResolvedValueOnce({ isGuest: false })
        .mockResolvedValueOnce({ username: '@chatr-ai', displayName: 'Chatr AI', profileImage: null });

      const { io, events } = await connectSocket();

      await events['message:send']({ recipientId: 'ai-bot', content: 'Hello bot' });

      // Wait for the async fire-and-forget
      await new Promise(r => setTimeout(r, 800));

      expect(openai.generateAIReply).toHaveBeenCalled();
      expect(io._toEmit).toHaveBeenCalledWith('typing:status', expect.objectContaining({
        userId: 'ai-bot', isTyping: true,
      }));
      expect(io._toEmit).toHaveBeenCalledWith('message:received', expect.objectContaining({
        senderId: 'ai-bot',
      }));
    });

    it('sends fallback message on AI error', async () => {
      convo.getOrCreateConversation.mockResolvedValue({ id: 'conv-ai', status: 'accepted', initiatorId: 'user-1' });
      prisma.message.create.mockResolvedValueOnce(makeMockMessage({ recipientId: 'ai-bot', type: 'text' }));
      prisma.message.findMany.mockResolvedValue([]);
      openai.generateAIReply.mockRejectedValue(new Error('OpenAI down'));
      prisma.message.create.mockResolvedValueOnce({ id: 'fallback-msg', createdAt: new Date(), content: 'Sorry...' });
      prisma.user.findUnique.mockResolvedValue({ isGuest: false });

      const { io, events } = await connectSocket();

      await events['message:send']({ recipientId: 'ai-bot', content: 'Hello bot' });

      await new Promise(r => setTimeout(r, 800));

      expect(io._toEmit).toHaveBeenCalledWith('typing:status', expect.objectContaining({
        userId: 'ai-bot', isTyping: false,
      }));
      expect(io._toEmit).toHaveBeenCalledWith('message:received', expect.objectContaining({
        senderId: 'ai-bot',
      }));
    });
  });

  // ─── message:send error catch ─────────────────────────────────────────────
  describe('message:send - error handling', () => {
    it('emits error when message creation fails', async () => {
      prisma.message.create.mockRejectedValue(new Error('DB crash'));

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['message:send']({ recipientId: 'user-2', content: 'Hi' });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Failed to send message' });
    });
  });

  // ─── group:join ────────────────────────────────────────────────────────────
  describe('group:join', () => {
    it('joins socket to group room when member', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({ userId: 'user-1', groupId: 'grp-1' });

      const { socket, events } = await connectSocket();

      await events['group:join']('grp-1');

      expect(socket.join).toHaveBeenCalledWith('group:grp-1');
      expect(socket.to).toHaveBeenCalledWith('group:grp-1');
      expect(socket._toEmit).toHaveBeenCalledWith('group:user:joined', expect.objectContaining({
        groupId: 'grp-1', userId: 'user-1',
      }));
    });

    it('emits error when not a member', async () => {
      prisma.groupMember.findFirst.mockResolvedValue(null);

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['group:join']('grp-1');

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Not a member of this group' });
      expect(socket.join).not.toHaveBeenCalledWith('group:grp-1');
    });

    it('handles DB errors gracefully', async () => {
      prisma.groupMember.findFirst.mockRejectedValue(new Error('DB error'));

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['group:join']('grp-1');

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Failed to join group' });
    });
  });

  // ─── group:leave ───────────────────────────────────────────────────────────
  describe('group:leave', () => {
    it('leaves group room and broadcasts departure', async () => {
      const { socket, events } = await connectSocket();

      events['group:leave']('grp-1');

      expect(socket.leave).toHaveBeenCalledWith('group:grp-1');
      expect(socket.to).toHaveBeenCalledWith('group:grp-1');
      expect(socket._toEmit).toHaveBeenCalledWith('group:user:left', expect.objectContaining({
        groupId: 'grp-1', userId: 'user-1',
      }));
    });
  });

  // ─── group:message:send ────────────────────────────────────────────────────
  describe('group:message:send', () => {
    it('creates group message and emits to group room', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({ userId: 'user-1', groupId: 'grp-1', status: 'accepted' });
      prisma.groupMessage.create.mockResolvedValue({
        id: 'gmsg-1', groupId: 'grp-1', senderId: 'user-1', content: 'Hi group',
        type: 'text', createdAt: new Date(), linkPreview: null,
        sender: { id: 'user-1', username: '@testuser', email: 'test@test.com' },
      });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['group:message:send']({ groupId: 'grp-1', content: 'Hi group' });

      expect(prisma.groupMessage.create).toHaveBeenCalled();
      expect(io.to).toHaveBeenCalledWith('group:grp-1');
      expect(io._toEmit).toHaveBeenCalledWith('group:message:received', expect.objectContaining({
        id: 'gmsg-1', groupId: 'grp-1', content: 'Hi group',
      }));
    });

    it('rejects empty content', async () => {
      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['group:message:send']({ groupId: 'grp-1', content: '' });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Message content is required' });
    });

    it('rejects non-member', async () => {
      prisma.groupMember.findFirst.mockResolvedValue(null);

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['group:message:send']({ groupId: 'grp-1', content: 'Hi' });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Not a member of this group' });
    });

    it('rejects member with non-accepted status', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({ userId: 'user-1', groupId: 'grp-1', status: 'pending' });

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['group:message:send']({ groupId: 'grp-1', content: 'Hi' });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Accept the group invite before sending messages' });
    });

    it('handles DB errors gracefully', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({ userId: 'user-1', groupId: 'grp-1', status: 'accepted' });
      prisma.groupMessage.create.mockRejectedValue(new Error('DB error'));

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['group:message:send']({ groupId: 'grp-1', content: 'Hi' });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Failed to send group message' });
    });
  });

  // ─── Error catch paths for message:received and message:read ──────────────
  describe('message:received - error handling', () => {
    it('handles DB error silently', async () => {
      prisma.message.findUnique.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();

      await events['message:received']('msg-1');
      // Should not throw
    });
  });

  describe('message:read - error handling', () => {
    it('handles DB error silently', async () => {
      prisma.message.findUnique.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();

      await events['message:read']('msg-1');
      // Should not throw
    });
  });

  describe('message:react - error handling', () => {
    it('handles DB error silently', async () => {
      prisma.message.findUnique.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();

      await events['message:react']({ messageId: 'msg-1', emoji: '❤️' });
      // Should not throw
    });
  });

  describe('message:unsend - error handling', () => {
    it('handles DB error silently', async () => {
      prisma.message.findUnique.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();

      await events['message:unsend']('msg-1');
      // Should not throw
    });
  });

  describe('message:edit - error handling', () => {
    it('emits error on unexpected DB failure', async () => {
      prisma.message.findUnique.mockResolvedValue({
        senderId: 'user-1', recipientId: 'user-2', content: 'old', deletedAt: null, type: 'text',
      });
      (prisma as any).messageEditHistory.create.mockRejectedValue(new Error('DB error'));

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['message:edit']({ messageId: 'msg-1', content: 'new' });

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Failed to edit message' });
    });
  });

  // ─── typing:start / typing:stop catch paths ──────────────────────────────
  describe('typing:start - error fallback', () => {
    it('emits typing:status even when findConversation throws', async () => {
      convo.findConversation.mockRejectedValue(new Error('Redis error'));

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      events['typing:start']({ recipientId: 'user-2' });
      await new Promise(r => setTimeout(r, 20));

      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('typing:status', expect.objectContaining({
        isTyping: true, type: 'direct',
      }));
    });
  });

  describe('typing:stop - error fallback and group', () => {
    it('emits typing:status even when findConversation throws', async () => {
      convo.findConversation.mockRejectedValue(new Error('Redis error'));

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      events['typing:stop']({ recipientId: 'user-2' });
      await new Promise(r => setTimeout(r, 20));

      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('typing:status', expect.objectContaining({
        isTyping: false, type: 'direct',
      }));
    });

    it('broadcasts typing:stop to group room', async () => {
      const { socket, events } = await connectSocket();

      events['typing:stop']({ groupId: 'grp-1' });

      expect(socket.to).toHaveBeenCalledWith('group:grp-1');
      expect(socket._toEmit).toHaveBeenCalledWith('typing:status', expect.objectContaining({
        userId: 'user-1', isTyping: false, type: 'group', groupId: 'grp-1',
      }));
    });

    it('suppresses typing:stop for pending conversation initiated by current user', async () => {
      convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'pending', initiatorId: 'user-1' });
      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      events['typing:stop']({ recipientId: 'user-2' });
      await new Promise(r => setTimeout(r, 20));

      expect(io._toEmit).not.toHaveBeenCalledWith('typing:status', expect.anything());
    });
  });

  // ─── audio:recording ──────────────────────────────────────────────────────
  describe('audio:recording', () => {
    it('emits recording status to recipient', async () => {
      convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'accepted' });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['audio:recording']({ recipientId: 'user-2', isRecording: true });

      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('audio:recording', expect.objectContaining({
        userId: 'user-1', isRecording: true,
      }));
    });

    it('suppresses recording for pending conversation', async () => {
      convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'pending' });

      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      await events['audio:recording']({ recipientId: 'user-2', isRecording: true });

      expect(io._toEmit).not.toHaveBeenCalledWith('audio:recording', expect.anything());
    });

    it('does nothing when recipientId is missing', async () => {
      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      await events['audio:recording']({ isRecording: true });

      expect(io._toEmit).not.toHaveBeenCalledWith('audio:recording', expect.anything());
    });
  });

  // ─── audio:listening ──────────────────────────────────────────────────────
  describe('audio:listening', () => {
    it('emits listening status to sender', async () => {
      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['audio:listening']({ senderId: 'user-2', messageId: 'msg-1', isListening: true });

      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('audio:listening', expect.objectContaining({
        userId: 'user-1', messageId: 'msg-1', isListening: true,
      }));
    });

    it('marks audio as read when isEnded is true', async () => {
      convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'accepted' });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['audio:listening']({ senderId: 'user-2', messageId: 'msg-1', isListening: false, isEnded: true });

      expect(prisma.message.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'msg-1' },
        data: expect.objectContaining({ status: 'read' }),
      }));
      expect(io._toEmit).toHaveBeenCalledWith('message:status', expect.objectContaining({
        messageId: 'msg-1', status: 'read',
      }));
    });

    it('suppresses read status for pending conversation when isEnded', async () => {
      convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'pending' });

      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      await events['audio:listening']({ senderId: 'user-2', messageId: 'msg-1', isListening: false, isEnded: true });

      expect(prisma.message.update).toHaveBeenCalled();
      expect(io._toEmit).not.toHaveBeenCalledWith('message:status', expect.anything());
    });

    it('handles DB error when marking audio as read', async () => {
      prisma.message.update.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();

      await events['audio:listening']({ senderId: 'user-2', messageId: 'msg-1', isListening: false, isEnded: true });
      // Should not throw
    });

    it('does nothing when senderId is missing', async () => {
      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      await events['audio:listening']({ messageId: 'msg-1', isListening: true });

      expect(io._toEmit).not.toHaveBeenCalledWith('audio:listening', expect.anything());
    });
  });

  // ─── ghost:typing ─────────────────────────────────────────────────────────
  describe('ghost:typing', () => {
    it('emits ghost typing to recipient', async () => {
      convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'accepted' });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['ghost:typing']({ recipientId: 'user-2', text: 'Hello wor' });

      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('ghost:typing', expect.objectContaining({
        userId: 'user-1', text: 'Hello wor', type: 'direct',
      }));
    });

    it('suppresses ghost typing for pending conversation', async () => {
      convo.findConversation.mockResolvedValue({ id: 'conv-1', status: 'pending' });

      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      await events['ghost:typing']({ recipientId: 'user-2', text: 'Hello' });

      expect(io._toEmit).not.toHaveBeenCalledWith('ghost:typing', expect.anything());
    });

    it('does nothing without recipientId', async () => {
      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      await events['ghost:typing']({ text: 'Hello' });

      expect(io._toEmit).not.toHaveBeenCalledWith('ghost:typing', expect.anything());
    });
  });

  // ─── presence:update ──────────────────────────────────────────────────────
  describe('presence:update', () => {
    it('updates presence and broadcasts to connected users', async () => {
      redis.getPresence.mockResolvedValue({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: new Date().toISOString(), hideOnlineStatus: false,
      });
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1']),
        pendingInitiatedByMe: new Set(),
      });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();
      redis.setPresence.mockClear();

      await events['presence:update']('away');

      expect(redis.setPresence).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'away' }),
      );
      expect(io.to).toHaveBeenCalledWith('user:friend-1');
      expect(io._toEmit).toHaveBeenCalledWith('user:status', expect.objectContaining({
        userId: 'user-1', status: 'away',
      }));
    });

    it('skips broadcast when presence has hideOnlineStatus', async () => {
      redis.getPresence.mockResolvedValue({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: new Date().toISOString(), hideOnlineStatus: true,
      });

      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      await events['presence:update']('away');

      expect(io._toEmit).not.toHaveBeenCalledWith('user:status', expect.anything());
    });

    it('does nothing when no presence in Redis', async () => {
      redis.getPresence.mockResolvedValue(null);

      const { events } = await connectSocket();
      redis.setPresence.mockClear();

      await events['presence:update']('online');

      expect(redis.setPresence).not.toHaveBeenCalled();
    });

    it('skips pending outgoing recipients in broadcast', async () => {
      redis.getPresence.mockResolvedValue({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: new Date().toISOString(), hideOnlineStatus: false,
      });
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1', 'pending-user']),
        pendingInitiatedByMe: new Set(['pending-user']),
      });

      const { io, events } = await connectSocket();
      io.to.mockClear();

      await events['presence:update']('away');

      const rooms = io.to.mock.calls.map((c: any[]) => c[0]);
      expect(rooms).not.toContain('user:pending-user');
    });
  });

  // ─── presence:request ─────────────────────────────────────────────────────
  describe('presence:request', () => {
    it('returns presence data for requested users', async () => {
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1', 'friend-2']),
        pendingInitiatedByMe: new Set(),
      });
      redis.getMultiplePresences.mockResolvedValue([
        { userId: 'friend-1', status: 'online', hideOnlineStatus: false, lastSeen: '2024-01-01' },
        { userId: 'friend-2', status: 'away', hideOnlineStatus: false, lastSeen: '2024-01-01' },
      ]);

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['presence:request'](['friend-1', 'friend-2']);

      expect(socket.emit).toHaveBeenCalledWith('presence:response', expect.arrayContaining([
        expect.objectContaining({ userId: 'friend-1', status: 'online' }),
        expect.objectContaining({ userId: 'friend-2', status: 'away' }),
      ]));
    });

    it('marks unconnected users as hidden/offline', async () => {
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(),
        pendingInitiatedByMe: new Set(),
      });
      redis.getMultiplePresences.mockResolvedValue([null]);

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['presence:request'](['stranger']);

      expect(socket.emit).toHaveBeenCalledWith('presence:response', [
        expect.objectContaining({ userId: 'stranger', status: 'offline', hidden: true }),
      ]);
    });

    it('marks pending outgoing recipients as hidden', async () => {
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['pending-user']),
        pendingInitiatedByMe: new Set(['pending-user']),
      });
      redis.getMultiplePresences.mockResolvedValue([
        { userId: 'pending-user', status: 'online', hideOnlineStatus: false },
      ]);

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['presence:request'](['pending-user']);

      expect(socket.emit).toHaveBeenCalledWith('presence:response', [
        expect.objectContaining({ userId: 'pending-user', hidden: true }),
      ]);
    });

    it('falls back to DB lastSeen for offline connected users', async () => {
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1']),
        pendingInitiatedByMe: new Set(),
      });
      redis.getMultiplePresences.mockResolvedValue([null]);
      prisma.user.findMany.mockResolvedValue([{ id: 'friend-1', lastSeen: new Date('2024-06-01') }]);

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['presence:request'](['friend-1']);

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: { in: ['friend-1'] } },
      }));
      expect(socket.emit).toHaveBeenCalledWith('presence:response', [
        expect.objectContaining({ userId: 'friend-1', lastSeen: expect.any(String) }),
      ]);
    });

    it('hides status for users with hideOnlineStatus', async () => {
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1']),
        pendingInitiatedByMe: new Set(),
      });
      redis.getMultiplePresences.mockResolvedValue([
        { userId: 'friend-1', status: 'online', hideOnlineStatus: true, lastSeen: '2024-01-01' },
      ]);

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['presence:request'](['friend-1']);

      expect(socket.emit).toHaveBeenCalledWith('presence:response', [
        expect.objectContaining({ userId: 'friend-1', status: 'offline', hidden: true }),
      ]);
    });
  });

  // ─── user:profile:request ─────────────────────────────────────────────────
  describe('user:profile:request', () => {
    const fullUser = {
      id: 'target-1', username: '@target', displayName: 'Target',
      firstName: 'John', lastName: 'Doe',
      profileImage: 'pic.png', coverImage: null,
      lastSeen: new Date(), emailVerified: true,
      privacyPhone: 'everyone', privacyEmail: 'friends', privacyFullName: 'everyone',
      privacyGender: 'nobody', privacyJoinedDate: 'everyone',
      phoneNumber: '+1234', email: 'j@d.com', gender: 'male', createdAt: new Date(),
    };

    it('returns profile with privacy filtering for non-friend', async () => {
      prisma.user.findUnique.mockResolvedValue(fullUser);
      prisma.friendship.findFirst
        .mockResolvedValueOnce(null)   // block check
        .mockResolvedValueOnce(null);  // friendship check

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['user:profile:request']({ targetUserId: 'target-1' }, ack);

      const profile = ack.mock.calls[0][0].user;
      expect(profile.phoneNumber).toBe('+1234');     // privacyPhone = everyone
      expect(profile.email).toBeUndefined();          // privacyEmail = friends, not a friend
      expect(profile.firstName).toBe('John');          // privacyFullName = everyone
      expect(profile.gender).toBeUndefined();          // privacyGender = nobody
      expect(profile.createdAt).toBeDefined();         // privacyJoinedDate = everyone
    });

    it('returns full profile for a friend', async () => {
      prisma.user.findUnique.mockResolvedValue(fullUser);
      prisma.friendship.findFirst
        .mockResolvedValueOnce(null)   // block check
        .mockResolvedValueOnce({ id: 'f-1', status: 'accepted' }); // friendship

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['user:profile:request']({ targetUserId: 'target-1' }, ack);

      const profile = ack.mock.calls[0][0].user;
      expect(profile.email).toBe('j@d.com');  // friends can see
    });

    it('returns blockedByThem when target blocked the requester', async () => {
      prisma.user.findUnique.mockResolvedValue(fullUser);
      prisma.friendship.findFirst.mockResolvedValueOnce({ status: 'blocked' });

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['user:profile:request']({ targetUserId: 'target-1' }, ack);

      expect(ack).toHaveBeenCalledWith({ blockedByThem: true });
    });

    it('returns error for missing targetUserId', async () => {
      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['user:profile:request']({}, ack);

      expect(ack).toHaveBeenCalledWith({ error: 'Missing targetUserId' });
    });

    it('returns error when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['user:profile:request']({ targetUserId: 'nonexistent' }, ack);

      expect(ack).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('returns error on DB failure', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['user:profile:request']({ targetUserId: 'target-1' }, ack);

      expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
    });
  });

  // ─── profile:imageUpdated ─────────────────────────────────────────────────
  describe('profile:imageUpdated', () => {
    it('updates profileImage on socket', async () => {
      const { socket, events } = await connectSocket();

      events['profile:imageUpdated']({ profileImage: 'new-pic.jpg' });

      expect(socket.profileImage).toBe('new-pic.jpg');
    });
  });

  // ─── friend:notify ────────────────────────────────────────────────────────
  describe('friend:notify', () => {
    it('relays friend event to both users', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1', username: '@testuser', displayName: 'Test User', profileImage: null,
      });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['friend:notify']({ type: 'request', addresseeId: 'user-2', friendshipId: 'f-1' });

      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io.to).toHaveBeenCalledWith('user:user-1');
      expect(io._toEmit).toHaveBeenCalledWith('friend:update', expect.objectContaining({
        type: 'request',
        friendshipId: 'f-1',
        from: expect.objectContaining({ id: 'user-1' }),
      }));
    });

    it('does nothing when sender not found in DB', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const { io, events } = await connectSocket();
      io._toEmit.mockClear();

      await events['friend:notify']({ type: 'accepted', addresseeId: 'user-2' });

      expect(io._toEmit).not.toHaveBeenCalledWith('friend:update', expect.anything());
    });

    it('handles DB errors gracefully', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();

      await events['friend:notify']({ type: 'request', addresseeId: 'user-2' });
      // Should not throw
    });
  });

  // ─── settings:update ──────────────────────────────────────────────────────
  describe('settings:update', () => {
    it('updates privacy setting and broadcasts status change', async () => {
      redis.getPresence.mockResolvedValue({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: new Date().toISOString(), hideOnlineStatus: false,
      });
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1']),
        pendingInitiatedByMe: new Set(),
      });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();
      redis.setPresence.mockClear();

      await events['settings:update']({ privacyOnlineStatus: 'nobody' });

      expect(redis.setPresence).toHaveBeenCalledWith(
        expect.objectContaining({ hideOnlineStatus: true }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'user-1' },
        data: { privacyOnlineStatus: 'nobody' },
      }));
      expect(io._toEmit).toHaveBeenCalledWith('user:status', expect.objectContaining({
        userId: 'user-1', status: 'offline', hidden: true,
      }));
    });

    it('broadcasts online status when setting changed to everyone', async () => {
      redis.getPresence.mockResolvedValue({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: new Date().toISOString(), hideOnlineStatus: true,
      });
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1']),
        pendingInitiatedByMe: new Set(),
      });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['settings:update']({ privacyOnlineStatus: 'everyone' });

      expect(io._toEmit).toHaveBeenCalledWith('user:status', expect.objectContaining({
        status: 'online', hidden: false,
      }));
    });

    it('ignores invalid privacy values', async () => {
      const { events } = await connectSocket();
      redis.setPresence.mockClear();
      redis.getPresence.mockClear();

      await events['settings:update']({ privacyOnlineStatus: 'invalid-value' });

      expect(redis.getPresence).not.toHaveBeenCalled();
    });

    it('handles DB error when persisting setting', async () => {
      redis.getPresence.mockResolvedValue({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: new Date().toISOString(), hideOnlineStatus: false,
      });
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(),
        pendingInitiatedByMe: new Set(),
      });
      prisma.user.update.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();

      await events['settings:update']({ privacyOnlineStatus: 'nobody' });
      // Should not throw
    });

    it('skips pending outgoing recipients when broadcasting', async () => {
      redis.getPresence.mockResolvedValue({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: new Date().toISOString(), hideOnlineStatus: false,
      });
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1', 'pending-user']),
        pendingInitiatedByMe: new Set(['pending-user']),
      });

      const { io, events } = await connectSocket();
      io.to.mockClear();

      await events['settings:update']({ privacyOnlineStatus: 'nobody' });

      const rooms = io.to.mock.calls.map((c: any[]) => c[0]);
      expect(rooms).not.toContain('user:pending-user');
    });
  });

  // ─── group:message (the other handler, lines 1277-1338) ───────────────────
  describe('group:message', () => {
    it('creates and broadcasts a group message', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({ userId: 'user-1', groupId: 'grp-1' });
      prisma.groupMessage.create.mockResolvedValue({
        id: 'gmsg-1', groupId: 'grp-1', senderId: 'user-1',
        content: 'Hello group', type: 'text', createdAt: new Date(),
        audioWaveform: null, audioDuration: null, linkPreview: null,
        sender: { id: 'user-1', username: '@testuser', displayName: 'Test', profileImage: null },
      });
      prisma.groupMember.findMany.mockResolvedValue([
        { userId: 'user-1' }, { userId: 'user-2' },
      ]);

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['group:message']({
        groupId: 'grp-1', content: 'Hello group', tempId: 'temp-1',
      });

      expect(prisma.groupMessage.create).toHaveBeenCalled();
      expect(io.to).toHaveBeenCalledWith('user:user-1');
      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io._toEmit).toHaveBeenCalledWith('group:message', expect.objectContaining({
        id: 'gmsg-1', tempId: 'temp-1',
      }));
    });

    it('rejects non-member', async () => {
      prisma.groupMember.findFirst.mockResolvedValue(null);

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['group:message']({ groupId: 'grp-1', content: 'Hello' });

      expect(socket.emit).toHaveBeenCalledWith('error', 'Not a member of this group');
    });

    it('silently ignores empty content', async () => {
      const { events } = await connectSocket();

      await events['group:message']({ groupId: 'grp-1', content: '' });

      expect(prisma.groupMember.findFirst).not.toHaveBeenCalled();
    });

    it('uses existing message when messageId is provided', async () => {
      prisma.groupMember.findFirst.mockResolvedValue({ userId: 'user-1', groupId: 'grp-1' });
      prisma.groupMessage.findUnique.mockResolvedValue({
        id: 'existing-gmsg', groupId: 'grp-1', senderId: 'user-1',
        content: 'With file', type: 'audio', createdAt: new Date(),
        audioWaveform: null, audioDuration: null,
        sender: { id: 'user-1', username: '@testuser', displayName: 'Test', profileImage: null },
      });
      prisma.groupMember.findMany.mockResolvedValue([{ userId: 'user-1' }]);

      const { events } = await connectSocket();

      await events['group:message']({
        groupId: 'grp-1', content: 'With file', messageId: 'existing-gmsg',
        duration: 10, waveform: [0.1, 0.5],
      });

      expect(prisma.groupMessage.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'existing-gmsg' },
        data: expect.objectContaining({ audioDuration: 10 }),
      }));
      expect(prisma.groupMessage.create).not.toHaveBeenCalled();
    });

    it('handles DB errors gracefully', async () => {
      prisma.groupMember.findFirst.mockRejectedValue(new Error('DB error'));

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['group:message']({ groupId: 'grp-1', content: 'Hello' });

      expect(socket.emit).toHaveBeenCalledWith('error', 'Failed to send group message');
    });
  });

  // ─── group:message:unsend ─────────────────────────────────────────────────
  describe('group:message:unsend', () => {
    it('soft-deletes group message and notifies all members', async () => {
      prisma.groupMessage.findUnique.mockResolvedValue({
        senderId: 'user-1', groupId: 'grp-1', deletedAt: null,
      });
      prisma.groupMessage.update.mockResolvedValue({});
      prisma.groupMember.findMany.mockResolvedValue([
        { userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' },
      ]);

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['group:message:unsend']('gmsg-1');

      expect(prisma.groupMessage.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'gmsg-1' },
        data: { deletedAt: expect.any(Date) },
      }));
      expect(io._toEmit).toHaveBeenCalledWith('group:message:unsent', expect.objectContaining({
        messageId: 'gmsg-1', groupId: 'grp-1',
      }));
    });

    it('ignores unsend by non-owner', async () => {
      prisma.groupMessage.findUnique.mockResolvedValue({
        senderId: 'someone-else', groupId: 'grp-1', deletedAt: null,
      });

      const { events } = await connectSocket();

      await events['group:message:unsend']('gmsg-1');

      expect(prisma.groupMessage.update).not.toHaveBeenCalled();
    });

    it('ignores already-deleted group message', async () => {
      prisma.groupMessage.findUnique.mockResolvedValue({
        senderId: 'user-1', groupId: 'grp-1', deletedAt: new Date(),
      });

      const { events } = await connectSocket();

      await events['group:message:unsend']('gmsg-1');

      expect(prisma.groupMessage.update).not.toHaveBeenCalled();
    });

    it('ignores nonexistent message', async () => {
      prisma.groupMessage.findUnique.mockResolvedValue(null);

      const { events } = await connectSocket();

      await events['group:message:unsend']('nonexistent');

      expect(prisma.groupMessage.update).not.toHaveBeenCalled();
    });

    it('handles DB errors gracefully', async () => {
      prisma.groupMessage.findUnique.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();

      await events['group:message:unsend']('gmsg-1');
      // Should not throw
    });
  });

  // ─── Coverage: line 201 (reactions in messages:history) ──────────────────
  describe('messages:history - reactions mapping', () => {
    it('formats non-empty reactions with userId, username, and emoji', async () => {
      const msgs = [{
        id: 'msg-rx', senderId: 'user-2', recipientId: 'user-1',
        content: 'Hello', type: 'text', status: 'sent', isRead: false, readAt: null,
        createdAt: new Date('2024-01-01'), deletedAt: null,
        edited: false, editedAt: null,
        fileUrl: null, fileName: null, fileSize: null, fileType: null,
        audioWaveform: null, audioDuration: null,
        replyToId: null, replyToContent: null, replyToSenderName: null,
        replyToType: null, replyToDuration: null, linkPreview: null,
        sender: { id: 'user-2', username: '@other', displayName: 'Other', profileImage: null },
        reactions: [
          { userId: 'user-1', emoji: '❤️', user: { username: '@testuser' } },
          { userId: 'user-2', emoji: '👍', user: { username: '@other' } },
        ],
      }];
      prisma.message.findMany.mockResolvedValue(msgs);

      const { events } = await connectSocket();
      const ack = jest.fn();

      await events['messages:history']({ recipientId: 'user-2' }, ack);

      const formatted = ack.mock.calls[0][0].messages[0];
      expect(formatted.reactions).toEqual([
        { userId: 'user-1', username: '@testuser', emoji: '❤️' },
        { userId: 'user-2', username: '@other', emoji: '👍' },
      ]);
    });
  });

  // ─── Coverage: lines 495-496 (AI bot history filter) ───────────────────
  describe('message:send - AI bot history filtering', () => {
    const origEnv = process.env.AI_BOT_USER_ID;
    const openai = require('../services/openai');

    beforeEach(() => {
      process.env.AI_BOT_USER_ID = 'ai-bot';
      openai.generateAIReply.mockResolvedValue('AI response');
    });
    afterEach(() => {
      if (origEnv !== undefined) process.env.AI_BOT_USER_ID = origEnv;
      else delete process.env.AI_BOT_USER_ID;
    });

    it('filters non-text messages from chat history sent to AI', async () => {
      convo.getOrCreateConversation.mockResolvedValue({ id: 'conv-ai', status: 'accepted', initiatorId: 'user-1' });
      prisma.message.create.mockResolvedValueOnce(makeMockMessage({ recipientId: 'ai-bot', type: 'text' }));
      prisma.message.findMany.mockResolvedValue([
        { senderId: 'user-1', content: 'Hi', type: 'text' },
        { senderId: 'ai-bot', content: '', type: 'image' },
        { senderId: 'ai-bot', content: 'Hello!', type: 'text' },
      ]);
      prisma.message.create.mockResolvedValueOnce({ id: 'bot-msg', createdAt: new Date(), content: 'AI response' });
      prisma.user.findUnique
        .mockResolvedValueOnce({ privacyOnlineStatus: 'everyone', isGuest: false })
        .mockResolvedValueOnce({ isGuest: false })
        .mockResolvedValueOnce({ username: '@chatr-ai', displayName: 'Chatr AI', profileImage: null });

      const { events } = await connectSocket();

      await events['message:send']({ recipientId: 'ai-bot', content: 'Test' });
      await new Promise(r => setTimeout(r, 800));

      const historyArg = openai.generateAIReply.mock.calls[0][0];
      expect(historyArg).toEqual([
        { role: 'assistant', content: 'Hello!' },
        { role: 'user', content: 'Hi' },
      ]);
    });
  });

  // ─── Coverage: line 1061 (DB error fetching lastSeen) ──────────────────
  describe('presence:request - lastSeen DB error', () => {
    it('handles DB error when fetching lastSeen from database', async () => {
      convo.getConnectedUserIds.mockResolvedValue({
        all: new Set(['friend-1']),
        pendingInitiatedByMe: new Set(),
      });
      redis.getMultiplePresences.mockResolvedValue([null]);
      prisma.user.findMany.mockRejectedValue(new Error('DB error'));

      const { socket, events } = await connectSocket();
      socket.emit.mockClear();

      await events['presence:request'](['friend-1']);

      expect(socket.emit).toHaveBeenCalledWith('presence:response', expect.any(Array));
    });
  });

  // ─── group:typing ─────────────────────────────────────────────────────────
  describe('group:typing', () => {
    it('broadcasts typing to group members except sender', async () => {
      prisma.groupMember.findMany.mockResolvedValue([
        { userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' },
      ]);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1', displayName: 'Test User', username: '@testuser',
      });

      const { io, events } = await connectSocket();
      io.to.mockClear();
      io._toEmit.mockClear();

      await events['group:typing']({ groupId: 'grp-1', isTyping: true });

      expect(io.to).toHaveBeenCalledWith('user:user-2');
      expect(io.to).toHaveBeenCalledWith('user:user-3');
      expect(io._toEmit).toHaveBeenCalledWith('group:typing', expect.objectContaining({
        groupId: 'grp-1', userId: 'user-1', isTyping: true,
      }));
      const rooms = io.to.mock.calls.map((c: any[]) => c[0]);
      expect(rooms).not.toContain('user:user-1');
    });

    it('handles DB errors gracefully', async () => {
      prisma.groupMember.findMany.mockRejectedValue(new Error('DB error'));

      const { events } = await connectSocket();

      await events['group:typing']({ groupId: 'grp-1', isTyping: true });
      // Should not throw
    });
  });
});
