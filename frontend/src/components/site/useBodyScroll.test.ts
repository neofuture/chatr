import { renderHook } from '@testing-library/react';
import { useBodyScroll } from './useBodyScroll';

describe('useBodyScroll', () => {
  it('sets overscroll-behavior-y to auto on mount', () => {
    renderHook(() => useBodyScroll());
    expect(document.body.style.getPropertyValue('overscroll-behavior-y')).toBe('auto');
    expect(document.body.style.getPropertyPriority('overscroll-behavior-y')).toBe('important');
  });

  it('removes overscroll-behavior-y on unmount', () => {
    const { unmount } = renderHook(() => useBodyScroll());
    expect(document.body.style.getPropertyValue('overscroll-behavior-y')).toBe('auto');
    unmount();
    expect(document.body.style.getPropertyValue('overscroll-behavior-y')).toBe('');
  });

  it('does not throw on multiple mounts', () => {
    const { unmount: u1 } = renderHook(() => useBodyScroll());
    const { unmount: u2 } = renderHook(() => useBodyScroll());
    expect(document.body.style.getPropertyValue('overscroll-behavior-y')).toBe('auto');
    u1();
    u2();
  });
});
