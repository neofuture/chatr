import { renderHook, act } from '@testing-library/react';
import { ConfirmationProvider, useConfirmation } from './ConfirmationContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ConfirmationProvider>{children}</ConfirmationProvider>
);

describe('ConfirmationContext', () => {
  it('should start with no confirmation', () => {
    const { result } = renderHook(() => useConfirmation(), { wrapper });
    expect(result.current.currentConfirmation).toBeNull();
  });

  it('should show a confirmation dialog', async () => {
    const { result } = renderHook(() => useConfirmation(), { wrapper });
    let promise: Promise<any>;
    act(() => {
      promise = result.current.showConfirmation({
        title: 'Delete?', message: 'Are you sure?',
        actions: [{ label: 'Yes', value: true }, { label: 'No', value: false }],
      });
    });
    expect(result.current.currentConfirmation).not.toBeNull();
    expect(result.current.currentConfirmation?.title).toBe('Delete?');
    expect(result.current.currentConfirmation?.message).toBe('Are you sure?');
  });

  it('should close confirmation and resolve promise', async () => {
    const { result } = renderHook(() => useConfirmation(), { wrapper });
    let resolved: any;
    act(() => {
      result.current.showConfirmation({
        title: 'Test', message: 'msg',
        actions: [{ label: 'OK', value: 'ok' }],
      }).then(v => { resolved = v; });
    });
    act(() => { result.current.closeConfirmation('ok'); });
    await new Promise(r => setTimeout(r, 0));
    expect(resolved).toBe('ok');
    expect(result.current.currentConfirmation).toBeNull();
  });

  it('should throw when used outside provider', () => {
    expect(() => {
      renderHook(() => useConfirmation());
    }).toThrow('useConfirmation must be used within ConfirmationProvider');
  });
});
