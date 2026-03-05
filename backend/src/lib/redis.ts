import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null; // stop retrying
    return Math.min(times * 200, 5000);
  },
  lazyConnect: true,
});

export const redisPub = new Redis(REDIS_URL, { lazyConnect: true });
export const redisSub = new Redis(REDIS_URL, { lazyConnect: true });

let connected = false;

redis.on('connect', () => { connected = true; console.log('🔴 Redis connected'); });
redis.on('error', (err) => { connected = false; console.error('🔴 Redis error:', err.message); });
redis.on('close', () => { connected = false; });

export function isRedisConnected(): boolean {
  return connected && redis.status === 'ready';
}

export async function connectRedis(): Promise<void> {
  await Promise.all([redis.connect(), redisPub.connect(), redisSub.connect()]);
}

export async function disconnectRedis(): Promise<void> {
  await Promise.all([
    redis.quit().catch(() => {}),
    redisPub.quit().catch(() => {}),
    redisSub.quit().catch(() => {}),
  ]);
}

// ── Key helpers ────────────────────────────────────────────────────────────────

const PREFIX = 'chatr';

export const keys = {
  presence: (userId: string) => `${PREFIX}:presence:${userId}`,
  socket: (userId: string) => `${PREFIX}:socket:${userId}`,
  onlineUsers: () => `${PREFIX}:online_users`,
  conversationCache: (userId: string) => `${PREFIX}:conversations:${userId}`,
  rateLimit: (key: string) => `${PREFIX}:rl:${key}`,
  tokenBlacklist: (jti: string) => `${PREFIX}:bl:${jti}`,
  verifyEmail: (userId: string) => `${PREFIX}:verify:email:${userId}`,
  verifyPhone: (userId: string) => `${PREFIX}:verify:phone:${userId}`,
  verifyLogin: (userId: string) => `${PREFIX}:verify:login:${userId}`,
  resetPassword: (userId: string) => `${PREFIX}:verify:reset:${userId}`,
};

// ── Presence helpers ───────────────────────────────────────────────────────────

export interface PresenceData {
  userId: string;
  socketId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string; // ISO string
  hideOnlineStatus: boolean;
}

export async function setPresence(data: PresenceData): Promise<void> {
  const key = keys.presence(data.userId);
  await redis.hmset(key, {
    userId: data.userId,
    socketId: data.socketId,
    status: data.status,
    lastSeen: data.lastSeen,
    hideOnlineStatus: data.hideOnlineStatus ? '1' : '0',
  });
  await redis.sadd(keys.onlineUsers(), data.userId);
}

export async function getPresence(userId: string): Promise<PresenceData | null> {
  const raw = await redis.hgetall(keys.presence(userId));
  if (!raw || !raw.userId) return null;
  return {
    userId: raw.userId,
    socketId: raw.socketId,
    status: raw.status as PresenceData['status'],
    lastSeen: raw.lastSeen,
    hideOnlineStatus: raw.hideOnlineStatus === '1',
  };
}

export async function removePresence(userId: string): Promise<void> {
  await redis.del(keys.presence(userId));
  await redis.srem(keys.onlineUsers(), userId);
}

export async function getAllOnlineUserIds(): Promise<string[]> {
  return redis.smembers(keys.onlineUsers());
}

export async function getMultiplePresences(userIds: string[]): Promise<(PresenceData | null)[]> {
  const pipeline = redis.pipeline();
  for (const id of userIds) {
    pipeline.hgetall(keys.presence(id));
  }
  const results = await pipeline.exec();
  if (!results) return userIds.map(() => null);

  return results.map(([err, raw]: any) => {
    if (err || !raw || !raw.userId) return null;
    return {
      userId: raw.userId,
      socketId: raw.socketId,
      status: raw.status as PresenceData['status'],
      lastSeen: raw.lastSeen,
      hideOnlineStatus: raw.hideOnlineStatus === '1',
    };
  });
}

// ── Socket mapping ─────────────────────────────────────────────────────────────

export async function setSocketMapping(userId: string, socketId: string): Promise<void> {
  await redis.set(keys.socket(userId), socketId);
}

export async function getSocketId(userId: string): Promise<string | null> {
  return redis.get(keys.socket(userId));
}

export async function removeSocketMapping(userId: string): Promise<void> {
  await redis.del(keys.socket(userId));
}

// ── Conversation cache ─────────────────────────────────────────────────────────

const CONVERSATION_CACHE_TTL = 30; // seconds

export async function getCachedConversations(userId: string): Promise<string | null> {
  return redis.get(keys.conversationCache(userId));
}

export async function setCachedConversations(userId: string, data: string): Promise<void> {
  await redis.set(keys.conversationCache(userId), data, 'EX', CONVERSATION_CACHE_TTL);
}

export async function invalidateConversationCache(userId: string): Promise<void> {
  await redis.del(keys.conversationCache(userId));
}

// ── Rate limiter ───────────────────────────────────────────────────────────────

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const redisKey = keys.rateLimit(key);
  const current = await redis.incr(redisKey);
  if (current === 1) {
    await redis.expire(redisKey, windowSeconds);
  }
  const ttl = await redis.ttl(redisKey);
  return {
    allowed: current <= maxAttempts,
    remaining: Math.max(0, maxAttempts - current),
    retryAfter: current > maxAttempts ? ttl : 0,
  };
}

// ── Token blacklist ────────────────────────────────────────────────────────────

export async function blacklistToken(tokenHash: string, expiresInSeconds: number): Promise<void> {
  await redis.set(keys.tokenBlacklist(tokenHash), '1', 'EX', expiresInSeconds);
}

export async function isTokenBlacklisted(tokenHash: string): Promise<boolean> {
  const val = await redis.get(keys.tokenBlacklist(tokenHash));
  return val === '1';
}

// ── Verification codes ─────────────────────────────────────────────────────────

const VERIFY_TTL = 15 * 60; // 15 minutes

export async function storeVerificationCode(
  type: 'email' | 'phone' | 'login' | 'reset',
  userId: string,
  code: string,
  extra?: Record<string, string>
): Promise<void> {
  const keyMap = { email: keys.verifyEmail, phone: keys.verifyPhone, login: keys.verifyLogin, reset: keys.resetPassword };
  const key = keyMap[type](userId);
  const data: Record<string, string> = { code, createdAt: new Date().toISOString(), ...extra };
  await redis.hmset(key, data);
  await redis.expire(key, VERIFY_TTL);
}

export async function getVerificationCode(
  type: 'email' | 'phone' | 'login' | 'reset',
  userId: string
): Promise<Record<string, string> | null> {
  const keyMap = { email: keys.verifyEmail, phone: keys.verifyPhone, login: keys.verifyLogin, reset: keys.resetPassword };
  const raw = await redis.hgetall(keyMap[type](userId));
  if (!raw || !raw.code) return null;
  return raw;
}

export async function deleteVerificationCode(
  type: 'email' | 'phone' | 'login' | 'reset',
  userId: string
): Promise<void> {
  const keyMap = { email: keys.verifyEmail, phone: keys.verifyPhone, login: keys.verifyLogin, reset: keys.resetPassword };
  await redis.del(keyMap[type](userId));
}
