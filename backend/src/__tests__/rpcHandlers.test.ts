import { PrismaClient } from '@prisma/client';

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  invalidateConversationCache: jest.fn().mockResolvedValue(undefined),
  getSocketId: jest.fn().mockResolvedValue(null),
}));

jest.mock('../lib/conversation', () => ({
  getConnectedUserIds: jest.fn().mockResolvedValue({ all: new Set() }),
  acceptConversation: jest.fn(),
  declineConversation: jest.fn(),
  nukeConversation: jest.fn(),
  nukeByParticipants: jest.fn(),
  findConversation: jest.fn(),
  getOrCreateConversation: jest.fn(),
  getBlockBetween: jest.fn(),
}));

jest.mock('../lib/getConversations', () => ({
  getConversations: jest.fn(),
}));

jest.mock('../services/summaryEngine', () => ({
  maybeRegenerateGroupSummary: jest.fn(),
}));

jest.mock('../routes/widget', () => ({
  deleteGuestUser: jest.fn().mockResolvedValue(undefined),
}));

import { registerRPCHandlers } from '../socket/rpcHandlers';
import { invalidateConversationCache } from '../lib/redis';
import { getConnectedUserIds, acceptConversation, declineConversation, nukeConversation, nukeByParticipants } from '../lib/conversation';
import { getConversations } from '../lib/getConversations';
import { maybeRegenerateGroupSummary } from '../services/summaryEngine';
import { deleteGuestUser } from '../routes/widget';

const prisma = new PrismaClient();

const testUserId = 'user-123';

let handlers: Record<string, Function>;
let mockEmit: jest.Mock;
let mockTo: jest.Mock;
let mockIo: any;
let mockSocket: any;

function setup() {
  handlers = {};
  mockSocket = {
    on: jest.fn((event: string, handler: Function) => { handlers[event] = handler; }),
  };
  mockEmit = jest.fn();
  mockTo = jest.fn(() => ({ emit: mockEmit }));
  mockIo = { to: mockTo };
  registerRPCHandlers(mockSocket, mockIo, testUserId);
}

