import { renderHook, act } from '@testing-library/react';

const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();
let mockConnected = true;

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: { emit: mockEmit, on: mockOn, off: mockOff, connected: mockConnected },
    connected: mockConnected,
    connecting: false,
    disconnect: jest.fn(),
    reconnect: jest.fn(),
  }),
}));

const mockShowToast = jest.fn();
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ toasts: [], showToast: mockShowToast, removeToast: jest.fn() }),
}));

jest.mock('@/utils/extractWaveform', () => ({
  extractWaveformFromFile: jest.fn().mockResolvedValue({ waveform: [1, 2, 3], duration: 5 }),
}));
jest.mock('@/utils/audio', () => ({
  getAudioDurationFromBlob: jest.fn().mockResolvedValue(3.0),
}));

const mockEnqueue = jest.fn().mockResolvedValue(undefined);
const mockLoadAllQueued = jest.fn().mockResolvedValue([]);

jest.mock('@/lib/outboundQueue', () => ({
  enqueue: (...args: any[]) => mockEnqueue(...args),
  loadAllQueued: (...args: any[]) => mockLoadAllQueued(...args),
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ messageId: 'grp-msg-1', fileUrl: '/uploads/grp-file.jpg' }),
});

import { useGroupMessageInput } from './useGroupMessageInput';

const defaultOpts = { groupId: 'g1', currentUserId: 'u1' };

