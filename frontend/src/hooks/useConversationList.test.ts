import { renderHook } from '@testing-library/react';

const mockOn = jest.fn();
const mockOff = jest.fn();
const mockEmit = jest.fn();

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: { on: mockOn, off: mockOff, emit: mockEmit }, connected: true, connecting: false, disconnect: jest.fn(), reconnect: jest.fn() }),
}));

jest.mock('@/contexts/LogContext', () => ({
  useLog: () => ({ logs: [], addLog: jest.fn(), clearLogs: jest.fn(), copyLogs: jest.fn() }),
}));

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });

import { useConversationList } from './useConversationList';

describe('useConversationList', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('should return expected interface', () => {
    const { result } = renderHook(() => useConversationList());
    expect(result.current).toHaveProperty('conversations');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('refresh');
    expect(typeof result.current.refresh).toBe('function');
  });

  it('should start with empty conversations', () => {
    const { result } = renderHook(() => useConversationList());
    expect(Array.isArray(result.current.conversations)).toBe(true);
  });

  it('should fetch conversations on mount', () => {
    renderHook(() => useConversationList());
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/users/conversations'), expect.anything());
  });

  it('should register socket listeners for real-time updates', () => {
    renderHook(() => useConversationList());
    const events = mockOn.mock.calls.map((c: any[]) => c[0]);
    expect(events).toContain('message:received');
  });

  it('should cleanup listeners on unmount', () => {
    const { unmount } = renderHook(() => useConversationList());
    unmount();
    expect(mockOff).toHaveBeenCalled();
  });
});
