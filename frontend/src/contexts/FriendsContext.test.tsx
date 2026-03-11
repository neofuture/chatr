jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: null, connected: false, connecting: false, disconnect: jest.fn(), reconnect: jest.fn() }),
}));
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ toasts: [], showToast: jest.fn(), removeToast: jest.fn() }),
}));

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ friends: [], requests: [], blocked: [] }) });

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { FriendsProvider, useFriends } from './FriendsContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FriendsProvider>{children}</FriendsProvider>
);

describe('FriendsContext', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorage.setItem('token', 'test-tok'); });

  it('should provide initial empty state', async () => {
    const { result } = renderHook(() => useFriends(), { wrapper });
    await act(async () => {});
    expect(Array.isArray(result.current.friends)).toBe(true);
    expect(Array.isArray(result.current.incoming)).toBe(true);
    expect(Array.isArray(result.current.outgoing)).toBe(true);
    expect(Array.isArray(result.current.blocked)).toBe(true);
  });

  it('should fetch friend data on mount', async () => {
    renderHook(() => useFriends(), { wrapper });
    await act(async () => {});
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should expose action functions', async () => {
    const { result } = renderHook(() => useFriends(), { wrapper });
    await act(async () => {});
    expect(typeof result.current.sendRequest).toBe('function');
    expect(typeof result.current.acceptRequest).toBe('function');
    expect(typeof result.current.declineRequest).toBe('function');
    expect(typeof result.current.removeFriend).toBe('function');
    expect(typeof result.current.blockUser).toBe('function');
    expect(typeof result.current.unblockUser).toBe('function');
    expect(typeof result.current.refresh).toBe('function');
  });

  it('should throw when used outside provider', () => {
    expect(() => { renderHook(() => useFriends()); }).toThrow();
  });
});
