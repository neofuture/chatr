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

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ groups: [] }) });

import { useGroupsList } from './useGroupsList';

describe('useGroupsList', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('should return expected interface', () => {
    const { result } = renderHook(() => useGroupsList());
    expect(result.current).toHaveProperty('groups');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('refresh');
    expect(typeof result.current.refresh).toBe('function');
  });

  it('should start with empty groups', () => {
    const { result } = renderHook(() => useGroupsList());
    expect(Array.isArray(result.current.groups)).toBe(true);
  });

  it('should fetch groups on mount', async () => {
    renderHook(() => useGroupsList());
    await new Promise(r => setTimeout(r, 50));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/groups'), expect.anything());
  });

  it('should register socket listeners', () => {
    renderHook(() => useGroupsList());
    expect(mockOn).toHaveBeenCalled();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useGroupsList());
    unmount();
    expect(mockOff).toHaveBeenCalled();
  });
});
