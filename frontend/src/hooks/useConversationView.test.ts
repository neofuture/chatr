import { renderHook } from '@testing-library/react';

const mockOn = jest.fn();
const mockOff = jest.fn();
const mockEmit = jest.fn();

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: { on: mockOn, off: mockOff, emit: mockEmit }, connected: true, connecting: false, disconnect: jest.fn(), reconnect: jest.fn() }),
}));

jest.mock('@/lib/messageCache', () => ({
  loadCachedMessages: jest.fn().mockReturnValue([]),
  cacheMessages: jest.fn(),
  cacheMessage: jest.fn(),
  updateCachedMessage: jest.fn(),
  replaceCachedMessageId: jest.fn(),
}));

jest.mock('@/lib/outboundQueue', () => ({
  loadQueueForRecipient: jest.fn().mockReturnValue([]),
  dequeue: jest.fn(),
}));

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ messages: [] }) });

import { useConversationView } from './useConversationView';

describe('useConversationView', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorage.setItem('token', 'test'); });

  it('should return expected interface', () => {
    const { result } = renderHook(() => useConversationView({
      recipientId: 'r1', currentUserId: 'u1',
    }));
    expect(result.current).toHaveProperty('messages');
    expect(result.current).toHaveProperty('isRecipientTyping');
    expect(result.current).toHaveProperty('replyingTo');
    expect(result.current).toHaveProperty('editingMessage');
  });

  it('should register socket listeners', () => {
    renderHook(() => useConversationView({ recipientId: 'r1', currentUserId: 'u1' }));
    const events = mockOn.mock.calls.map((c: any[]) => c[0]);
    expect(events.length).toBeGreaterThan(0);
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useConversationView({ recipientId: 'r1', currentUserId: 'u1' }));
    unmount();
    expect(mockOff).toHaveBeenCalled();
  });

  it('should start with empty messages', () => {
    const { result } = renderHook(() => useConversationView({ recipientId: 'r1', currentUserId: 'u1' }));
    expect(Array.isArray(result.current.messages)).toBe(true);
  });
});
