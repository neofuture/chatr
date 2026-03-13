jest.mock('../services/openai', () => ({
  generateConversationSummary: jest.fn(),
}));

import { generateConversationSummary } from '../services/openai';

const mockGenerateSummary = generateConversationSummary as jest.MockedFunction<typeof generateConversationSummary>;

const mockPrisma = {
  conversation: { findUnique: jest.fn(), update: jest.fn() },
  message: { findMany: jest.fn(), count: jest.fn() },
  group: { update: jest.fn() },
  groupMessage: { count: jest.fn(), findMany: jest.fn() },
} as any;

jest.mock('../lib/prisma', () => ({ prisma: mockPrisma }));

function loadModule() {
  jest.resetModules();
  jest.doMock('../services/openai', () => ({
    generateConversationSummary: mockGenerateSummary,
  }));
  jest.doMock('../lib/prisma', () => ({ prisma: mockPrisma }));
  const mod = require('../services/summaryEngine');
  return mod;
}

function flush() {
  return new Promise<void>(r => setImmediate(() => setImmediate(r)));
}

describe('summaryEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.message.count = jest.fn();
    mockPrisma.message.findMany = jest.fn();
    mockPrisma.conversation.update = jest.fn();
    mockPrisma.groupMessage = { count: jest.fn(), findMany: jest.fn() };
    mockPrisma.group.update = jest.fn();
  });

  describe('maybeRegenerateDMSummary', () => {
    it('should skip if summary was generated recently', async () => {
      const { maybeRegenerateDMSummary } = loadModule();
      const recentDate = new Date(Date.now() - 1000);

      maybeRegenerateDMSummary('conv-1', 'user-a', 'user-b', 50, recentDate);
      await flush();

      expect(mockPrisma.message.count).not.toHaveBeenCalled();
    });

    it('should skip if message count is below threshold', async () => {
      const { maybeRegenerateDMSummary } = loadModule();
      mockPrisma.message.count.mockResolvedValue(5);

      maybeRegenerateDMSummary('conv-1', 'user-a', 'user-b', null, null);
      await flush();

      expect(mockPrisma.message.findMany).not.toHaveBeenCalled();
    });

    it('should skip if not enough new messages since last summary', async () => {
      const { maybeRegenerateDMSummary } = loadModule();
      mockPrisma.message.count.mockResolvedValue(15);

      maybeRegenerateDMSummary('conv-1', 'user-a', 'user-b', 12, null);
      await flush();

      expect(mockPrisma.message.findMany).not.toHaveBeenCalled();
    });

    it('should generate and save summary for DM conversations', async () => {
      const { maybeRegenerateDMSummary } = loadModule();
      mockPrisma.message.count.mockResolvedValue(20);
      mockPrisma.message.findMany.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => ({
          content: `Message ${i}`,
          sender: { displayName: i % 2 === 0 ? 'Alice' : null, username: '@bob' },
        })),
      );
      mockGenerateSummary.mockResolvedValue('Catching up about weekend plans');

      maybeRegenerateDMSummary('conv-1', 'user-a', 'user-b', null, null);
      await flush();

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ sender: expect.any(String), content: expect.any(String) }),
        ]),
      );
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: expect.objectContaining({
          summary: 'Catching up about weekend plans',
          summaryMessageCount: 20,
        }),
      });
    });

    it('should skip update when OpenAI returns empty summary', async () => {
      const { maybeRegenerateDMSummary } = loadModule();
      mockPrisma.message.count.mockResolvedValue(20);
      mockPrisma.message.findMany.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => ({
          content: `Message ${i}`,
          sender: { displayName: 'Alice', username: '@alice' },
        })),
      );
      mockGenerateSummary.mockResolvedValue('');

      maybeRegenerateDMSummary('conv-1', 'user-a', 'user-b', null, null);
      await flush();

      expect(mockPrisma.conversation.update).not.toHaveBeenCalled();
    });

    it('should skip when fetched messages are below minimum', async () => {
      const { maybeRegenerateDMSummary } = loadModule();
      mockPrisma.message.count.mockResolvedValue(20);
      mockPrisma.message.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          content: `Message ${i}`,
          sender: { displayName: 'Alice', username: '@alice' },
        })),
      );

      maybeRegenerateDMSummary('conv-1', 'user-a', 'user-b', null, null);
      await flush();

      expect(mockGenerateSummary).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const { maybeRegenerateDMSummary } = loadModule();
      mockPrisma.message.count.mockRejectedValue(new Error('DB error'));

      maybeRegenerateDMSummary('conv-1', 'user-a', 'user-b', null, null);
      await flush();
    });

    it('should use username fallback when displayName is null', async () => {
      const { maybeRegenerateDMSummary } = loadModule();
      mockPrisma.message.count.mockResolvedValue(20);
      mockPrisma.message.findMany.mockResolvedValue(
        Array.from({ length: 12 }, () => ({
          content: 'Hello',
          sender: { displayName: null, username: '@testuser' },
        })),
      );
      mockGenerateSummary.mockResolvedValue('Chat summary');

      maybeRegenerateDMSummary('conv-1', 'user-a', 'user-b', null, null);
      await flush();

      expect(mockGenerateSummary).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ sender: 'testuser' }),
        ]),
      );
    });
  });

  describe('maybeRegenerateGroupSummary', () => {
    it('should skip if summary was generated recently', async () => {
      const { maybeRegenerateGroupSummary } = loadModule();
      const recentDate = new Date(Date.now() - 1000);

      maybeRegenerateGroupSummary('group-1', 50, recentDate);
      await flush();

      expect(mockPrisma.groupMessage.count).not.toHaveBeenCalled();
    });

    it('should skip if message count is below threshold', async () => {
      const { maybeRegenerateGroupSummary } = loadModule();
      mockPrisma.groupMessage.count.mockResolvedValue(5);

      maybeRegenerateGroupSummary('group-1', null, null);
      await flush();

      expect(mockPrisma.groupMessage.findMany).not.toHaveBeenCalled();
    });

    it('should generate and save summary for group conversations', async () => {
      const { maybeRegenerateGroupSummary } = loadModule();
      mockPrisma.groupMessage.count.mockResolvedValue(25);
      mockPrisma.groupMessage.findMany.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          content: `Group message ${i}`,
          sender: { displayName: `User ${i % 3}`, username: `@user${i % 3}` },
        })),
      );
      mockGenerateSummary.mockResolvedValue('Discussing project roadmap');

      maybeRegenerateGroupSummary('group-1', null, null);
      await flush();

      expect(mockPrisma.group.update).toHaveBeenCalledWith({
        where: { id: 'group-1' },
        data: expect.objectContaining({
          summary: 'Discussing project roadmap',
          summaryMessageCount: 25,
        }),
      });
    });

    it('should skip update when OpenAI returns empty summary', async () => {
      const { maybeRegenerateGroupSummary } = loadModule();
      mockPrisma.groupMessage.count.mockResolvedValue(25);
      mockPrisma.groupMessage.findMany.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          content: `Message ${i}`,
          sender: { displayName: 'Alice', username: '@alice' },
        })),
      );
      mockGenerateSummary.mockResolvedValue('');

      maybeRegenerateGroupSummary('group-1', null, null);
      await flush();

      expect(mockPrisma.group.update).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const { maybeRegenerateGroupSummary } = loadModule();
      mockPrisma.groupMessage.count.mockRejectedValue(new Error('DB error'));

      maybeRegenerateGroupSummary('group-1', null, null);
      await flush();
    });

    it('should regenerate when no prior summary exists', async () => {
      const { maybeRegenerateGroupSummary } = loadModule();
      mockPrisma.groupMessage.count.mockResolvedValue(15);
      mockPrisma.groupMessage.findMany.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => ({
          content: `Message ${i}`,
          sender: { displayName: 'User', username: '@user' },
        })),
      );
      mockGenerateSummary.mockResolvedValue('A lively group chat');

      maybeRegenerateGroupSummary('group-1', undefined, undefined);
      await flush();

      expect(mockGenerateSummary).toHaveBeenCalled();
      expect(mockPrisma.group.update).toHaveBeenCalled();
    });
  });

});
