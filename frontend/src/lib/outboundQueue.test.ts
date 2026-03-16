import type { Message } from '@/components/MessageBubble';
import type { OutboundMessage } from './db';

const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockGet = jest.fn();
const mockWhere = jest.fn();
const mockEquals = jest.fn();
const mockFilter = jest.fn();
const mockSortBy = jest.fn();

jest.mock('./db', () => ({
  db: {
    outboundQueue: {
      put: (...args: any[]) => mockPut(...args),
      delete: (...args: any[]) => mockDelete(...args),
      get: (...args: any[]) => mockGet(...args),
      where: (...args: any[]) => {
        mockWhere(...args);
        return {
          equals: (...a: any[]) => {
            mockEquals(...a);
            return {
              filter: (...fArgs: any[]) => {
                mockFilter(...fArgs);
                return { sortBy: (...sArgs: any[]) => mockSortBy(...sArgs) };
              },
              sortBy: (...sArgs: any[]) => mockSortBy(...sArgs),
            };
          },
        };
      },
    },
  },
}));

import {
  enqueue,
  dequeue,
  loadQueueForRecipient,
  loadAllQueued,
  loadQueueForGroup,
  markFailed,
  queuedToMessage,
} from './outboundQueue';

const NOW = 1700000000000;

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'temp-1',
    content: 'hello',
    senderId: 'userA',
    recipientId: 'userB',
    direction: 'sent',
    status: 'sending',
    timestamp: new Date(NOW),
    type: 'text',
    ...overrides,
  };
}

function makeOutbound(overrides: Partial<OutboundMessage> = {}): OutboundMessage {
  return {
    tempId: 'temp-1',
    recipientId: 'userB',
    senderId: 'userA',
    content: 'hello',
    type: 'text',
    timestamp: NOW,
    replyTo: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    fileType: null,
    waveformData: null,
    duration: null,
    status: 'sending',
    attempts: 1,
    queuedAt: NOW,
    groupId: null,
    ...overrides,
  };
}

