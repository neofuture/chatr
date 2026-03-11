import { renderHook, act } from '@testing-library/react';

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: { emit: jest.fn(), on: jest.fn(), off: jest.fn() }, connected: true, connecting: false, disconnect: jest.fn(), reconnect: jest.fn() }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ toasts: [], showToast: jest.fn(), removeToast: jest.fn() }),
}));

jest.mock('@/utils/extractWaveform', () => ({ extractWaveformFromFile: jest.fn() }));
jest.mock('@/utils/audio', () => ({ getAudioDurationFromBlob: jest.fn().mockResolvedValue(0) }));
jest.mock('@/lib/outboundQueue', () => ({ enqueue: jest.fn(), loadAllQueued: jest.fn().mockResolvedValue([]) }));

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

import { useMessageInput } from './useMessageInput';

describe('useMessageInput', () => {
  beforeEach(() => { jest.clearAllMocks(); localStorage.setItem('token', 'test'); });

  it('should return expected interface', () => {
    const { result } = renderHook(() => useMessageInput({ recipientId: 'r1', currentUserId: 'u1' }));
    expect(result.current).toHaveProperty('message');
    expect(result.current).toHaveProperty('handleMessageChange');
    expect(result.current).toHaveProperty('handleSend');
    expect(typeof result.current.handleMessageChange).toBe('function');
    expect(typeof result.current.handleSend).toBe('function');
  });

  it('should start with empty message', () => {
    const { result } = renderHook(() => useMessageInput({ recipientId: 'r1', currentUserId: 'u1' }));
    expect(result.current.message).toBe('');
  });

  it('should have file management functions', () => {
    const { result } = renderHook(() => useMessageInput({ recipientId: 'r1', currentUserId: 'u1' }));
    expect(result.current).toHaveProperty('handleFileSelect');
    expect(result.current).toHaveProperty('cancelFileSelection');
    expect(result.current.selectedFiles).toEqual([]);
  });
});