beforeEach(() => {
  jest.clearAllMocks();
  setup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─── USERS ──────────────────────────────────────────────────────────────────

describe('users:me', () => {
  it('returns current user', async () => {
    const user = { id: testUserId, username: '@test', displayName: 'Test' };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    const ack = jest.fn();
    await handlers['users:me']({}, ack);
    expect(ack).toHaveBeenCalledWith(user);
  });

  it('returns error when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['users:me']({}, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('returns internal error on exception', async () => {
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['users:me']({}, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('does not throw when ack is undefined', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(handlers['users:me']({}, undefined)).resolves.toBeUndefined();
  });
});

describe('users:me:update', () => {
  it('updates profile fields', async () => {
    const updated = { id: testUserId, displayName: 'New', firstName: 'F', lastName: 'L', gender: 'male' };
    (prisma.user.update as jest.Mock).mockResolvedValue(updated);
    (getConnectedUserIds as jest.Mock).mockResolvedValue({ all: new Set(['other-1']) });
    const ack = jest.fn();
    await handlers['users:me:update']({ displayName: 'New', firstName: 'F', lastName: 'L', gender: 'male' }, ack);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: testUserId },
    }));
    expect(ack).toHaveBeenCalledWith(updated);
  });

  it('rejects invalid gender', async () => {
    const ack = jest.fn();
    await handlers['users:me:update']({ gender: 'invalid-value' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Invalid gender value' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('allows empty/null/undefined gender (clear)', async () => {
    const updated = { id: testUserId, gender: null };
    (prisma.user.update as jest.Mock).mockResolvedValue(updated);
    (getConnectedUserIds as jest.Mock).mockResolvedValue({ all: new Set() });
    const ack = jest.fn();
    await handlers['users:me:update']({ gender: '' }, ack);
    expect(ack).toHaveBeenCalledWith(updated);
  });

  it('broadcasts profileUpdate to connected users', async () => {
    const updated = { id: testUserId, displayName: 'D', firstName: 'F', lastName: 'L', profileImage: null };
    (prisma.user.update as jest.Mock).mockResolvedValue(updated);
    (getConnectedUserIds as jest.Mock).mockResolvedValue({ all: new Set(['u-a', 'u-b']) });
    const ack = jest.fn();
    await handlers['users:me:update']({ displayName: 'D' }, ack);
    expect(invalidateConversationCache).toHaveBeenCalledWith('u-a');
    expect(invalidateConversationCache).toHaveBeenCalledWith('u-b');
    expect(invalidateConversationCache).toHaveBeenCalledWith(testUserId);
    expect(mockTo).toHaveBeenCalledWith('user:u-a');
    expect(mockTo).toHaveBeenCalledWith('user:u-b');
    expect(mockEmit).toHaveBeenCalledWith('user:profileUpdate', expect.objectContaining({ userId: testUserId }));
  });

  it('returns internal error on exception', async () => {
    (prisma.user.update as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['users:me:update']({ displayName: 'X' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

describe('users:me:settings', () => {
  it('updates valid privacy settings', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    const ack = jest.fn();
    await handlers['users:me:settings']({ privacyOnlineStatus: 'friends', privacyPhone: 'nobody' }, ack);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: testUserId },
      data: { privacyOnlineStatus: 'friends', privacyPhone: 'nobody' },
    });
    expect(ack).toHaveBeenCalledWith({ ok: true });
  });

  it('rejects when no valid settings provided', async () => {
    const ack = jest.fn();
    await handlers['users:me:settings']({ privacyOnlineStatus: 'bad-value' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'No valid settings' });
  });

  it('ignores unknown keys', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    const ack = jest.fn();
    await handlers['users:me:settings']({ unknownField: 'everyone', privacyEmail: 'everyone' }, ack);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: testUserId },
      data: { privacyEmail: 'everyone' },
    });
    expect(ack).toHaveBeenCalledWith({ ok: true });
  });

  it('returns internal error on exception', async () => {
    (prisma.user.update as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['users:me:settings']({ privacyEmail: 'friends' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

describe('users:list', () => {
  it('lists verified users', async () => {
    const users = [{ id: 'u1', username: '@one' }];
    (prisma.user.findMany as jest.Mock).mockResolvedValue(users);
    const ack = jest.fn();
    await handlers['users:list']({}, ack);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { emailVerified: true },
    }));
    expect(ack).toHaveBeenCalledWith({ users });
  });

  it('returns internal error on exception', async () => {
    (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['users:list']({}, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

describe('users:search', () => {
  it('returns empty array for empty query', async () => {
    const ack = jest.fn();
    await handlers['users:search']({ q: '' }, ack);
    expect(ack).toHaveBeenCalledWith({ users: [] });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('searches users and overlays friendship status', async () => {
    const users = [
      { id: 'u-a', username: '@alice', displayName: 'Alice', firstName: null, lastName: null, profileImage: null, lastSeen: null, isBot: false, isGuest: false },
      { id: 'u-b', username: '@bob', displayName: 'Bob', firstName: null, lastName: null, profileImage: null, lastSeen: null, isBot: false, isGuest: false },
    ];
    const friendships = [
      { id: 'f1', requesterId: testUserId, addresseeId: 'u-a', status: 'accepted' },
    ];
    (prisma.user.findMany as jest.Mock).mockResolvedValue(users);
    (prisma.friendship.findMany as jest.Mock).mockResolvedValue(friendships);
    const ack = jest.fn();
    await handlers['users:search']({ q: 'test' }, ack);
    const result = ack.mock.calls[0][0];
    expect(result.users).toHaveLength(2);
    const alice = result.users.find((u: any) => u.id === 'u-a');
    expect(alice.isFriend).toBe(true);
    expect(alice.friendship).toEqual(expect.objectContaining({ status: 'accepted' }));
    const bob = result.users.find((u: any) => u.id === 'u-b');
    expect(bob.isFriend).toBe(false);
    expect(bob.friendship).toBeNull();
    // Friends should sort first
    expect(result.users[0].id).toBe('u-a');
  });

  it('returns internal error on exception', async () => {
    (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['users:search']({ q: 'test' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

// ─── FRIENDS ────────────────────────────────────────────────────────────────

describe('friends:list', () => {
  it('returns accepted friends', async () => {
    const rows = [
      { id: 'f1', requesterId: testUserId, addresseeId: 'u2', updatedAt: new Date(), requester: { id: testUserId }, addressee: { id: 'u2', username: '@u2' } },
    ];
    (prisma.friendship.findMany as jest.Mock).mockResolvedValue(rows);
    const ack = jest.fn();
    await handlers['friends:list']({}, ack);
    const result = ack.mock.calls[0][0];
    expect(result.friends).toHaveLength(1);
    expect(result.friends[0].user.id).toBe('u2');
  });

  it('returns the other user (addressee side)', async () => {
    const rows = [
      { id: 'f1', requesterId: 'u2', addresseeId: testUserId, updatedAt: new Date(), requester: { id: 'u2', username: '@u2' }, addressee: { id: testUserId } },
    ];
    (prisma.friendship.findMany as jest.Mock).mockResolvedValue(rows);
    const ack = jest.fn();
    await handlers['friends:list']({}, ack);
    expect(ack.mock.calls[0][0].friends[0].user.id).toBe('u2');
  });

  it('returns internal error on exception', async () => {
    (prisma.friendship.findMany as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:list']({}, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

describe('friends:requests:incoming', () => {
  it('returns pending incoming requests', async () => {
    const rows = [
      { id: 'f1', createdAt: new Date(), requester: { id: 'u-other' } },
    ];
    (prisma.friendship.findMany as jest.Mock).mockResolvedValue(rows);
    const ack = jest.fn();
    await handlers['friends:requests:incoming']({}, ack);
    expect(ack.mock.calls[0][0].requests).toHaveLength(1);
    expect(ack.mock.calls[0][0].requests[0].user.id).toBe('u-other');
  });
});

describe('friends:requests:outgoing', () => {
  it('returns pending outgoing requests', async () => {
    const rows = [
      { id: 'f1', createdAt: new Date(), addressee: { id: 'u-other' } },
    ];
    (prisma.friendship.findMany as jest.Mock).mockResolvedValue(rows);
    const ack = jest.fn();
    await handlers['friends:requests:outgoing']({}, ack);
    expect(ack.mock.calls[0][0].requests).toHaveLength(1);
    expect(ack.mock.calls[0][0].requests[0].user.id).toBe('u-other');
  });
});

describe('friends:blocked', () => {
  it('returns blocked list', async () => {
    const rows = [
      { id: 'f1', createdAt: new Date(), addressee: { id: 'u-blocked' } },
    ];
    (prisma.friendship.findMany as jest.Mock).mockResolvedValue(rows);
    const ack = jest.fn();
    await handlers['friends:blocked']({}, ack);
    expect(ack.mock.calls[0][0].blocked).toHaveLength(1);
    expect(ack.mock.calls[0][0].blocked[0].user.id).toBe('u-blocked');
  });
});

describe('friends:search', () => {
  it('returns empty for short query', async () => {
    const ack = jest.fn();
    await handlers['friends:search']({ q: 'a' }, ack);
    expect(ack).toHaveBeenCalledWith({ users: [] });
  });

  it('searches and overlays friendship', async () => {
    const users = [{ id: 'u-x', username: '@x' }];
    (prisma.user.findMany as jest.Mock).mockResolvedValue(users);
    (prisma.friendship.findMany as jest.Mock).mockResolvedValue([]);
    const ack = jest.fn();
    await handlers['friends:search']({ q: 'test' }, ack);
    expect(ack.mock.calls[0][0].users[0].friendship).toBeNull();
  });

  it('returns internal error on exception', async () => {
    (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:search']({ q: 'test' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

describe('friends:request', () => {
  it('requires addresseeId', async () => {
    const ack = jest.fn();
    await handlers['friends:request']({}, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'addresseeId required' });
  });

  it('prevents self-add', async () => {
    const ack = jest.fn();
    await handlers['friends:request']({ addresseeId: testUserId }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Cannot add yourself' });
  });

  it('errors if already friends', async () => {
    (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({ status: 'accepted' });
    const ack = jest.fn();
    await handlers['friends:request']({ addresseeId: 'u-other' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Already friends' });
  });

  it('errors if blocked', async () => {
    (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({ status: 'blocked' });
    const ack = jest.fn();
    await handlers['friends:request']({ addresseeId: 'u-other' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Cannot send request' });
  });

  it('auto-accepts if reverse pending request exists', async () => {
    (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({
      id: 'f1', status: 'pending', requesterId: 'u-other', addresseeId: testUserId,
    });
    const updatedRow = { id: 'f1', status: 'accepted', requester: {}, addressee: {} };
    (prisma.friendship.update as jest.Mock).mockResolvedValue(updatedRow);
    const ack = jest.fn();
    await handlers['friends:request']({ addresseeId: 'u-other' }, ack);
    expect(ack).toHaveBeenCalledWith({ friendship: updatedRow, autoAccepted: true });
  });

  it('errors if request already sent', async () => {
    (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({
      id: 'f1', status: 'pending', requesterId: testUserId, addresseeId: 'u-other',
    });
    const ack = jest.fn();
    await handlers['friends:request']({ addresseeId: 'u-other' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Request already sent' });
  });

  it('creates a new pending request', async () => {
    (prisma.friendship.findFirst as jest.Mock).mockResolvedValue(null);
    const created = { id: 'f-new', requesterId: testUserId, addresseeId: 'u-other', status: 'pending' };
    (prisma.friendship.create as jest.Mock).mockResolvedValue(created);
    const ack = jest.fn();
    await handlers['friends:request']({ addresseeId: 'u-other' }, ack);
    expect(ack).toHaveBeenCalledWith({ friendship: created });
  });

  it('returns internal error on exception', async () => {
    (prisma.friendship.findFirst as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:request']({ addresseeId: 'u-other' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

describe('friends:accept', () => {
  it('errors if not found', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['friends:accept']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Request not found' });
  });

  it('errors if not authorised (not the addressee)', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({ addresseeId: 'someone-else', status: 'pending' });
    const ack = jest.fn();
    await handlers['friends:accept']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Not authorised' });
  });

  it('errors if not pending', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({ addresseeId: testUserId, status: 'accepted' });
    const ack = jest.fn();
    await handlers['friends:accept']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Request is not pending' });
  });

  it('accepts the request', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({ addresseeId: testUserId, status: 'pending' });
    const updated = { id: 'f1', status: 'accepted', requester: {}, addressee: {} };
    (prisma.friendship.update as jest.Mock).mockResolvedValue(updated);
    const ack = jest.fn();
    await handlers['friends:accept']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ friendship: updated });
  });
});

describe('friends:decline', () => {
  it('errors if not found', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['friends:decline']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Request not found' });
  });

  it('errors if not authorised', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({ requesterId: 'a', addresseeId: 'b' });
    const ack = jest.fn();
    await handlers['friends:decline']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Not authorised' });
  });

  it('deletes and succeeds for requester', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({ requesterId: testUserId, addresseeId: 'u-other' });
    (prisma.friendship.delete as jest.Mock).mockResolvedValue({});
    const ack = jest.fn();
    await handlers['friends:decline']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('deletes and succeeds for addressee', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({ requesterId: 'u-other', addresseeId: testUserId });
    (prisma.friendship.delete as jest.Mock).mockResolvedValue({});
    const ack = jest.fn();
    await handlers['friends:decline']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true });
  });
});

describe('friends:remove', () => {
  it('errors if not found', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['friends:remove']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Friendship not found' });
  });

  it('errors if not authorised', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({ requesterId: 'a', addresseeId: 'b' });
    const ack = jest.fn();
    await handlers['friends:remove']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Not authorised' });
  });

  it('removes friendship', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({ requesterId: testUserId, addresseeId: 'u-other' });
    (prisma.friendship.delete as jest.Mock).mockResolvedValue({});
    const ack = jest.fn();
    await handlers['friends:remove']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true });
  });
});

describe('friends:block', () => {
  it('prevents blocking yourself', async () => {
    const ack = jest.fn();
    await handlers['friends:block']({ targetUserId: testUserId }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Cannot block yourself' });
  });

  it('blocks a user', async () => {
    (prisma.friendship.deleteMany as jest.Mock).mockResolvedValue({});
    const created = { id: 'f-block', requesterId: testUserId, addresseeId: 'u-target', status: 'blocked', addressee: {} };
    (prisma.friendship.create as jest.Mock).mockResolvedValue(created);
    const ack = jest.fn();
    await handlers['friends:block']({ targetUserId: 'u-target' }, ack);
    expect(prisma.friendship.deleteMany).toHaveBeenCalled();
    expect(prisma.friendship.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'blocked' }),
    }));
    expect(invalidateConversationCache).toHaveBeenCalledWith(testUserId);
    expect(invalidateConversationCache).toHaveBeenCalledWith('u-target');
    expect(ack).toHaveBeenCalledWith({ friendship: created });
  });

  it('returns internal error on exception', async () => {
    (prisma.friendship.deleteMany as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:block']({ targetUserId: 'u-target' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

describe('friends:unblock', () => {
  it('unblocks a user', async () => {
    (prisma.friendship.deleteMany as jest.Mock).mockResolvedValue({});
    const ack = jest.fn();
    await handlers['friends:unblock']({ targetUserId: 'u-target' }, ack);
    expect(prisma.friendship.deleteMany).toHaveBeenCalledWith({
      where: { requesterId: testUserId, addresseeId: 'u-target', status: 'blocked' },
    });
    expect(invalidateConversationCache).toHaveBeenCalledWith(testUserId);
    expect(invalidateConversationCache).toHaveBeenCalledWith('u-target');
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('returns internal error on exception', async () => {
    (prisma.friendship.deleteMany as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:unblock']({ targetUserId: 'u-target' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

describe('friends:block-status', () => {
  it('returns not blocked', async () => {
    (prisma.friendship.findFirst as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['friends:block-status']({ targetUserId: 'u-target' }, ack);
    expect(ack).toHaveBeenCalledWith({ blocked: false });
  });

  it('returns blocked by me', async () => {
    (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({ requesterId: testUserId });
    const ack = jest.fn();
    await handlers['friends:block-status']({ targetUserId: 'u-target' }, ack);
    expect(ack).toHaveBeenCalledWith({ blocked: true, blockedByMe: true });
  });

  it('returns blocked by other', async () => {
    (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({ requesterId: 'u-target' });
    const ack = jest.fn();
    await handlers['friends:block-status']({ targetUserId: 'u-target' }, ack);
    expect(ack).toHaveBeenCalledWith({ blocked: true, blockedByMe: false });
  });

  it('returns internal error on exception', async () => {
    (prisma.friendship.findFirst as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:block-status']({ targetUserId: 'u-target' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

// ─── GROUPS ─────────────────────────────────────────────────────────────────

describe('groups:list', () => {
  it('returns groups the user belongs to', async () => {
    const memberships = [
      {
        group: {
          id: 'g1', name: 'Group 1', summary: 'sum', summaryMessageCount: 5, summaryGeneratedAt: null,
          members: [{ userId: testUserId, user: { id: testUserId } }],
          messages: [{ id: 'm1', content: 'hi', createdAt: new Date(), sender: { displayName: 'A' } }],
        },
      },
    ];
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue(memberships);
    const ack = jest.fn();
    await handlers['groups:list']({}, ack);
    const result = ack.mock.calls[0][0];
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].id).toBe('g1');
    expect(result.groups[0].lastMessage.id).toBe('m1');
    expect(maybeRegenerateGroupSummary).toHaveBeenCalled();
  });

  it('handles groups with no messages', async () => {
    const memberships = [
      {
        group: {
          id: 'g2', name: 'Empty', summary: null, summaryMessageCount: 0, summaryGeneratedAt: null,
          members: [], messages: [],
        },
      },
    ];
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue(memberships);
    const ack = jest.fn();
    await handlers['groups:list']({}, ack);
    expect(ack.mock.calls[0][0].groups[0].lastMessage).toBeNull();
  });

  it('returns internal error on exception', async () => {
    (prisma.groupMember.findMany as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:list']({}, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

describe('groups:invites', () => {
  it('returns pending invites', async () => {
    const memberships = [
      { groupId: 'g1', invitedBy: 'u-inv', group: { name: 'G', description: 'D', members: [{ userId: 'u1' }] } },
    ];
    const inviters = [{ id: 'u-inv', displayName: 'Inviter', username: '@inv' }];
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue(memberships);
    (prisma.user.findMany as jest.Mock).mockResolvedValue(inviters);
    const ack = jest.fn();
    await handlers['groups:invites']({}, ack);
    const result = ack.mock.calls[0][0];
    expect(result.invites).toHaveLength(1);
    expect(result.invites[0].invitedBy).toBe('Inviter');
    expect(result.invites[0].memberCount).toBe(1);
  });

  it('handles invite with no invitedBy', async () => {
    const memberships = [
      { groupId: 'g1', invitedBy: null, group: { name: 'G', description: null, members: [] } },
    ];
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue(memberships);
    const ack = jest.fn();
    await handlers['groups:invites']({}, ack);
    expect(ack.mock.calls[0][0].invites[0].invitedBy).toBe('Someone');
  });

  it('uses username when displayName is missing', async () => {
    const memberships = [
      { groupId: 'g1', invitedBy: 'u-inv', group: { name: 'G', description: null, members: [] } },
    ];
    const inviters = [{ id: 'u-inv', displayName: null, username: '@inv' }];
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue(memberships);
    (prisma.user.findMany as jest.Mock).mockResolvedValue(inviters);
    const ack = jest.fn();
    await handlers['groups:invites']({}, ack);
    expect(ack.mock.calls[0][0].invites[0].invitedBy).toBe('inv');
  });
});

describe('groups:detail', () => {
  it('returns error if group not found', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['groups:detail']({ groupId: 'g-nope' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Group not found' });
  });

  it('returns error if not a member', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({ id: 'g1', members: [] });
    const ack = jest.fn();
    await handlers['groups:detail']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Not a member' });
  });

  it('returns group detail with memberStatus', async () => {
    const group = { id: 'g1', name: 'G', members: [{ userId: testUserId, status: 'accepted', user: {} }] };
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(group);
    const ack = jest.fn();
    await handlers['groups:detail']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ group, memberStatus: 'accepted' });
  });
});

describe('groups:create', () => {
  it('requires a group name', async () => {
    const ack = jest.fn();
    await handlers['groups:create']({ name: '' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Group name is required' });
  });

  it('requires a non-whitespace group name', async () => {
    const ack = jest.fn();
    await handlers['groups:create']({ name: '   ' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Group name is required' });
  });

  it('creates group and emits events', async () => {
    const group = {
      id: 'g-new', name: 'New Group',
      members: [
        { userId: testUserId, status: 'accepted', user: { id: testUserId, displayName: 'Me', username: '@me' } },
        { userId: 'u-other', status: 'pending', user: { id: 'u-other', displayName: 'Other', username: '@other' } },
      ],
    };
    (prisma.group.create as jest.Mock).mockResolvedValue(group);
    const ack = jest.fn();
    await handlers['groups:create']({ name: 'New Group', memberIds: ['u-other'] }, ack);
    expect(mockTo).toHaveBeenCalledWith(`user:${testUserId}`);
    expect(mockEmit).toHaveBeenCalledWith('group:created', expect.any(Object));
    expect(mockTo).toHaveBeenCalledWith('user:u-other');
    expect(mockEmit).toHaveBeenCalledWith('group:invite', expect.objectContaining({ groupId: 'g-new' }));
    const ackResult = ack.mock.calls[0][0];
    expect(ackResult.group.members).toHaveLength(1);
  });

  it('creates group without extra members', async () => {
    const group = {
      id: 'g-solo', name: 'Solo',
      members: [{ userId: testUserId, status: 'accepted', user: { id: testUserId, displayName: 'Me', username: '@me' } }],
    };
    (prisma.group.create as jest.Mock).mockResolvedValue(group);
    const ack = jest.fn();
    await handlers['groups:create']({ name: 'Solo' }, ack);
    expect(ack.mock.calls[0][0].group.id).toBe('g-solo');
  });
});

describe('groups:update', () => {
  it('errors if not admin', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ role: 'member' });
    const ack = jest.fn();
    await handlers['groups:update']({ groupId: 'g1', name: 'X' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Only admins can edit' });
  });

  it('updates group and broadcasts', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ role: 'admin' });
    const updated = { id: 'g1', name: 'Updated', members: [{ userId: 'u-m1', user: {} }] };
    (prisma.group.update as jest.Mock).mockResolvedValue(updated);
    const ack = jest.fn();
    await handlers['groups:update']({ groupId: 'g1', name: 'Updated' }, ack);
    expect(mockTo).toHaveBeenCalledWith('user:u-m1');
    expect(mockEmit).toHaveBeenCalledWith('group:updated', { group: updated });
    expect(ack).toHaveBeenCalledWith({ group: updated });
  });

  it('allows owner to update', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ role: 'owner' });
    const updated = { id: 'g1', name: 'Updated', members: [] };
    (prisma.group.update as jest.Mock).mockResolvedValue(updated);
    const ack = jest.fn();
    await handlers['groups:update']({ groupId: 'g1', name: 'Updated' }, ack);
    expect(ack).toHaveBeenCalledWith({ group: updated });
  });
});

describe('groups:accept', () => {
  it('errors if no invite found', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['groups:accept']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Invite not found' });
  });

  it('errors if already a member', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'accepted' });
    const ack = jest.fn();
    await handlers['groups:accept']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Already a member' });
  });

  it('accepts invite and emits events', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'pending', invitedBy: 'u-inv' });
    (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
    const group = {
      id: 'g1', name: 'G',
      members: [
        { userId: testUserId, role: 'member', user: { id: testUserId, displayName: 'Me' }, id: 'gm1' },
        { userId: 'u-other', role: 'admin', user: { id: 'u-other' }, id: 'gm2' },
      ],
    };
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(group);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ displayName: 'Me', username: '@me' });
    // Mock for sendSystemMessage internals
    (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ userId: 'u-owner' });
    (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sm1', createdAt: new Date() });
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }, { userId: 'u-other' }]);

    const ack = jest.fn();
    await handlers['groups:accept']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ group });
    expect(mockTo).toHaveBeenCalledWith(`user:${testUserId}`);
    expect(mockEmit).toHaveBeenCalledWith('group:created', { group });
    expect(mockTo).toHaveBeenCalledWith('user:u-other');
    expect(mockEmit).toHaveBeenCalledWith('group:memberJoined', expect.objectContaining({ groupId: 'g1', userId: testUserId }));
    expect(mockTo).toHaveBeenCalledWith('user:u-inv');
    expect(mockEmit).toHaveBeenCalledWith('group:inviteAccepted', expect.objectContaining({ groupId: 'g1' }));
  });

  it('errors if group not found after accepting', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'pending', invitedBy: null });
    (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['groups:accept']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Group not found' });
  });
});

describe('groups:decline', () => {
  it('errors if invite not found', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['groups:decline']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Invite not found' });
  });

  it('errors if already a member (should use leave)', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'accepted' });
    const ack = jest.fn();
    await handlers['groups:decline']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Already a member — use leave' });
  });

  it('declines invite and notifies inviter', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'pending', invitedBy: 'u-inv' });
    (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({ name: 'MyGroup' });
    const ack = jest.fn();
    await handlers['groups:decline']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true });
    expect(mockTo).toHaveBeenCalledWith('user:u-inv');
    expect(mockEmit).toHaveBeenCalledWith('group:inviteDeclined', expect.objectContaining({ groupId: 'g1', groupName: 'MyGroup' }));
  });

  it('declines without notifying if no inviter', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ status: 'pending', invitedBy: null });
    (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});
    const ack = jest.fn();
    await handlers['groups:decline']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true });
    expect(mockTo).not.toHaveBeenCalled();
  });
});

describe('groups:members:add', () => {
  it('errors if group not found', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['groups:members:add']({ groupId: 'g1', memberId: 'u-new' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Group not found' });
  });

  it('errors if not admin', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({ id: 'g1' });
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ role: 'member' });
    const ack = jest.fn();
    await handlers['groups:members:add']({ groupId: 'g1', memberId: 'u-new' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Only admins can add members' });
  });

  it('adds member and sends invite', async () => {
    (prisma.group.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'g1' })
      .mockResolvedValueOnce({ id: 'g1', name: 'G', members: [{ userId: testUserId }] });
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ role: 'admin' });
    (prisma.groupMember.create as jest.Mock).mockResolvedValue({});
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ displayName: 'Adder', username: '@adder' });
    const ack = jest.fn();
    await handlers['groups:members:add']({ groupId: 'g1', memberId: 'u-new' }, ack);
    expect(prisma.groupMember.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'u-new', groupId: 'g1', status: 'pending' }),
    }));
    expect(mockTo).toHaveBeenCalledWith('user:u-new');
    expect(mockEmit).toHaveBeenCalledWith('group:invite', expect.objectContaining({ groupId: 'g1' }));
    expect(ack.mock.calls[0][0].group).toBeDefined();
  });

  it('handles unique constraint violation (already a member)', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({ id: 'g1' });
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ role: 'owner' });
    const err = new Error('unique') as any;
    err.code = 'P2002';
    (prisma.groupMember.create as jest.Mock).mockRejectedValue(err);
    const ack = jest.fn();
    await handlers['groups:members:add']({ groupId: 'g1', memberId: 'u-dup' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'User is already a member' });
  });
});

describe('groups:members:remove', () => {
  const makeGroup = (members: any[]) => ({
    id: 'g1',
    members: members.map(m => ({
      userId: m.userId, role: m.role, status: m.status ?? 'accepted',
      user: { displayName: m.displayName ?? null, username: m.username ?? '@u' },
    })),
  });

  it('errors if group not found', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['groups:members:remove']({ groupId: 'g1', memberId: 'u-x' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Group not found' });
  });

  it('errors if member not found', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(makeGroup([{ userId: testUserId, role: 'owner' }]));
    const ack = jest.fn();
    await handlers['groups:members:remove']({ groupId: 'g1', memberId: 'u-ghost' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Member not found' });
  });

  it('errors if non-admin tries to remove another member', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(makeGroup([
      { userId: testUserId, role: 'member' },
      { userId: 'u-target', role: 'member' },
    ]));
    const ack = jest.fn();
    await handlers['groups:members:remove']({ groupId: 'g1', memberId: 'u-target' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Only admins can remove members' });
  });

  it('errors if trying to remove an owner', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(makeGroup([
      { userId: testUserId, role: 'admin' },
      { userId: 'u-target', role: 'owner' },
    ]));
    const ack = jest.fn();
    await handlers['groups:members:remove']({ groupId: 'g1', memberId: 'u-target' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Cannot remove an owner' });
  });

  it('errors if admin tries to remove another admin', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(makeGroup([
      { userId: testUserId, role: 'admin' },
      { userId: 'u-target', role: 'admin' },
    ]));
    const ack = jest.fn();
    await handlers['groups:members:remove']({ groupId: 'g1', memberId: 'u-target' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Only owners can remove admins' });
  });

  it('owner can remove admin', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(makeGroup([
      { userId: testUserId, role: 'owner' },
      { userId: 'u-target', role: 'admin', displayName: 'Target' },
    ]));
    (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }]);
    // sendSystemMessage mocks
    (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ userId: testUserId });
    (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sm1', createdAt: new Date() });

    const ack = jest.fn();
    await handlers['groups:members:remove']({ groupId: 'g1', memberId: 'u-target' }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true });
    expect(mockTo).toHaveBeenCalledWith('user:u-target');
    expect(mockEmit).toHaveBeenCalledWith('group:removed', { groupId: 'g1' });
  });

  it('allows self-removal', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(makeGroup([
      { userId: testUserId, role: 'member', displayName: 'Me' },
      { userId: 'u-other', role: 'owner' },
    ]));
    (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: 'u-other' }]);
    (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ userId: 'u-other' });
    (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sm1', createdAt: new Date() });

    const ack = jest.fn();
    await handlers['groups:members:remove']({ groupId: 'g1', memberId: testUserId }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('skips system message for pending members', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(makeGroup([
      { userId: testUserId, role: 'owner' },
      { userId: 'u-pending', role: 'member', status: 'pending' },
    ]));
    (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }]);

    const ack = jest.fn();
    await handlers['groups:members:remove']({ groupId: 'g1', memberId: 'u-pending' }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true });
    expect(prisma.groupMessage.create).not.toHaveBeenCalled();
  });
});

