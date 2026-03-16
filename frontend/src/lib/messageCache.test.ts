import type { Message } from '@/components/MessageBubble';
import type { CachedMessage } from './db';

const mockWhere = jest.fn();
const mockEquals = jest.fn();
const mockSortBy = jest.fn();
const mockBulkPut = jest.fn();
const mockPut = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockGet = jest.fn();

jest.mock('./db', () => ({
  db: {
    cachedMessages: {
      where: (...args: any[]) => {
        mockWhere(...args);
        return {
          equals: (...a2: any[]) => {
            mockEquals(...a2);
            return { sortBy: (...a3: any[]) => mockSortBy(...a3), delete: (...a3: any[]) => mockDelete(...a3) };
          },
        };
      },
      bulkPut: (...args: any[]) => mockBulkPut(...args),
      put: (...args: any[]) => mockPut(...args),
      update: (...args: any[]) => mockUpdate(...args),
      delete: (...args: any[]) => mockDelete(...args),
      get: (...args: any[]) => mockGet(...args),
    },
  },
}));

import {
  conversationKey,
  toCached,
  fromCached,
  loadCachedMessages,
  cacheMessages,
  cacheMessage,
  updateCachedMessage,
  deleteCachedMessage,
  clearCachedConversation,
  replaceCachedMessageId,
} from './messageCache';

const NOW = 1700000000000;

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg1',
    content: 'hello',
    senderId: 'userA',
    recipientId: 'userB',
    direction: 'sent',
    status: 'sent',
    timestamp: new Date(NOW),
    type: 'text',
    reactions: [],
    unsent: false,
    edited: false,
    ...overrides,
  };
}

function makeCachedMessage(overrides: Partial<CachedMessage> = {}): CachedMessage {
  return {
    id: 'msg1',
    conversationKey: 'userA:userB',
    senderId: 'userA',
    senderUsername: 'alice',
    senderDisplayName: 'Alice',
    senderProfileImage: null,
    recipientId: 'userB',
    content: 'hello',
    type: 'text',
    status: 'sent',
    timestamp: NOW,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    fileType: null,
    waveformData: null,
    duration: null,
    reactions: [],
    replyTo: null,
    unsent: false,
    edited: false,
    ...overrides,
  };
}

