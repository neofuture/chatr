jest.mock('./LogContext', () => ({
  useLog: () => ({ logs: [], addLog: jest.fn(), clearLogs: jest.fn(), copyLogs: jest.fn() }),
}));

jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    close: jest.fn(),
    onAny: jest.fn(),
    onAnyOutgoing: jest.fn(),
    io: { on: jest.fn(), off: jest.fn() },
  };
  return { __esModule: true, default: jest.fn(() => mockSocket) };
});

import { renderHook } from '@testing-library/react';
import React from 'react';
import { WebSocketProvider, useWebSocket } from './WebSocketContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WebSocketProvider>{children}</WebSocketProvider>
);

describe('WebSocketContext', () => {
  beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); });

  it('should start disconnected without token', () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });
    expect(result.current.connected).toBe(false);
    expect(result.current.connecting).toBe(false);
  });

  it('should provide disconnect and reconnect functions', () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.reconnect).toBe('function');
  });

  it('should return defaults without provider', () => {
    const { result } = renderHook(() => useWebSocket());
    expect(result.current.socket).toBeNull();
    expect(result.current.connected).toBe(false);
  });

  it('should attempt connection when token exists', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ id: 'u1' }));
    const io = require('socket.io-client').default;
    renderHook(() => useWebSocket(), { wrapper });
    expect(io).toHaveBeenCalled();
  });

  it('should skip connection with invalid user data', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', 'NOT_JSON');
    const io = require('socket.io-client').default;
    io.mockClear();
    renderHook(() => useWebSocket(), { wrapper });
    expect(io).not.toHaveBeenCalled();
  });
});
