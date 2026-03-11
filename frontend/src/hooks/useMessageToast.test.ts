import { renderHook } from '@testing-library/react';

const mockOn = jest.fn();
const mockOff = jest.fn();
const mockShowToast = jest.fn();

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: { on: mockOn, off: mockOff }, connected: true, connecting: false, disconnect: jest.fn(), reconnect: jest.fn() }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ toasts: [], showToast: mockShowToast, removeToast: jest.fn() }),
}));

jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({ panels: [], openPanel: jest.fn(), closePanel: jest.fn(), closeTopPanel: jest.fn(), closeAllPanels: jest.fn(), maxLevel: -1, effectiveMaxLevel: -1, updatePanelActionIcons: jest.fn() }),
}));

import { useMessageToast } from './useMessageToast';

describe('useMessageToast', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('should register message:received listener', () => {
    const onOpen = jest.fn();
    renderHook(() => useMessageToast(onOpen, 'user-1'));
    expect(mockOn).toHaveBeenCalledWith('message:received', expect.any(Function));
  });

  it('should unregister listener on unmount', () => {
    const onOpen = jest.fn();
    const { unmount } = renderHook(() => useMessageToast(onOpen, 'user-1'));
    unmount();
    expect(mockOff).toHaveBeenCalledWith('message:received', expect.any(Function));
  });

  it('should show toast when message received from another user', () => {
    const onOpen = jest.fn();
    renderHook(() => useMessageToast(onOpen, 'user-1'));
    const handler = mockOn.mock.calls.find((c: any[]) => c[0] === 'message:received')?.[1];
    handler?.({ senderId: 'user-2', senderName: 'Alice', content: 'Hello', type: 'text' });
    expect(mockShowToast).toHaveBeenCalledWith('Hello', 'newmessage', 6000, expect.any(Function), undefined, 'Alice');
  });

  it('should not show toast for own messages', () => {
    const onOpen = jest.fn();
    renderHook(() => useMessageToast(onOpen, 'user-1'));
    const handler = mockOn.mock.calls.find((c: any[]) => c[0] === 'message:received')?.[1];
    handler?.({ senderId: 'user-1', content: 'Hello' });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('should show audio preview for voice messages', () => {
    const onOpen = jest.fn();
    renderHook(() => useMessageToast(onOpen, 'user-1'));
    const handler = mockOn.mock.calls.find((c: any[]) => c[0] === 'message:received')?.[1];
    handler?.({ senderId: 'user-2', senderName: 'Bob', content: '', type: 'audio' });
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Voice message'), 'newmessage', 6000, expect.any(Function), undefined, 'Bob');
  });
});
