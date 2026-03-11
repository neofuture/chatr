import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

beforeEach(() => { localStorage.clear(); mockPush.mockClear(); });

describe('useAuth', () => {
  it('should start with loading true then false', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should load user from localStorage', () => {
    localStorage.setItem('token', 'tok-123');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', username: '@test' }));
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual({ id: 'u1', username: '@test' });
  });

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', 'NOT_JSON');
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
  });

  it('login should store token/user and navigate', () => {
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.login('tok-abc', { id: 'u2', username: '@me' } as any); });
    expect(localStorage.getItem('token')).toBe('tok-abc');
    expect(result.current.user).toEqual({ id: 'u2', username: '@me' });
    expect(mockPush).toHaveBeenCalledWith('/app');
  });

  it('logout should clear storage and navigate', () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('user', '{}');
    const { result } = renderHook(() => useAuth());
    act(() => { result.current.logout(); });
    expect(localStorage.getItem('token')).toBeNull();
    expect(result.current.user).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