describe('useGroupMessageInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockConnected = true;
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Interface & Initial State ─────────────────────────

  it('returns expected interface', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    expect(result.current).toHaveProperty('message');
    expect(result.current).toHaveProperty('selectedFiles');
    expect(result.current).toHaveProperty('filePreviews');
    expect(result.current).toHaveProperty('uploadingFile');
    expect(result.current).toHaveProperty('effectivelyOnline');
    expect(result.current).toHaveProperty('handleMessageChange');
    expect(result.current).toHaveProperty('handleSend');
    expect(result.current).toHaveProperty('handleEmojiInsert');
    expect(result.current).toHaveProperty('handleFileSelect');
    expect(result.current).toHaveProperty('cancelFileSelection');
    expect(result.current).toHaveProperty('sendFiles');
    expect(result.current).toHaveProperty('handleVoiceRecording');
    expect(result.current).toHaveProperty('handleVoiceRecordingStart');
    expect(result.current).toHaveProperty('handleVoiceRecordingStop');
    expect(result.current).toHaveProperty('setLinkPreview');
  });

  it('starts with empty/default state', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    expect(result.current.message).toBe('');
    expect(result.current.selectedFiles).toEqual([]);
    expect(result.current.filePreviews).toEqual([]);
    expect(result.current.uploadingFile).toBe(false);
    expect(result.current.effectivelyOnline).toBe(true);
  });

  // ── Message Change & Typing ───────────────────────────

  it('handleMessageChange updates message state', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'Group msg' } } as any);
    });
    expect(result.current.message).toBe('Group msg');
  });

  it('handleMessageChange emits group:typing start', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'Hi' } } as any);
    });
    expect(mockEmit).toHaveBeenCalledWith('group:typing', { groupId: 'g1', isTyping: true });
  });

  it('handleMessageChange emits group:typing stop when input cleared', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'Hi' } } as any);
    });
    act(() => {
      result.current.handleMessageChange({ target: { value: '' } } as any);
    });
    expect(mockEmit).toHaveBeenCalledWith('group:typing', { groupId: 'g1', isTyping: false });
  });

  it('does not emit typing when offline', () => {
    mockConnected = false;
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'offline' } } as any);
    });
    expect(mockEmit).not.toHaveBeenCalledWith('group:typing', expect.anything());
  });

  it('stops typing after 8s inactivity timeout', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'typing' } } as any);
    });
    act(() => { jest.advanceTimersByTime(8000); });
    expect(mockEmit).toHaveBeenCalledWith('group:typing', { groupId: 'g1', isTyping: false });
  });

  it('sends typing keepalive every 4s', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'typing...' } } as any);
    });
    const initialCalls = mockEmit.mock.calls.filter(c => c[0] === 'group:typing' && c[1].isTyping === true).length;

    act(() => { jest.advanceTimersByTime(4000); });
    const afterKeep = mockEmit.mock.calls.filter(c => c[0] === 'group:typing' && c[1].isTyping === true).length;
    expect(afterKeep).toBeGreaterThan(initialCalls);
  });

  // ── Message Send ──────────────────────────────────────

  it('handleSend sends group message when online', () => {
    const onMessageSent = jest.fn();
    const { result } = renderHook(() => useGroupMessageInput({ ...defaultOpts, onMessageSent }));
    act(() => { result.current.handleMessageChange({ target: { value: 'Hello group!' } } as any); });
    act(() => { result.current.handleSend(); });

    expect(onMessageSent).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Hello group!',
      senderId: 'u1',
      recipientId: 'g1',
      direction: 'sent',
      status: 'sending',
      type: 'text',
    }));
    expect(mockEmit).toHaveBeenCalledWith('group:message', expect.objectContaining({
      groupId: 'g1',
      content: 'Hello group!',
      type: 'text',
    }));
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello group!' }), 'g1');
    expect(result.current.message).toBe('');
  });

  it('handleSend does nothing when no groupId', () => {
    const onMessageSent = jest.fn();
    const { result } = renderHook(() => useGroupMessageInput({ ...defaultOpts, groupId: '', onMessageSent }));
    act(() => { result.current.handleMessageChange({ target: { value: 'msg' } } as any); });
    act(() => { result.current.handleSend(); });
    expect(onMessageSent).not.toHaveBeenCalled();
  });

  it('handleSend does nothing on empty message', () => {
    const onMessageSent = jest.fn();
    const { result } = renderHook(() => useGroupMessageInput({ ...defaultOpts, onMessageSent }));
    act(() => { result.current.handleSend(); });
    expect(onMessageSent).not.toHaveBeenCalled();
  });

  it('handleSend queues message when offline', () => {
    mockConnected = false;
    const onMessageSent = jest.fn();
    const { result } = renderHook(() => useGroupMessageInput({ ...defaultOpts, onMessageSent }));
    act(() => { result.current.handleMessageChange({ target: { value: 'offline' } } as any); });
    act(() => { result.current.handleSend(); });

    expect(onMessageSent).toHaveBeenCalledWith(expect.objectContaining({ status: 'queued' }));
    expect(mockShowToast).toHaveBeenCalledWith('Message queued — will send when online', 'info');
    expect(mockEnqueue).toHaveBeenCalled();
  });

  it('handleSend stops typing before sending', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => { result.current.handleMessageChange({ target: { value: 'typing' } } as any); });
    mockEmit.mockClear();
    act(() => { result.current.handleSend(); });
    expect(mockEmit).toHaveBeenCalledWith('group:typing', { groupId: 'g1', isTyping: false });
  });

  it('handleSend includes link preview when set', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => { result.current.setLinkPreview({ url: 'https://example.com' }); });
    act(() => { result.current.handleMessageChange({ target: { value: 'link' } } as any); });
    act(() => { result.current.handleSend(); });
    expect(mockEmit).toHaveBeenCalledWith('group:message', expect.objectContaining({
      linkPreview: { url: 'https://example.com' },
    }));
  });

  // ── Emoji ─────────────────────────────────────────────

  it('handleEmojiInsert appends emoji', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => { result.current.handleEmojiInsert('🎉'); });
    expect(result.current.message).toBe('🎉');
    act(() => { result.current.handleEmojiInsert('🔥'); });
    expect(result.current.message).toBe('🎉🔥');
  });

  // ── File Handling ─────────────────────────────────────

  it('handleFileSelect adds files', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    const file = new File(['data'], 'pic.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1000 });
    act(() => {
      result.current.handleFileSelect({
        target: { files: [file], value: 'pic.png' },
      } as any);
    });
    expect(result.current.selectedFiles).toHaveLength(1);
  });

  it('handleFileSelect rejects oversized files', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    const big = new File([''], 'huge.zip', { type: 'application/zip' });
    Object.defineProperty(big, 'size', { value: 60 * 1024 * 1024 });
    act(() => {
      result.current.handleFileSelect({ target: { files: [big], value: '' } } as any);
    });
    expect(result.current.selectedFiles).toHaveLength(0);
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('exceed 50 MB'), 'error');
  });

  it('cancelFileSelection clears all', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    const file = new File(['x'], 'x.txt', { type: 'text/plain' });
    act(() => { result.current.handleFileSelect({ target: { files: [file], value: '' } } as any); });
    act(() => { result.current.cancelFileSelection(); });
    expect(result.current.selectedFiles).toEqual([]);
  });

  it('cancelFileSelection removes specific file by index', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' });
    const f2 = new File(['b'], 'b.txt', { type: 'text/plain' });
    act(() => { result.current.handleFileSelect({ target: { files: [f1, f2], value: '' } } as any); });
    act(() => { result.current.cancelFileSelection(0); });
    expect(result.current.selectedFiles).toHaveLength(1);
    expect(result.current.selectedFiles[0].name).toBe('b.txt');
  });

  // ── sendFiles ─────────────────────────────────────────

  it('sendFiles uploads and emits group:message', async () => {
    const onMessageSent = jest.fn();
    const { result } = renderHook(() => useGroupMessageInput({ ...defaultOpts, onMessageSent }));
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1000 });
    act(() => { result.current.handleFileSelect({ target: { files: [file], value: '' } } as any); });

    await act(async () => { await result.current.sendFiles(); });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/groups/g1/upload'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(onMessageSent).toHaveBeenCalledWith(expect.objectContaining({ type: 'image' }));
    expect(mockEmit).toHaveBeenCalledWith('group:message', expect.objectContaining({
      groupId: 'g1',
      type: 'image',
    }));
    expect(mockShowToast).toHaveBeenCalledWith('File sent', 'success');
    expect(result.current.selectedFiles).toEqual([]);
  });

  it('sendFiles does nothing when no files selected', async () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    await act(async () => { await result.current.sendFiles(); });
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/groups/'), expect.anything());
  });

  it('sendFiles does nothing when offline', async () => {
    mockConnected = false;
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    const file = new File(['x'], 'x.txt', { type: 'text/plain' });
    act(() => { result.current.handleFileSelect({ target: { files: [file], value: '' } } as any); });
    await act(async () => { await result.current.sendFiles(); });
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/groups/'), expect.anything());
  });

  it('sendFiles handles upload failure gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    const file = new File(['img'], 'fail.jpg', { type: 'image/jpeg' });
    act(() => { result.current.handleFileSelect({ target: { files: [file], value: '' } } as any); });

    await act(async () => { await result.current.sendFiles(); });
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Upload failed'), 'error');
  });

  // ── Voice Recording ───────────────────────────────────

  it('handleVoiceRecordingStart emits group:typing with isRecording', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => { result.current.handleVoiceRecordingStart(); });
    expect(mockEmit).toHaveBeenCalledWith('group:typing', {
      groupId: 'g1', isTyping: false, isRecording: true,
    });
  });

  it('handleVoiceRecordingStop emits group:typing with isRecording false', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => { result.current.handleVoiceRecordingStop(); });
    expect(mockEmit).toHaveBeenCalledWith('group:typing', {
      groupId: 'g1', isTyping: false, isRecording: false,
    });
  });

  it('handleVoiceRecording shows error when offline', async () => {
    mockConnected = false;
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    const blob = new Blob(['audio'], { type: 'audio/webm' });
    await act(async () => {
      await result.current.handleVoiceRecording(blob, [1, 2]);
    });
    expect(mockShowToast).toHaveBeenCalledWith('Cannot send voice message', 'error');
  });

  it('handleVoiceRecording uploads and sends via socket', async () => {
    const onMessageSent = jest.fn();
    const { result } = renderHook(() => useGroupMessageInput({ ...defaultOpts, onMessageSent }));
    const blob = new Blob(['audio-data'], { type: 'audio/webm' });

    await act(async () => {
      await result.current.handleVoiceRecording(blob, [0.1, 0.5]);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/groups/g1/upload'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(onMessageSent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'audio',
      content: 'Voice message',
    }));
    expect(mockEmit).toHaveBeenCalledWith('group:message', expect.objectContaining({
      groupId: 'g1',
      type: 'audio',
    }));
    expect(mockShowToast).toHaveBeenCalledWith('Voice message sent', 'success');
  });

  it('handleVoiceRecording handles upload failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    const blob = new Blob(['audio'], { type: 'audio/webm' });

    await act(async () => {
      await result.current.handleVoiceRecording(blob, [1]);
    });
    expect(mockShowToast).toHaveBeenCalledWith('Upload failed', 'error');
  });

  // ── Queue Flush ───────────────────────────────────────

  it('flushes queued group messages on reconnect', async () => {
    const queuedItem = {
      id: 'gq1', groupId: 'g1', content: 'queued grp msg', type: 'text', tempId: 'temp-gq1',
    };
    mockLoadAllQueued.mockResolvedValueOnce([queuedItem]);

    renderHook(() => useGroupMessageInput(defaultOpts));
    await act(async () => { jest.runAllTimers(); });

    expect(mockEmit).toHaveBeenCalledWith('group:message', expect.objectContaining({
      groupId: 'g1',
      content: 'queued grp msg',
      tempId: 'temp-gq1',
    }));
  });

  it('does not flush items from other groups', async () => {
    const otherGroupItem = {
      id: 'gq2', groupId: 'g2', content: 'other group', type: 'text', tempId: 'temp-gq2',
    };
    mockLoadAllQueued.mockResolvedValueOnce([otherGroupItem]);

    renderHook(() => useGroupMessageInput(defaultOpts));
    await act(async () => { jest.runAllTimers(); });

    expect(mockEmit).not.toHaveBeenCalledWith('group:message', expect.objectContaining({
      content: 'other group',
    }));
  });

  // ── setLinkPreview ────────────────────────────────────

  it('setLinkPreview stores and clears after send', () => {
    const { result } = renderHook(() => useGroupMessageInput(defaultOpts));
    act(() => { result.current.setLinkPreview({ url: 'https://test.com' }); });
    act(() => { result.current.handleMessageChange({ target: { value: 'link msg' } } as any); });
    act(() => { result.current.handleSend(); });
    expect(mockEmit).toHaveBeenCalledWith('group:message', expect.objectContaining({
      linkPreview: { url: 'https://test.com' },
    }));

    // Second send should have null link preview
    act(() => { result.current.handleMessageChange({ target: { value: 'msg2' } } as any); });
    act(() => { result.current.handleSend(); });
    const lastGroupEmit = mockEmit.mock.calls.filter(c => c[0] === 'group:message').pop();
    expect(lastGroupEmit?.[1].linkPreview).toBeNull();
  });
});