describe('groups:members:promote', () => {
  it('errors if not admin', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ role: 'member' });
    const ack = jest.fn();
    await handlers['groups:members:promote']({ groupId: 'g1', memberId: 'u-x' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Only admins can promote' });
  });

  it('errors if target not found', async () => {
    (prisma.groupMember.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'owner' }) // isGroupAdmin
      .mockResolvedValueOnce(null); // target lookup
    const ack = jest.fn();
    await handlers['groups:members:promote']({ groupId: 'g1', memberId: 'u-ghost' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Member not found' });
  });

  it('promotes member and broadcasts', async () => {
    (prisma.groupMember.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'owner' })
      .mockResolvedValueOnce({ id: 'gm-t', role: 'member' });
    (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }, { userId: 'u-t' }]);
    const ack = jest.fn();
    await handlers['groups:members:promote']({ groupId: 'g1', memberId: 'u-t' }, ack);
    expect(prisma.groupMember.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { role: 'admin' },
    }));
    expect(ack).toHaveBeenCalledWith({ success: true });
    expect(mockEmit).toHaveBeenCalledWith('group:memberPromoted', expect.objectContaining({ groupId: 'g1', memberId: 'u-t' }));
  });
});

describe('groups:members:demote', () => {
  it('errors if not owner and trying to demote someone else', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ role: 'admin' }); // isGroupOwner returns false
    const ack = jest.fn();
    await handlers['groups:members:demote']({ groupId: 'g1', memberId: 'u-other' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Only owners can demote' });
  });

  it('errors if target not found', async () => {
    (prisma.groupMember.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'owner' }) // isGroupOwner
      .mockResolvedValueOnce(null);
    const ack = jest.fn();
    await handlers['groups:members:demote']({ groupId: 'g1', memberId: 'u-ghost' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Member not found' });
  });

  it('errors if trying to demote an owner', async () => {
    (prisma.groupMember.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'owner' })
      .mockResolvedValueOnce({ id: 'gm-t', role: 'owner' });
    const ack = jest.fn();
    await handlers['groups:members:demote']({ groupId: 'g1', memberId: 'u-t' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Cannot demote an owner' });
  });

  it('demotes admin to member and broadcasts', async () => {
    (prisma.groupMember.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'owner' })
      .mockResolvedValueOnce({ id: 'gm-t', role: 'admin' });
    (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }, { userId: 'u-t' }]);
    const ack = jest.fn();
    await handlers['groups:members:demote']({ groupId: 'g1', memberId: 'u-t' }, ack);
    expect(prisma.groupMember.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { role: 'member' },
    }));
    expect(ack).toHaveBeenCalledWith({ success: true });
    expect(mockEmit).toHaveBeenCalledWith('group:memberDemoted', expect.objectContaining({ groupId: 'g1', memberId: 'u-t' }));
  });

  it('allows admin to self-demote', async () => {
    // isGroupOwner returns false (not owner), but memberId === userId so allowed
    (prisma.groupMember.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'admin' }) // isGroupOwner check
      .mockResolvedValueOnce({ id: 'gm-me', role: 'admin' }); // target lookup
    (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }]);
    const ack = jest.fn();
    await handlers['groups:members:demote']({ groupId: 'g1', memberId: testUserId }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true });
  });
});

