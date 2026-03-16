const mockAdd = jest.fn();
const mockUpdate = jest.fn();
const mockFilter = jest.fn();
const mockWhere = jest.fn();
const mockEquals = jest.fn();
const mockToArray = jest.fn();
const mockOr = jest.fn();
const mockFilterDelete = jest.fn();

jest.mock('./db', () => ({
  db: {
    messages: {
      add: (...args: any[]) => mockAdd(...args),
      update: (...args: any[]) => mockUpdate(...args),
      where: (...args: any[]) => {
        mockWhere(...args);
        return {
          equals: (...a: any[]) => {
            mockEquals(...a);
            return {
              toArray: (...ta: any[]) => mockToArray(...ta),
              or: (...orArgs: any[]) => {
                mockOr(...orArgs);
                return {
                  equals: (...eqArgs: any[]) => {
                    mockEquals(...eqArgs);
                    return { toArray: (...ta: any[]) => mockToArray(...ta) };
                  },
                };
              },
            };
          },
        };
      },
      filter: (...args: any[]) => {
        mockFilter(...args);
        return { delete: (...a: any[]) => mockFilterDelete(...a) };
      },
    },
  },
}));

import {
  saveMessageOffline,
  getUnsyncedMessages,
  getOfflineMessages,
  markMessageSynced,
  syncOfflineMessages,
  isOnline,
  cleanupOldMessages,
} from './offline';
import type { OfflineMessage } from './db';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const sampleMessage: OfflineMessage = {
  id: 'msg1',
  senderId: 'userA',
  recipientId: 'userB',
  content: 'hello',
  createdAt: new Date(),
  synced: false,
};

describe('offline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveMessageOffline', () => {
    it('should add a message to the messages table', async () => {
      await saveMessageOffline(sampleMessage);
      expect(mockAdd).toHaveBeenCalledWith(sampleMessage);
    });
  });

  describe('getUnsyncedMessages', () => {
    it('should query for messages where synced equals 0', async () => {
      mockToArray.mockResolvedValue([sampleMessage]);

      const result = await getUnsyncedMessages();

      expect(mockWhere).toHaveBeenCalledWith('synced');
      expect(mockEquals).toHaveBeenCalledWith(0);
      expect(result).toEqual([sampleMessage]);
    });
  });

  describe('getOfflineMessages', () => {
    it('should query by groupId when provided', async () => {
      mockToArray.mockResolvedValue([sampleMessage]);

      await getOfflineMessages(undefined, 'group1');

      expect(mockWhere).toHaveBeenCalledWith('groupId');
      expect(mockEquals).toHaveBeenCalledWith('group1');
    });

    it('should query by recipientId with or/senderId when recipientId provided', async () => {
      mockToArray.mockResolvedValue([sampleMessage]);

      await getOfflineMessages('userB');

      expect(mockWhere).toHaveBeenCalledWith('recipientId');
      expect(mockEquals).toHaveBeenCalledWith('userB');
      expect(mockOr).toHaveBeenCalledWith('senderId');
    });

    it('should return empty array when neither recipientId nor groupId provided', async () => {
      const result = await getOfflineMessages();
      expect(result).toEqual([]);
    });
  });

  describe('markMessageSynced', () => {
    it('should update the message synced flag', async () => {
      await markMessageSynced('msg1');
      expect(mockUpdate).toHaveBeenCalledWith('msg1', { synced: true });
    });
  });

  describe('syncOfflineMessages', () => {
    it('should send each unsynced message and mark synced on success', async () => {
      mockToArray.mockResolvedValue([sampleMessage]);
      mockFetch.mockResolvedValue({ ok: true });

      await syncOfflineMessages('mytoken');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/messages'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mytoken',
          }),
        }),
      );
      expect(mockUpdate).toHaveBeenCalledWith('msg1', { synced: true });
    });

    it('should not mark synced when server returns error', async () => {
      mockToArray.mockResolvedValue([sampleMessage]);
      mockFetch.mockResolvedValue({ ok: false });

      await syncOfflineMessages('tok');

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully without throwing', async () => {
      mockToArray.mockResolvedValue([sampleMessage]);
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(syncOfflineMessages('tok')).resolves.toBeUndefined();
    });
  });

  describe('isOnline', () => {
    it('should return navigator.onLine value', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
      expect(isOnline()).toBe(true);

      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
      expect(isOnline()).toBe(false);
    });
  });

  describe('cleanupOldMessages', () => {
    it('should filter synced messages older than 7 days and delete them', async () => {
      mockFilterDelete.mockResolvedValue(undefined);

      await cleanupOldMessages();

      expect(mockFilter).toHaveBeenCalledWith(expect.any(Function));
      expect(mockFilterDelete).toHaveBeenCalled();
    });

    it('should filter function accept synced old messages', () => {
      mockFilterDelete.mockResolvedValue(undefined);
      cleanupOldMessages();

      const filterFn = mockFilter.mock.calls[0][0];
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      expect(filterFn({ synced: true, createdAt: eightDaysAgo })).toBe(true);
    });

    it('should filter function reject recent synced messages', () => {
      mockFilterDelete.mockResolvedValue(undefined);
      cleanupOldMessages();

      const filterFn = mockFilter.mock.calls[0][0];

      expect(filterFn({ synced: true, createdAt: new Date() })).toBe(false);
    });

    it('should filter function reject unsynced old messages', () => {
      mockFilterDelete.mockResolvedValue(undefined);
      cleanupOldMessages();

      const filterFn = mockFilter.mock.calls[0][0];
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      expect(filterFn({ synced: false, createdAt: eightDaysAgo })).toBe(false);
    });
  });
});
