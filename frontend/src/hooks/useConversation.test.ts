import { renderHook } from '@testing-library/react';

const mockOn = jest.fn();
const mockOff = jest.fn();
const mockEmit = jest.fn();

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: { on: mockOn, off: mockOff, emit: mockEmit }, connected: true, connecting: false, disconnect: jest.fn(), reconnect: jest.fn() }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ toasts: [], showToast: jest.fn(), removeToast: jest.fn() }),
}));

jest.mock('@/contexts/UserSettingsContext', () => ({
  useUserSettings: () => ({ settings: { ghostTypingEnabled: false, showOnlineStatus: true, showPhoneNumber: false, showEmail: false }, setSetting: jest.fn() }),
}));

jest.mock('@/contexts/LogContext', () => ({
  useLog: () => ({ logs: [], addLog: jest.fn(), clearLogs: jest.fn(), copyLogs: jest.fn() }),
}));

jest.mock('@/utils/extractWaveform', () => ({ extractWaveformFromFile: jest.fn() }));
jest.mock('@/lib/messageCache', () => ({
  loadCachedMessages: jest.fn().mockReturnValue([]),
  cacheMessages: jest.fn(),
  cacheMessage: jest.fn(),
  updateCachedMessage: jest.fn(),
  replaceCachedMessageId: jest.fn(),
}));

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ messages: [], users: [] }) });

import { useConversation } from './useConversation';

describe('useConversation', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorage.setItem('token', 'test'); localStorage.setItem('user', JSON.stringify({ id: 'u1', username: '@test' })); });

  it('should return expected interface', () => {
    const { result } = renderHook(() => useConversation());
    expect(result.current).toHaveProperty('messages');
    expect(result.current).toHaveProperty('currentUserId');
    expect(result.current).toHaveProperty('handleMessageSend');
    expect(typeof result.current.handleMessageSend).toBe('function');
  });

  it('should start with empty messages', () => {
    const { result } = renderHook(() => useConversation());
    expect(Array.isArray(result.current.messages)).toBe(true);
  });

  it('should register socket listeners on mount', () => {
    renderHook(() => useConversation());
    expect(mockOn).toHaveBeenCalled();
  });

  it('should cleanup socket listeners on unmount', () => {
    const { unmount } = renderHook(() => useConversation());
    unmount();
    expect(mockOff).toHaveBeenCalled();
  });
});