describe('groups:leave', () => {
  const makeGroup = (members: any[]) => ({
    id: 'g1', name: 'G',
    members: members.map(m => ({
      userId: m.userId, role: m.role,
      user: { displayName: m.displayName ?? null, username: m.username ?? '@u' },
    })),
  });

  it('errors if group not found', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['groups:leave']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Group not found' });
  });

  it('deletes group if last member', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(makeGroup([{ userId: testUserId, role: 'owner' }]));
    (prisma.group.delete as jest.Mock).mockResolvedValue({});
    const ack = jest.fn();
    await handlers['groups:leave']({ groupId: 'g1' }, ack);
    expect(prisma.group.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
    expect(mockTo).toHaveBeenCalledWith(`user:${testUserId}`);
    expect(mockEmit).toHaveBeenCalledWith('group:deleted', expect.objectContaining({ groupId: 'g1' }));
    expect(ack).toHaveBeenCalledWith({ success: true, deleted: true });
  });

  it('promotes next owner when sole owner leaves', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(makeGroup([
      { userId: testUserId, role: 'owner', displayName: 'Leaver' },
      { userId: 'u-admin', role: 'admin' },
    ]));
    // promoteNextOwner mocks
    (prisma.groupMember.findFirst as jest.Mock)
      .mockResolvedValueOnce(null) // no remaining owner
      .mockResolvedValueOnce({ id: 'gm-admin', userId: 'u-admin' }); // next candidate
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);
    (prisma.groupMember.deleteMany as jest.Mock).mockResolvedValue({});
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: 'u-admin' }]);
    // sendSystemMessage mocks
    (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sm1', createdAt: new Date() });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const ack = jest.fn();
    await handlers['groups:leave']({ groupId: 'g1' }, ack);
    expect(mockEmit).toHaveBeenCalledWith('group:ownerChanged', expect.objectContaining({ groupId: 'g1', newOwnerId: 'u-admin' }));
    expect(ack).toHaveBeenCalledWith({ success: true, deleted: false });
  });

  it('leaves normally when other owners exist', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(makeGroup([
      { userId: testUserId, role: 'owner', displayName: 'Leaver' },
      { userId: 'u-other-owner', role: 'owner' },
      { userId: 'u-member', role: 'member' },
    ]));
    (prisma.groupMember.deleteMany as jest.Mock).mockResolvedValue({});
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: 'u-other-owner' }, { userId: 'u-member' }]);
    (prisma.groupMember.findFirst as jest.Mock).mockResolvedValue({ userId: 'u-other-owner' });
    (prisma.groupMessage.create as jest.Mock).mockResolvedValue({ id: 'sm1', createdAt: new Date() });

    const ack = jest.fn();
    await handlers['groups:leave']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true, deleted: false });
    expect(mockEmit).toHaveBeenCalledWith('group:removed', { groupId: 'g1' });
    expect(mockEmit).toHaveBeenCalledWith('group:memberLeft', { groupId: 'g1', memberId: testUserId });
  });
});

