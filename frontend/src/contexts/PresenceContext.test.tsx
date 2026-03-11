const mockOn = jest.fn();
const mockOff = jest.fn();
const mockEmit = jest.fn();

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: { on: mockOn, off: mockOff, emit: mockEmit }, connected: true, connecting: false, disconnect: jest.fn(), reconnect: jest.fn() }),
}));

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { PresenceProvider, usePresence } from './PresenceContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PresenceProvider>{children}</PresenceProvider>
);

describe('PresenceContext', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('should return offline for unknown users', () => {
    const { result } = renderHook(() => usePresence(), { wrapper });
    expect(result.current.getPresence('unknown-user')).toEqual({ status: 'offline', lastSeen: null });
  });

  it('should register socket listeners', () => {
    renderHook(() => usePresence(), { wrapper });
    const events = mockOn.mock.calls.map((c: any[]) => c[0]);
    expect(events).toContain('user:status');
    expect(events).toContain('presence:response');
  });

  it('should request presence via socket', () => {
    const { result } = renderHook(() => usePresence(), { wrapper });
    act(() => { result.current.requestPresence(['user-1', 'user-2']); });
    expect(mockEmit).toHaveBeenCalledWith('presence:request', ['user-1', 'user-2']);
  });

  it('should throw when used outside provider', () => {
    expect(() => { renderHook(() => usePresence()); }).toThrow();
  });
});
