import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => { localStorage.clear(); });

describe('ThemeContext', () => {
  it('should default to dark theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('dark');
  });

  it('should toggle to light theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.toggleTheme(); });
    expect(result.current.theme).toBe('light');
  });

  it('should toggle back to dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.toggleTheme(); });
    act(() => { result.current.toggleTheme(); });
    expect(result.current.theme).toBe('dark');
  });

  it('should persist theme to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => { result.current.toggleTheme(); });
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('should load saved theme from localStorage', () => {
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('light');
  });

  it('should return defaults when used outside provider', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(typeof result.current.toggleTheme).toBe('function');
  });
});