describe('groups:delete', () => {
  it('errors if group not found', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['groups:delete']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Group not found' });
  });

  it('errors if not owner', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({
      id: 'g1', name: 'G', members: [{ userId: testUserId, role: 'admin' }],
    });
    const ack = jest.fn();
    await handlers['groups:delete']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Only owners can delete' });
  });

  it('deletes group and notifies all members', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({
      id: 'g1', name: 'G', members: [
        { userId: testUserId, role: 'owner' },
        { userId: 'u-m1' },
      ],
    });
    (prisma.group.delete as jest.Mock).mockResolvedValue({});
    const ack = jest.fn();
    await handlers['groups:delete']({ groupId: 'g1' }, ack);
    expect(mockTo).toHaveBeenCalledWith(`user:${testUserId}`);
    expect(mockTo).toHaveBeenCalledWith('user:u-m1');
    expect(mockEmit).toHaveBeenCalledWith('group:deleted', { groupId: 'g1', groupName: 'G' });
    expect(prisma.group.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
    expect(ack).toHaveBeenCalledWith({ success: true });
  });
});

describe('groups:transfer-ownership', () => {
  it('requires newOwnerId', async () => {
    const ack = jest.fn();
    await handlers['groups:transfer-ownership']({ groupId: 'g1', newOwnerId: '' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'newOwnerId is required' });
  });

  it('errors if not owner', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ role: 'admin' });
    const ack = jest.fn();
    await handlers['groups:transfer-ownership']({ groupId: 'g1', newOwnerId: 'u-new' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Only owners can transfer' });
  });

  it('errors if target not found', async () => {
    (prisma.groupMember.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'owner' })
      .mockResolvedValueOnce(null);
    const ack = jest.fn();
    await handlers['groups:transfer-ownership']({ groupId: 'g1', newOwnerId: 'u-ghost' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Member not found' });
  });

  it('errors if target is already owner', async () => {
    (prisma.groupMember.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'owner' })
      .mockResolvedValueOnce({ id: 'gm-t', role: 'owner' });
    const ack = jest.fn();
    await handlers['groups:transfer-ownership']({ groupId: 'g1', newOwnerId: 'u-co' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Already an owner' });
  });

  it('errors if target is not admin', async () => {
    (prisma.groupMember.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'owner' })
      .mockResolvedValueOnce({ id: 'gm-t', role: 'member' });
    const ack = jest.fn();
    await handlers['groups:transfer-ownership']({ groupId: 'g1', newOwnerId: 'u-m' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Only admins can be promoted to owner' });
  });

  it('transfers ownership and broadcasts', async () => {
    (prisma.groupMember.findUnique as jest.Mock)
      .mockResolvedValueOnce({ role: 'owner' })
      .mockResolvedValueOnce({ id: 'gm-t', role: 'admin' });
    (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([{ userId: testUserId }, { userId: 'u-new' }]);
    const ack = jest.fn();
    await handlers['groups:transfer-ownership']({ groupId: 'g1', newOwnerId: 'u-new' }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true });
    expect(mockEmit).toHaveBeenCalledWith('group:ownershipTransferred', { groupId: 'g1', newOwnerId: 'u-new' });
  });
});

describe('groups:step-down', () => {
  it('errors if not owner', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ role: 'admin' });
    const ack = jest.fn();
    await handlers['groups:step-down']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Only owners can step down' });
  });

  it('errors if caller not found', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['groups:step-down']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Only owners can step down' });
  });

  it('errors if sole owner', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ id: 'gm-me', role: 'owner' });
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([]);
    const ack = jest.fn();
    await handlers['groups:step-down']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'You are the only owner. Promote another member first.' });
  });

  it('steps down to admin and broadcasts', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ id: 'gm-me', role: 'owner' });
    (prisma.groupMember.findMany as jest.Mock)
      .mockResolvedValueOnce([{ userId: 'u-co-owner' }]) // other owners check
      .mockResolvedValueOnce([{ userId: testUserId }, { userId: 'u-co-owner' }]); // broadcast members
    (prisma.groupMember.update as jest.Mock).mockResolvedValue({});
    const ack = jest.fn();
    await handlers['groups:step-down']({ groupId: 'g1' }, ack);
    expect(prisma.groupMember.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { role: 'admin' },
    }));
    expect(ack).toHaveBeenCalledWith({ success: true });
    expect(mockEmit).toHaveBeenCalledWith('group:ownerSteppedDown', { groupId: 'g1', userId: testUserId });
  });
});

