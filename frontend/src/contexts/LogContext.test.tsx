import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { LogProvider, useLog } from './LogContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LogProvider>{children}</LogProvider>
);

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => { jest.useRealTimers(); });

describe('LogContext', () => {
  it('should start with empty logs', () => {
    const { result } = renderHook(() => useLog(), { wrapper });
    expect(result.current.logs).toEqual([]);
  });

  it('should add a log entry', () => {
    const { result } = renderHook(() => useLog(), { wrapper });
    act(() => { result.current.addLog('info', 'test:event', { foo: 'bar' }); });
    act(() => { jest.advanceTimersByTime(300); });
    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0].event).toBe('test:event');
    expect(result.current.logs[0].type).toBe('info');
  });

  it('should prepend new logs (newest first)', () => {
    const { result } = renderHook(() => useLog(), { wrapper });
    act(() => { result.current.addLog('info', 'first'); });
    act(() => { result.current.addLog('error', 'second'); });
    act(() => { jest.advanceTimersByTime(300); });
    expect(result.current.logs[0].event).toBe('second');
    expect(result.current.logs[1].event).toBe('first');
  });

  it('should clear logs', () => {
    const { result } = renderHook(() => useLog(), { wrapper });
    act(() => { result.current.addLog('info', 'event1'); });
    act(() => { jest.advanceTimersByTime(300); });
    act(() => { result.current.clearLogs(); });
    expect(result.current.logs).toEqual([]);
  });

  it('should persist logs to localStorage', () => {
    const { result } = renderHook(() => useLog(), { wrapper });
    act(() => { result.current.addLog('info', 'persisted'); });
    act(() => { jest.advanceTimersByTime(300); });
    const stored = localStorage.getItem('chatr:system-logs');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)[0].event).toBe('persisted');
  });
});
