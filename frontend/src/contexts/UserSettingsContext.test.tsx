jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: null, connected: false }),
}));

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { UserSettingsProvider, useUserSettings } from './UserSettingsContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserSettingsProvider>{children}</UserSettingsProvider>
);

beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); });

describe('UserSettingsContext', () => {
  it('should provide default settings', () => {
    const { result } = renderHook(() => useUserSettings(), { wrapper });
    expect(result.current.settings.ghostTypingEnabled).toBe(false);
    expect(result.current.settings.showOnlineStatus).toBe(true);
    expect(result.current.settings.showPhoneNumber).toBe(false);
    expect(result.current.settings.showEmail).toBe(false);
  });

  it('should update a setting', () => {
    const { result } = renderHook(() => useUserSettings(), { wrapper });
    act(() => { result.current.setSetting('ghostTypingEnabled', true); });
    expect(result.current.settings.ghostTypingEnabled).toBe(true);
  });

  it('should persist settings to localStorage', () => {
    const { result } = renderHook(() => useUserSettings(), { wrapper });
    act(() => { result.current.setSetting('showEmail', true); });
    const stored = JSON.parse(localStorage.getItem('chatr_user_settings')!);
    expect(stored.showEmail).toBe(true);
  });

  it('should sync server-side keys via fetch', () => {
    localStorage.setItem('token', 'test-tok');
    const { result } = renderHook(() => useUserSettings(), { wrapper });
    act(() => { result.current.setSetting('showOnlineStatus', false); });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/users/me/settings'), expect.objectContaining({ method: 'PUT' }));
  });

  it('should throw when used outside provider', () => {
    expect(() => { renderHook(() => useUserSettings()); }).toThrow();
  });
});
