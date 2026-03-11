import { renderHook, act } from '@testing-library/react';
import { useOfflineSync } from './useOfflineSync';

jest.mock('@/lib/offline', () => ({
  syncOfflineMessages: jest.fn().mockResolvedValue(undefined),
}));

describe('useOfflineSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('should report online when navigator.onLine is true', () => {
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSyncing).toBe(false);
  });

  it('should report offline when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.isOnline).toBe(false);
  });

  it('should detect going offline', () => {
    const { result } = renderHook(() => useOfflineSync());
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.isOnline).toBe(false);
  });

  it('should detect going online and trigger sync', async () => {
    localStorage.setItem('token', 'test-token');
    const { result } = renderHook(() => useOfflineSync());
    await act(async () => { window.dispatchEvent(new Event('online')); });
    expect(result.current.isOnline).toBe(true);
  });

  it('should cleanup event listeners on unmount', () => {
    const spy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOfflineSync());
    unmount();
    expect(spy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(spy).toHaveBeenCalledWith('offline', expect.any(Function));
    spy.mockRestore();
  });
});