// ─── CONVERSATIONS ──────────────────────────────────────────────────────────

describe('conversations:request', () => {
  it('returns conversations', async () => {
    const result = { conversations: [{ id: 'c1' }] };
    (getConversations as jest.Mock).mockResolvedValue(result);
    const ack = jest.fn();
    await handlers['conversations:request']({}, ack);
    expect(ack).toHaveBeenCalledWith(result);
  });

  it('returns internal error on exception', async () => {
    (getConversations as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['conversations:request']({}, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

describe('conversation:accept', () => {
  it('errors if not found/authorised', async () => {
    (acceptConversation as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['conversation:accept']({ conversationId: 'c1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Not authorised or not found' });
  });

  it('accepts conversation and emits events', async () => {
    const conv = { id: 'c1', participantA: 'u-a', participantB: 'u-b', initiatorId: 'u-a' };
    (acceptConversation as jest.Mock).mockResolvedValue(conv);
    const ack = jest.fn();
    await handlers['conversation:accept']({ conversationId: 'c1' }, ack);
    expect(invalidateConversationCache).toHaveBeenCalledWith('u-a');
    expect(invalidateConversationCache).toHaveBeenCalledWith('u-b');
    expect(mockTo).toHaveBeenCalledWith('user:u-a');
    expect(mockEmit).toHaveBeenCalledWith('conversation:accepted', { conversationId: 'c1', acceptedBy: testUserId });
    expect(ack).toHaveBeenCalledWith({ conversation: conv });
  });

  it('returns internal error on exception', async () => {
    (acceptConversation as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['conversation:accept']({ conversationId: 'c1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

describe('conversation:decline', () => {
  it('errors if not found/authorised', async () => {
    (declineConversation as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['conversation:decline']({ conversationId: 'c1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Not authorised or not found' });
  });

  it('declines conversation and emits events', async () => {
    const result = { id: 'c1', participantA: 'u-a', participantB: 'u-b', initiatorId: 'u-a' };
    (declineConversation as jest.Mock).mockResolvedValue(result);
    const ack = jest.fn();
    await handlers['conversation:decline']({ conversationId: 'c1' }, ack);
    expect(invalidateConversationCache).toHaveBeenCalledWith('u-a');
    expect(invalidateConversationCache).toHaveBeenCalledWith('u-b');
    expect(mockTo).toHaveBeenCalledWith('user:u-a');
    expect(mockEmit).toHaveBeenCalledWith('conversation:declined', expect.objectContaining({ conversationId: 'c1' }));
    expect(ack).toHaveBeenCalledWith({ success: true });
  });
});

describe('conversation:nuke', () => {
  it('errors if not found/authorised', async () => {
    (nukeConversation as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['conversation:nuke']({ conversationId: 'c1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Not authorised or not found' });
  });

  it('nukes conversation, emits events, and cleans up guests', async () => {
    const result = { id: 'c1', participantA: 'u-a', participantB: 'u-b' };
    (nukeConversation as jest.Mock).mockResolvedValue(result);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'u-b' }]);
    const ack = jest.fn();
    await handlers['conversation:nuke']({ conversationId: 'c1' }, ack);
    expect(invalidateConversationCache).toHaveBeenCalledWith('u-a');
    expect(invalidateConversationCache).toHaveBeenCalledWith('u-b');
    expect(mockTo).toHaveBeenCalledWith('user:u-a');
    expect(mockTo).toHaveBeenCalledWith('user:u-b');
    expect(mockEmit).toHaveBeenCalledWith('conversation:declined', expect.objectContaining({ conversationId: 'c1' }));
    expect(deleteGuestUser).toHaveBeenCalledWith('u-b');
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('handles no guests', async () => {
    (nukeConversation as jest.Mock).mockResolvedValue({ id: 'c1', participantA: 'u-a', participantB: 'u-b' });
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    const ack = jest.fn();
    await handlers['conversation:nuke']({ conversationId: 'c1' }, ack);
    expect(deleteGuestUser).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({ success: true });
  });
});

describe('conversation:nuke-by-user', () => {
  it('errors if nuke fails', async () => {
    (nukeByParticipants as jest.Mock).mockResolvedValue(null);
    const ack = jest.fn();
    await handlers['conversation:nuke-by-user']({ recipientId: 'u-other' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Failed to nuke' });
  });

  it('nukes by user and cleans up guests', async () => {
    const result = { participantA: testUserId, participantB: 'u-other' };
    (nukeByParticipants as jest.Mock).mockResolvedValue(result);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'u-other' }]);
    const ack = jest.fn();
    await handlers['conversation:nuke-by-user']({ recipientId: 'u-other' }, ack);
    expect(invalidateConversationCache).toHaveBeenCalledWith(testUserId);
    expect(invalidateConversationCache).toHaveBeenCalledWith('u-other');
    expect(mockTo).toHaveBeenCalledWith(`user:${testUserId}`);
    expect(mockTo).toHaveBeenCalledWith('user:u-other');
    expect(mockEmit).toHaveBeenCalledWith('conversation:declined', expect.objectContaining({ conversationId: null }));
    expect(deleteGuestUser).toHaveBeenCalledWith('u-other');
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('returns internal error on exception', async () => {
    (nukeByParticipants as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['conversation:nuke-by-user']({ recipientId: 'u-other' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

// ─── Coverage: line 183 (sort comparator for same friendship status) ────────

describe('users:search - sort by name when same status', () => {
  it('sorts alphabetically when both users are non-friends', async () => {
    const users = [
      { id: 'u-z', username: '@zoe', displayName: 'Zoe', firstName: null, lastName: null, profileImage: null, lastSeen: null, isBot: false, isGuest: false },
      { id: 'u-a', username: '@alice', displayName: 'Alice', firstName: null, lastName: null, profileImage: null, lastSeen: null, isBot: false, isGuest: false },
    ];
    (prisma.user.findMany as jest.Mock).mockResolvedValue(users);
    (prisma.friendship.findMany as jest.Mock).mockResolvedValue([]);
    const ack = jest.fn();
    await handlers['users:search']({ q: 'test' }, ack);
    const result = ack.mock.calls[0][0].users;
    expect(result[0].displayName).toBe('Alice');
    expect(result[1].displayName).toBe('Zoe');
  });
});

// ─── Coverage: lines 268-269 (friends:search with friendships) ─────────────

describe('friends:search - friendship overlay', () => {
  it('overlays friendship data from fsMap', async () => {
    const users = [{ id: 'u-fr', username: '@friend', displayName: 'Friend', firstName: null, lastName: null, profileImage: null, email: 'f@f.com', privacyOnlineStatus: 'everyone' }];
    (prisma.user.findMany as jest.Mock).mockResolvedValue(users);
    (prisma.friendship.findMany as jest.Mock).mockResolvedValue([
      { id: 'f1', requesterId: testUserId, addresseeId: 'u-fr', status: 'accepted' },
    ]);
    const ack = jest.fn();
    await handlers['friends:search']({ q: 'friend' }, ack);
    const result = ack.mock.calls[0][0].users;
    expect(result[0].friendship).toEqual(expect.objectContaining({ id: 'f1', status: 'accepted', iRequested: true }));
  });
});

// ─── Coverage: line 39 (sendSystemMessage catch) ───────────────────────────

describe('sendSystemMessage failure', () => {
  it('handles sendSystemMessage failure gracefully during member removal', async () => {
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({
      id: 'g1',
      members: [
        { userId: testUserId, role: 'owner', status: 'accepted', user: { displayName: 'Owner', username: '@owner' } },
        { userId: 'u-target', role: 'member', status: 'accepted', user: { displayName: 'Target', username: '@target' } },
      ],
    });
    (prisma.groupMember.delete as jest.Mock).mockResolvedValue({});
    (prisma.groupMember.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.groupMember.findFirst as jest.Mock).mockRejectedValue(new Error('DB fail'));

    const ack = jest.fn();
    await handlers['groups:members:remove']({ groupId: 'g1', memberId: 'u-target' }, ack);
    expect(ack).toHaveBeenCalledWith({ success: true });
  });
});

// ─── Coverage: uncovered catch blocks ──────────────────────────────────────

describe('uncovered error catch blocks', () => {
  it('friends:requests:incoming returns internal error on exception', async () => {
    (prisma.friendship.findMany as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:requests:incoming']({}, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('friends:requests:outgoing returns internal error on exception', async () => {
    (prisma.friendship.findMany as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:requests:outgoing']({}, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('friends:blocked returns internal error on exception', async () => {
    (prisma.friendship.findMany as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:blocked']({}, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('friends:accept returns internal error on exception', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:accept']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('friends:decline returns internal error on exception', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:decline']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('friends:remove returns internal error on exception', async () => {
    (prisma.friendship.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['friends:remove']({ friendshipId: 'f1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:invites returns internal error on exception', async () => {
    (prisma.groupMember.findMany as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:invites']({}, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:detail returns internal error on exception', async () => {
    (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:detail']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:create returns internal error on exception', async () => {
    (prisma.group.create as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:create']({ name: 'G' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:update returns internal error on exception', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockResolvedValue({ role: 'owner' });
    (prisma.group.update as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:update']({ groupId: 'g1', name: 'X' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:accept returns internal error on exception', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:accept']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:decline returns internal error on exception', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:decline']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:members:add returns internal error on non-P2002 exception', async () => {
    (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:members:add']({ groupId: 'g1', memberId: 'u-new' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:members:remove returns internal error on exception', async () => {
    (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:members:remove']({ groupId: 'g1', memberId: 'u-x' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:members:promote returns internal error on exception', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:members:promote']({ groupId: 'g1', memberId: 'u-x' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:members:demote returns internal error on exception', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:members:demote']({ groupId: 'g1', memberId: 'u-x' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:leave returns internal error on exception', async () => {
    (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:leave']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:delete returns internal error on exception', async () => {
    (prisma.group.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:delete']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:transfer-ownership returns internal error on exception', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:transfer-ownership']({ groupId: 'g1', newOwnerId: 'u-new' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('groups:step-down returns internal error on exception', async () => {
    (prisma.groupMember.findUnique as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['groups:step-down']({ groupId: 'g1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('conversation:decline returns internal error on exception', async () => {
    (declineConversation as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['conversation:decline']({ conversationId: 'c1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('conversation:nuke returns internal error on exception', async () => {
    (nukeConversation as jest.Mock).mockRejectedValue(new Error('db'));
    const ack = jest.fn();
    await handlers['conversation:nuke']({ conversationId: 'c1' }, ack);
    expect(ack).toHaveBeenCalledWith({ error: 'Internal error' });
  });
});

// ─── Handler registration ───────────────────────────────────────────────────

describe('registerRPCHandlers', () => {
  it('registers all expected events', () => {
    const expectedEvents = [
      'users:me', 'users:me:update', 'users:me:settings', 'users:list', 'users:search',
      'friends:list', 'friends:requests:incoming', 'friends:requests:outgoing',
      'friends:blocked', 'friends:search', 'friends:request', 'friends:accept',
      'friends:decline', 'friends:remove', 'friends:block', 'friends:unblock', 'friends:block-status',
      'groups:list', 'groups:invites', 'groups:detail', 'groups:create', 'groups:update',
      'groups:accept', 'groups:decline', 'groups:members:add', 'groups:members:remove',
      'groups:members:promote', 'groups:members:demote', 'groups:leave', 'groups:delete',
      'groups:transfer-ownership', 'groups:step-down',
      'conversations:request', 'conversation:accept', 'conversation:decline',
      'conversation:nuke', 'conversation:nuke-by-user',
    ];
    for (const event of expectedEvents) {
      expect(handlers[event]).toBeDefined();
      expect(typeof handlers[event]).toBe('function');
    }
  });
});
