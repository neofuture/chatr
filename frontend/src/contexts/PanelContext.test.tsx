import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { PanelProvider, usePanels } from './PanelContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PanelProvider>{children}</PanelProvider>
);

describe('PanelContext', () => {
  it('should start with no panels', () => {
    const { result } = renderHook(() => usePanels(), { wrapper });
    expect(result.current.panels).toEqual([]);
    expect(result.current.maxLevel).toBe(-1);
  });

  it('should open a panel', () => {
    const { result } = renderHook(() => usePanels(), { wrapper });
    act(() => { result.current.openPanel('chat-1', React.createElement('div'), 'Chat'); });
    expect(result.current.panels).toHaveLength(1);
    expect(result.current.panels[0].id).toBe('chat-1');
    expect(result.current.panels[0].title).toBe('Chat');
  });

  it('should stack panels with increasing levels', () => {
    const { result } = renderHook(() => usePanels(), { wrapper });
    act(() => { result.current.openPanel('p1', React.createElement('div'), 'P1'); });
    act(() => { result.current.openPanel('p2', React.createElement('div'), 'P2'); });
    expect(result.current.panels).toHaveLength(2);
    expect(result.current.panels[1].level).toBeGreaterThan(result.current.panels[0].level);
  });

  it('should update existing panel instead of duplicating', () => {
    const { result } = renderHook(() => usePanels(), { wrapper });
    act(() => { result.current.openPanel('p1', React.createElement('div'), 'Title1'); });
    act(() => { result.current.openPanel('p1', React.createElement('div'), 'Title2'); });
    expect(result.current.panels).toHaveLength(1);
    expect(result.current.panels[0].title).toBe('Title2');
  });

  it('should close a panel', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => usePanels(), { wrapper });
    act(() => { result.current.openPanel('p1', React.createElement('div'), 'P1'); });
    act(() => { result.current.closePanel('p1'); });
    act(() => { jest.advanceTimersByTime(300); });
    expect(result.current.panels).toHaveLength(0);
    jest.useRealTimers();
  });

  it('should close all panels', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => usePanels(), { wrapper });
    act(() => { result.current.openPanel('p1', React.createElement('div')); });
    act(() => { result.current.openPanel('p2', React.createElement('div')); });
    act(() => { result.current.closeAllPanels(); });
    act(() => { jest.advanceTimersByTime(300); });
    expect(result.current.panels).toHaveLength(0);
    jest.useRealTimers();
  });

  it('should throw when used outside provider', () => {
    expect(() => { renderHook(() => usePanels()); }).toThrow();
  });
});
