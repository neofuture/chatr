import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from './ToastContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('ToastContext', () => {
  it('should start with no toasts', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(result.current.toasts).toEqual([]);
  });

  it('should show a toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => { result.current.showToast('Hello', 'success'); });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Hello');
    expect(result.current.toasts[0].type).toBe('success');
  });

  it('should show multiple toasts', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => { result.current.showToast('A', 'info'); });
    act(() => { result.current.showToast('B', 'error'); });
    expect(result.current.toasts).toHaveLength(2);
  });

  it('should remove a toast by id', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => { result.current.showToast('Remove me', 'warning'); });
    const id = result.current.toasts[0].id;
    act(() => { result.current.removeToast(id); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('should include onClick and title when provided', () => {
    const onClick = jest.fn();
    const { result } = renderHook(() => useToast(), { wrapper });
    act(() => { result.current.showToast('Click me', 'info', 5000, onClick, 'Action', 'Custom Title'); });
    expect(result.current.toasts[0].onClick).toBe(onClick);
    expect(result.current.toasts[0].title).toBe('Custom Title');
    expect(result.current.toasts[0].actionLabel).toBe('Action');
  });

  it('should throw when used outside provider', () => {
    expect(() => { renderHook(() => useToast()); }).toThrow();
  });
});
