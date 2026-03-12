import { renderHook, act } from '@testing-library/react';
import React from 'react';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), forward: jest.fn(), refresh: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/app',
}));

const mockOpenPanel = jest.fn();
jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({ openPanel: mockOpenPanel, panels: [], closePanel: jest.fn(), closeTopPanel: jest.fn(), closeAllPanels: jest.fn(), maxLevel: -1, effectiveMaxLevel: -1, updatePanelActionIcons: jest.fn() }),
}));

import { useOpenUserProfile } from './useOpenUserProfile';

describe('useOpenUserProfile', () => {
  beforeEach(() => { mockOpenPanel.mockClear(); mockPush.mockClear(); localStorage.clear(); });

  it('should return a function', () => {
    const { result } = renderHook(() => useOpenUserProfile());
    expect(typeof result.current).toBe('function');
  });

  it('should call openPanel with correct ID when invoked', () => {
    const { result } = renderHook(() => useOpenUserProfile());
    act(() => { result.current('user-123'); });
    expect(mockOpenPanel).toHaveBeenCalledWith(
      'user-profile-user-123',
      expect.anything(),
      'Profile',
      'left',
      undefined,
      undefined,
      true,
    );
  });

  it('should use displayName as title when provided', () => {
    const { result } = renderHook(() => useOpenUserProfile());
    act(() => { result.current('user-123', 'John Doe'); });
    expect(mockOpenPanel).toHaveBeenCalledWith(
      'user-profile-user-123',
      expect.anything(),
      'John Doe',
      'left',
      undefined,
      undefined,
      true,
    );
  });

  it('should pass profileImage when provided', () => {
    const { result } = renderHook(() => useOpenUserProfile());
    act(() => { result.current('user-123', 'John', 'img.png'); });
    expect(mockOpenPanel).toHaveBeenCalledWith(
      'user-profile-user-123',
      expect.anything(),
      'John',
      'left',
      undefined,
      'img.png',
      true,
    );
  });

  it('should navigate to /app/profile when userId is current user', () => {
    localStorage.setItem('user', JSON.stringify({ id: 'me-123' }));
    const { result } = renderHook(() => useOpenUserProfile());
    act(() => { result.current('me-123'); });
    expect(mockPush).toHaveBeenCalledWith('/app/profile');
    expect(mockOpenPanel).not.toHaveBeenCalled();
  });
});
