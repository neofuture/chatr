import { renderHook, act } from '@testing-library/react';
import { useTTS } from './useTTS';

const mockSpeak = jest.fn();
const mockCancel = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak: mockSpeak, cancel: mockCancel },
    writable: true,
    configurable: true,
  });
  (global as any).SpeechSynthesisUtterance = jest.fn().mockImplementation(() => ({
    rate: 1, pitch: 1, volume: 1,
    onstart: null, onend: null, onerror: null,
  }));
});

describe('useTTS', () => {
  it('should detect speech synthesis support', () => {
    const { result } = renderHook(() => useTTS());
    expect(result.current.supported).toBe(true);
    expect(result.current.speakingId).toBeNull();
  });

  it('should start speaking', () => {
    const { result } = renderHook(() => useTTS());
    act(() => { result.current.speak('msg-1', 'Hello world'); });
    expect(mockSpeak).toHaveBeenCalled();
    expect(result.current.speakingId).toBe('msg-1');
  });

  it('should stop speaking when stop is called', () => {
    const { result } = renderHook(() => useTTS());
    act(() => { result.current.speak('msg-1', 'Hello'); });
    act(() => { result.current.stop(); });
    expect(mockCancel).toHaveBeenCalled();
    expect(result.current.speakingId).toBeNull();
  });

  it('should toggle off when same id is spoken again', () => {
    const { result } = renderHook(() => useTTS());
    act(() => { result.current.speak('msg-1', 'Hello'); });
    act(() => { result.current.speak('msg-1', 'Hello'); });
    expect(mockCancel).toHaveBeenCalled();
    expect(result.current.speakingId).toBeNull();
  });

  it('should cancel previous before new utterance', () => {
    const { result } = renderHook(() => useTTS());
    act(() => { result.current.speak('msg-1', 'Hello'); });
    act(() => { result.current.speak('msg-2', 'World'); });
    expect(mockCancel).toHaveBeenCalledTimes(2);
    expect(result.current.speakingId).toBe('msg-2');
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useTTS());
    unmount();
    expect(mockCancel).toHaveBeenCalled();
  });
});
