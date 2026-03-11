import { keys } from '../lib/redis';

jest.mock('ioredis', () => {
  const mRedis = {
    hmset: jest.fn().mockResolvedValue('OK'),
    hgetall: jest.fn().mockResolvedValue({}),
    sadd: jest.fn().mockResolvedValue(1),
    srem: jest.fn().mockResolvedValue(1),
    smembers: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(60),
    pipeline: jest.fn().mockReturnValue({ hgetall: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([]) }),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn().mockReturnThis(),
    status: 'ready',
  };
  return jest.fn(() => mRedis);
});

import {
  setPresence,
  getPresence,
  removePresence,
  getAllOnlineUserIds,
  setSocketMapping,
  getSocketId,
  removeSocketMapping,
  getCachedConversations,
  setCachedConversations,
  invalidateConversationCache,
  checkRateLimit,
  blacklistToken,
  isTokenBlacklisted,
  storeVerificationCode,
  getVerificationCode,
  deleteVerificationCode,
  redis,
} from '../lib/redis';

describe('Redis Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('keys', () => {
    it('should generate correct key patterns', () => {
      expect(keys.presence('user-1')).toBe('chatr:presence:user-1');
      expect(keys.socket('user-1')).toBe('chatr:socket:user-1');
      expect(keys.onlineUsers()).toBe('chatr:online_users');
      expect(keys.conversationCache('user-1')).toBe('chatr:conversations:user-1');
      expect(keys.rateLimit('login:1')).toBe('chatr:rl:login:1');
      expect(keys.tokenBlacklist('abc')).toBe('chatr:bl:abc');
      expect(keys.verifyEmail('user-1')).toBe('chatr:verify:email:user-1');
      expect(keys.verifyPhone('user-1')).toBe('chatr:verify:phone:user-1');
      expect(keys.verifyLogin('user-1')).toBe('chatr:verify:login:user-1');
      expect(keys.resetPassword('user-1')).toBe('chatr:verify:reset:user-1');
    });
  });

  describe('Presence', () => {
    it('should set presence data', async () => {
      await setPresence({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: '2026-01-01T00:00:00Z', hideOnlineStatus: false,
      });
      expect(redis.hmset).toHaveBeenCalled();
      expect(redis.sadd).toHaveBeenCalledWith('chatr:online_users', 'user-1');
    });

    it('should get presence data', async () => {
      (redis.hgetall as jest.Mock).mockResolvedValue({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: '2026-01-01T00:00:00Z', hideOnlineStatus: '0',
      });

      const result = await getPresence('user-1');
      expect(result).toEqual({
        userId: 'user-1', socketId: 'sock-1', status: 'online',
        lastSeen: '2026-01-01T00:00:00Z', hideOnlineStatus: false,
      });
    });

    it('should return null for missing presence', async () => {
      (redis.hgetall as jest.Mock).mockResolvedValue({});
      expect(await getPresence('user-x')).toBeNull();
    });

    it('should remove presence', async () => {
      await removePresence('user-1');
      expect(redis.del).toHaveBeenCalledWith('chatr:presence:user-1');
      expect(redis.srem).toHaveBeenCalledWith('chatr:online_users', 'user-1');
    });

    it('should get all online user IDs', async () => {
      (redis.smembers as jest.Mock).mockResolvedValue(['user-1', 'user-2']);
      const ids = await getAllOnlineUserIds();
      expect(ids).toEqual(['user-1', 'user-2']);
    });
  });

  describe('Socket Mapping', () => {
    it('should set socket mapping', async () => {
      await setSocketMapping('user-1', 'sock-abc');
      expect(redis.set).toHaveBeenCalledWith('chatr:socket:user-1', 'sock-abc');
    });

    it('should get socket ID', async () => {
      (redis.get as jest.Mock).mockResolvedValue('sock-abc');
      const id = await getSocketId('user-1');
      expect(id).toBe('sock-abc');
    });

    it('should remove socket mapping', async () => {
      await removeSocketMapping('user-1');
      expect(redis.del).toHaveBeenCalledWith('chatr:socket:user-1');
    });
  });

  describe('Conversation Cache', () => {
    it('should get cached conversations', async () => {
      (redis.get as jest.Mock).mockResolvedValue('{"convos":[]}');
      const data = await getCachedConversations('user-1');
      expect(data).toBe('{"convos":[]}');
    });

    it('should set cached conversations with TTL', async () => {
      await setCachedConversations('user-1', '{"convos":[]}');
      expect(redis.set).toHaveBeenCalledWith('chatr:conversations:user-1', '{"convos":[]}', 'EX', 30);
    });

    it('should invalidate conversation cache', async () => {
      await invalidateConversationCache('user-1');
      expect(redis.del).toHaveBeenCalledWith('chatr:conversations:user-1');
    });
  });

  describe('Rate Limiter', () => {
    it('should allow first request', async () => {
      (redis.incr as jest.Mock).mockResolvedValue(1);
      (redis.ttl as jest.Mock).mockResolvedValue(60);

      const result = await checkRateLimit('login:user1', 5, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.retryAfter).toBe(0);
      expect(redis.expire).toHaveBeenCalled();
    });

    it('should deny when limit exceeded', async () => {
      (redis.incr as jest.Mock).mockResolvedValue(6);
      (redis.ttl as jest.Mock).mockResolvedValue(45);

      const result = await checkRateLimit('login:user1', 5, 60);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(45);
    });
  });

  describe('Token Blacklist', () => {
    it('should blacklist a token', async () => {
      await blacklistToken('hash123', 3600);
      expect(redis.set).toHaveBeenCalledWith('chatr:bl:hash123', '1', 'EX', 3600);
    });

    it('should return true for blacklisted token', async () => {
      (redis.get as jest.Mock).mockResolvedValue('1');
      expect(await isTokenBlacklisted('hash123')).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      expect(await isTokenBlacklisted('hash-unknown')).toBe(false);
    });
  });

  describe('Verification Codes', () => {
    it('should store a verification code', async () => {
      await storeVerificationCode('email', 'user-1', '123456');
      expect(redis.hmset).toHaveBeenCalledWith(
        'chatr:verify:email:user-1',
        expect.objectContaining({ code: '123456' })
      );
      expect(redis.expire).toHaveBeenCalledWith('chatr:verify:email:user-1', 900);
    });

    it('should store with extra data', async () => {
      await storeVerificationCode('login', 'user-1', '654321', { attempts: '0' });
      expect(redis.hmset).toHaveBeenCalledWith(
        'chatr:verify:login:user-1',
        expect.objectContaining({ code: '654321', attempts: '0' })
      );
    });

    it('should get a verification code', async () => {
      (redis.hgetall as jest.Mock).mockResolvedValue({ code: '123456', createdAt: '2026-01-01' });
      const result = await getVerificationCode('email', 'user-1');
      expect(result).toEqual({ code: '123456', createdAt: '2026-01-01' });
    });

    it('should return null for missing verification code', async () => {
      (redis.hgetall as jest.Mock).mockResolvedValue({});
      expect(await getVerificationCode('email', 'user-x')).toBeNull();
    });

    it('should delete a verification code', async () => {
      await deleteVerificationCode('phone', 'user-1');
      expect(redis.del).toHaveBeenCalledWith('chatr:verify:phone:user-1');
    });

    it('should use correct key for each type', async () => {
      await deleteVerificationCode('reset', 'u1');
      expect(redis.del).toHaveBeenCalledWith('chatr:verify:reset:u1');
    });
  });
});