describe('messageCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('conversationKey', () => {
    it('should sort IDs alphabetically and join with colon', () => {
      expect(conversationKey('userB', 'userA')).toBe('userA:userB');
    });

    it('should produce the same key regardless of argument order', () => {
      expect(conversationKey('a', 'b')).toBe(conversationKey('b', 'a'));
    });

    it('should handle identical IDs', () => {
      expect(conversationKey('x', 'x')).toBe('x:x');
    });
  });

  describe('toCached', () => {
    it('should convert a Message to CachedMessage', () => {
      const msg = makeMessage({ senderUsername: 'alice', senderDisplayName: 'Alice' });
      const cached = toCached(msg, 'userA');

      expect(cached.id).toBe('msg1');
      expect(cached.conversationKey).toBe('userA:userB');
      expect(cached.timestamp).toBe(NOW);
      expect(cached.senderId).toBe('userA');
      expect(cached.recipientId).toBe('userB');
      expect(cached.content).toBe('hello');
      expect(cached.type).toBe('text');
      expect(cached.senderUsername).toBe('alice');
    });

    it('should compute the correct conversationKey when user is the recipient', () => {
      const msg = makeMessage({ senderId: 'userB', recipientId: 'userA' });
      const cached = toCached(msg, 'userA');
      expect(cached.conversationKey).toBe('userA:userB');
    });

    it('should handle numeric timestamps', () => {
      const msg = makeMessage({ timestamp: NOW as any });
      const cached = toCached(msg, 'userA');
      expect(cached.timestamp).toBe(NOW);
    });

    it('should default optional fields to null/empty', () => {
      const msg = makeMessage();
      const cached = toCached(msg, 'userA');

      expect(cached.fileUrl).toBeNull();
      expect(cached.fileName).toBeNull();
      expect(cached.fileSize).toBeNull();
      expect(cached.fileType).toBeNull();
      expect(cached.waveformData).toBeNull();
      expect(cached.duration).toBeNull();
      expect(cached.reactions).toEqual([]);
      expect(cached.replyTo).toBeNull();
    });
  });

  describe('fromCached', () => {
    it('should convert a CachedMessage to Message with correct direction for sender', () => {
      const cached = makeCachedMessage();
      const msg = fromCached(cached, 'userA');

      expect(msg.direction).toBe('sent');
      expect(msg.id).toBe('msg1');
      expect(msg.timestamp).toEqual(new Date(NOW));
    });

    it('should set direction to "received" when current user is not the sender', () => {
      const cached = makeCachedMessage({ senderId: 'userB' });
      const msg = fromCached(cached, 'userA');

      expect(msg.direction).toBe('received');
    });

    it('should map null optional fields to undefined', () => {
      const cached = makeCachedMessage();
      const msg = fromCached(cached, 'userA');

      expect(msg.fileUrl).toBeUndefined();
      expect(msg.fileName).toBeUndefined();
      expect(msg.fileSize).toBeUndefined();
      expect(msg.fileType).toBeUndefined();
      expect(msg.waveformData).toBeUndefined();
      expect(msg.duration).toBeUndefined();
      expect(msg.replyTo).toBeUndefined();
    });

    it('should preserve existing optional fields', () => {
      const cached = makeCachedMessage({
        fileUrl: 'http://file.jpg',
        fileName: 'photo.jpg',
        fileSize: 1024,
        fileType: 'image/jpeg',
      });
      const msg = fromCached(cached, 'userA');

      expect(msg.fileUrl).toBe('http://file.jpg');
      expect(msg.fileName).toBe('photo.jpg');
      expect(msg.fileSize).toBe(1024);
      expect(msg.fileType).toBe('image/jpeg');
    });
  });

  describe('loadCachedMessages', () => {
    it('should query by conversationKey and return sorted messages', async () => {
      const rows = [makeCachedMessage({ id: 'a', timestamp: 1 }), makeCachedMessage({ id: 'b', timestamp: 2 })];
      mockSortBy.mockResolvedValue(rows);

      const result = await loadCachedMessages('userA', 'userB');

      expect(mockWhere).toHaveBeenCalledWith('conversationKey');
      expect(mockEquals).toHaveBeenCalledWith('userA:userB');
      expect(mockSortBy).toHaveBeenCalledWith('timestamp');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a');
    });
  });

  describe('cacheMessages', () => {
    it('should bulk-put converted messages', async () => {
      const msgs = [makeMessage({ id: 'a' }), makeMessage({ id: 'b' })];
      await cacheMessages(msgs, 'userA');

      expect(mockBulkPut).toHaveBeenCalledTimes(1);
      const rows = mockBulkPut.mock.calls[0][0];
      expect(rows).toHaveLength(2);
      expect(rows[0].id).toBe('a');
    });

    it('should skip bulkPut for empty array', async () => {
      await cacheMessages([], 'userA');
      expect(mockBulkPut).not.toHaveBeenCalled();
    });
  });

  describe('cacheMessage', () => {
    it('should put a single converted message', async () => {
      const msg = makeMessage();
      await cacheMessage(msg, 'userA');

      expect(mockPut).toHaveBeenCalledTimes(1);
      expect(mockPut.mock.calls[0][0].id).toBe('msg1');
    });
  });

  describe('updateCachedMessage', () => {
    it('should update by id with partial changes', async () => {
      await updateCachedMessage('msg1', { status: 'delivered' });
      expect(mockUpdate).toHaveBeenCalledWith('msg1', { status: 'delivered' });
    });
  });

  describe('deleteCachedMessage', () => {
    it('should delete by id', async () => {
      await deleteCachedMessage('msg1');
      expect(mockDelete).toHaveBeenCalledWith('msg1');
    });
  });

  describe('clearCachedConversation', () => {
    it('should delete all messages for a conversation key', async () => {
      mockDelete.mockResolvedValue(undefined);
      await clearCachedConversation('userA', 'userB');

      expect(mockWhere).toHaveBeenCalledWith('conversationKey');
      expect(mockEquals).toHaveBeenCalledWith('userA:userB');
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('replaceCachedMessageId', () => {
    it('should delete old entry and put new one with real ID', async () => {
      const existing = makeCachedMessage({ id: 'temp-1' });
      mockGet.mockResolvedValue(existing);

      await replaceCachedMessageId('temp-1', 'real-1', { status: 'delivered' });

      expect(mockGet).toHaveBeenCalledWith('temp-1');
      expect(mockDelete).toHaveBeenCalledWith('temp-1');
      expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({
        id: 'real-1',
        status: 'delivered',
      }));
    });

    it('should do nothing when the temp ID does not exist', async () => {
      mockGet.mockResolvedValue(undefined);

      await replaceCachedMessageId('nonexistent', 'real-1');

      expect(mockDelete).not.toHaveBeenCalled();
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('should work with no extra changes', async () => {
      const existing = makeCachedMessage({ id: 'temp-1' });
      mockGet.mockResolvedValue(existing);

      await replaceCachedMessageId('temp-1', 'real-1');

      expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({ id: 'real-1' }));
    });
  });
});