describe('outboundQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('enqueue', () => {
    it('should put a message into the outbound queue', async () => {
      await enqueue(makeMessage());

      expect(mockPut).toHaveBeenCalledTimes(1);
      const entry = mockPut.mock.calls[0][0];
      expect(entry.tempId).toBe('temp-1');
      expect(entry.recipientId).toBe('userB');
      expect(entry.senderId).toBe('userA');
      expect(entry.content).toBe('hello');
      expect(entry.status).toBe('sending');
      expect(entry.attempts).toBe(1);
      expect(entry.queuedAt).toBe(NOW);
      expect(entry.groupId).toBeNull();
    });

    it('should set groupId when provided', async () => {
      await enqueue(makeMessage(), 'group1');

      const entry = mockPut.mock.calls[0][0];
      expect(entry.groupId).toBe('group1');
    });

    it('should convert Date timestamp to epoch ms', async () => {
      await enqueue(makeMessage({ timestamp: new Date(NOW) }));

      const entry = mockPut.mock.calls[0][0];
      expect(entry.timestamp).toBe(NOW);
    });

    it('should handle numeric timestamp', async () => {
      await enqueue(makeMessage({ timestamp: NOW as any }));

      const entry = mockPut.mock.calls[0][0];
      expect(entry.timestamp).toBe(NOW);
    });

    it('should default optional fields to null', async () => {
      await enqueue(makeMessage());

      const entry = mockPut.mock.calls[0][0];
      expect(entry.replyTo).toBeNull();
      expect(entry.fileUrl).toBeNull();
      expect(entry.fileName).toBeNull();
      expect(entry.fileSize).toBeNull();
      expect(entry.fileType).toBeNull();
      expect(entry.waveformData).toBeNull();
      expect(entry.duration).toBeNull();
    });
  });

  describe('dequeue', () => {
    it('should delete a message by tempId', async () => {
      await dequeue('temp-1');
      expect(mockDelete).toHaveBeenCalledWith('temp-1');
    });
  });

  describe('loadQueueForRecipient', () => {
    it('should query by recipientId, filter by senderId, and sort by queuedAt', async () => {
      const rows = [makeOutbound()];
      mockSortBy.mockResolvedValue(rows);

      const result = await loadQueueForRecipient('userA', 'userB');

      expect(mockWhere).toHaveBeenCalledWith('recipientId');
      expect(mockEquals).toHaveBeenCalledWith('userB');
      expect(mockFilter).toHaveBeenCalledWith(expect.any(Function));
      expect(mockSortBy).toHaveBeenCalledWith('queuedAt');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('temp-1');
    });

    it('should filter correctly by senderId', async () => {
      mockSortBy.mockResolvedValue([]);
      await loadQueueForRecipient('userA', 'userB');

      const filterFn = mockFilter.mock.calls[0][0];
      expect(filterFn({ senderId: 'userA' })).toBe(true);
      expect(filterFn({ senderId: 'userX' })).toBe(false);
    });
  });

  describe('loadAllQueued', () => {
    it('should query by senderId and sort by queuedAt', async () => {
      const rows = [makeOutbound()];
      mockSortBy.mockResolvedValue(rows);

      const result = await loadAllQueued('userA');

      expect(mockWhere).toHaveBeenCalledWith('senderId');
      expect(mockEquals).toHaveBeenCalledWith('userA');
      expect(mockSortBy).toHaveBeenCalledWith('queuedAt');
      expect(result).toHaveLength(1);
    });
  });

  describe('loadQueueForGroup', () => {
    it('should query by recipientId (groupId), filter by senderId and groupId', async () => {
      const rows = [makeOutbound({ groupId: 'group1' })];
      mockSortBy.mockResolvedValue(rows);

      const result = await loadQueueForGroup('userA', 'group1');

      expect(mockWhere).toHaveBeenCalledWith('recipientId');
      expect(mockEquals).toHaveBeenCalledWith('group1');
      expect(mockFilter).toHaveBeenCalledWith(expect.any(Function));
      expect(mockSortBy).toHaveBeenCalledWith('queuedAt');
      expect(result).toHaveLength(1);
    });

    it('should filter correctly by senderId and groupId', async () => {
      mockSortBy.mockResolvedValue([]);
      await loadQueueForGroup('userA', 'group1');

      const filterFn = mockFilter.mock.calls[0][0];
      expect(filterFn({ senderId: 'userA', groupId: 'group1' })).toBe(true);
      expect(filterFn({ senderId: 'userA', groupId: 'other' })).toBe(false);
      expect(filterFn({ senderId: 'userX', groupId: 'group1' })).toBe(false);
    });
  });

  describe('markFailed', () => {
    it('should update status to failed and increment attempts', async () => {
      mockGet.mockResolvedValue(makeOutbound({ attempts: 2 }));

      await markFailed('temp-1');

      expect(mockGet).toHaveBeenCalledWith('temp-1');
      expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed',
        attempts: 3,
      }));
    });

    it('should do nothing when tempId does not exist', async () => {
      mockGet.mockResolvedValue(undefined);

      await markFailed('nonexistent');

      expect(mockPut).not.toHaveBeenCalled();
    });
  });

  describe('queuedToMessage', () => {
    it('should convert an OutboundMessage to a Message with direction "sent"', () => {
      const row = makeOutbound();
      const msg = queuedToMessage(row);

      expect(msg.id).toBe('temp-1');
      expect(msg.direction).toBe('sent');
      expect(msg.status).toBe('sending');
      expect(msg.content).toBe('hello');
      expect(msg.senderId).toBe('userA');
      expect(msg.recipientId).toBe('userB');
      expect(msg.timestamp).toEqual(new Date(NOW));
    });

    it('should set status to "failed" when row status is "failed"', () => {
      const row = makeOutbound({ status: 'failed' });
      const msg = queuedToMessage(row);

      expect(msg.status).toBe('failed');
    });

    it('should map null optional fields to undefined', () => {
      const row = makeOutbound();
      const msg = queuedToMessage(row);

      expect(msg.replyTo).toBeUndefined();
      expect(msg.fileUrl).toBeUndefined();
      expect(msg.fileName).toBeUndefined();
      expect(msg.fileSize).toBeUndefined();
      expect(msg.fileType).toBeUndefined();
      expect(msg.waveformData).toBeUndefined();
      expect(msg.duration).toBeUndefined();
    });

    it('should preserve non-null optional fields', () => {
      const row = makeOutbound({
        replyTo: { id: 'r1', content: 'hi', senderUsername: 'bob' },
        fileUrl: 'http://f.jpg',
        fileName: 'photo.jpg',
        fileSize: 1024,
        fileType: 'image/jpeg',
      });
      const msg = queuedToMessage(row);

      expect(msg.replyTo).toEqual({ id: 'r1', content: 'hi', senderUsername: 'bob' });
      expect(msg.fileUrl).toBe('http://f.jpg');
      expect(msg.fileName).toBe('photo.jpg');
      expect(msg.fileSize).toBe(1024);
      expect(msg.fileType).toBe('image/jpeg');
    });
  });
});
