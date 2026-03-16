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
  getAudioDurationFromBlob: jest.fn().mockResolvedValue(2.5),
}));

const mockEnqueue = jest.fn().mockResolvedValue(undefined);
const mockLoadAllQueued = jest.fn().mockResolvedValue([]);

jest.mock('@/lib/outboundQueue', () => ({
  enqueue: (...args: any[]) => mockEnqueue(...args),
  loadAllQueued: (...args: any[]) => mockLoadAllQueued(...args),
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ messageId: 'server-1', fileUrl: '/uploads/file.jpg' }),
});

import { useMessageInput } from './useMessageInput';

const defaultOpts = { recipientId: 'r1', currentUserId: 'u1' };

describe('useMessageInput', () => {
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
    const { result } = renderHook(() => useMessageInput(defaultOpts));
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
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    expect(result.current.message).toBe('');
    expect(result.current.selectedFiles).toEqual([]);
    expect(result.current.filePreviews).toEqual([]);
    expect(result.current.uploadingFile).toBe(false);
    expect(result.current.effectivelyOnline).toBe(true);
  });

  // ── Message Change & Typing ───────────────────────────

  it('handleMessageChange updates message state', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'Hello' } } as any);
    });
    expect(result.current.message).toBe('Hello');
  });

  it('handleMessageChange emits typing:start when starting to type', () => {
    const onTypingStart = jest.fn();
    const { result } = renderHook(() => useMessageInput({ ...defaultOpts, onTypingStart }));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'H' } } as any);
    });
    expect(mockEmit).toHaveBeenCalledWith('typing:start', { recipientId: 'r1' });
    expect(onTypingStart).toHaveBeenCalled();
  });

  it('handleMessageChange emits typing:stop when input cleared', () => {
    const onTypingStop = jest.fn();
    const { result } = renderHook(() => useMessageInput({ ...defaultOpts, onTypingStop }));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'H' } } as any);
    });
    act(() => {
      result.current.handleMessageChange({ target: { value: '' } } as any);
    });
    expect(mockEmit).toHaveBeenCalledWith('typing:stop', { recipientId: 'r1' });
    expect(onTypingStop).toHaveBeenCalled();
  });

  it('does not emit typing events without socket/recipient/online', () => {
    mockConnected = false;
    const { result } = renderHook(() => useMessageInput({ ...defaultOpts }));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'offline' } } as any);
    });
    expect(mockEmit).not.toHaveBeenCalledWith('typing:start', expect.anything());
  });

  it('stops typing after 8s of inactivity', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'H' } } as any);
    });
    expect(mockEmit).toHaveBeenCalledWith('typing:start', { recipientId: 'r1' });

    act(() => { jest.advanceTimersByTime(8000); });
    expect(mockEmit).toHaveBeenCalledWith('typing:stop', { recipientId: 'r1' });
  });

  it('sends keepalive typing events every 4s', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    act(() => {
      result.current.handleMessageChange({ target: { value: 'typing...' } } as any);
    });
    const initialCalls = mockEmit.mock.calls.filter(c => c[0] === 'typing:start').length;

    act(() => { jest.advanceTimersByTime(4000); });
    const afterKeepalive = mockEmit.mock.calls.filter(c => c[0] === 'typing:start').length;
    expect(afterKeepalive).toBeGreaterThan(initialCalls);
  });

  // ── Message Send ──────────────────────────────────────

  it('handleSend sends a text message when online', () => {
    const onMessageSent = jest.fn();
    const onCancelReply = jest.fn();
    const { result } = renderHook(() =>
      useMessageInput({ ...defaultOpts, onMessageSent, onCancelReply })
    );
    act(() => { result.current.handleMessageChange({ target: { value: 'Hello!' } } as any); });
    act(() => { result.current.handleSend(); });

    expect(onMessageSent).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Hello!',
      senderId: 'u1',
      recipientId: 'r1',
      direction: 'sent',
      status: 'sending',
      type: 'text',
    }));
    expect(mockEmit).toHaveBeenCalledWith('message:send', expect.objectContaining({
      recipientId: 'r1',
      content: 'Hello!',
      type: 'text',
    }));
    expect(mockEnqueue).toHaveBeenCalled();
    expect(onCancelReply).toHaveBeenCalled();
    expect(result.current.message).toBe('');
  });

  it('handleSend shows toast when no recipient', () => {
    const { result } = renderHook(() => useMessageInput({ ...defaultOpts, recipientId: '' }));
    act(() => { result.current.handleMessageChange({ target: { value: 'Hi' } } as any); });
    act(() => { result.current.handleSend(); });
    expect(mockShowToast).toHaveBeenCalledWith('Select a recipient', 'error');
  });

  it('handleSend does nothing on empty message', () => {
    const onMessageSent = jest.fn();
    const { result } = renderHook(() => useMessageInput({ ...defaultOpts, onMessageSent }));
    act(() => { result.current.handleSend(); });
    expect(onMessageSent).not.toHaveBeenCalled();
  });

  it('handleSend queues message when offline', () => {
    mockConnected = false;
    const onMessageSent = jest.fn();
    const { result } = renderHook(() => useMessageInput({ ...defaultOpts, onMessageSent }));
    act(() => { result.current.handleMessageChange({ target: { value: 'offline msg' } } as any); });
    act(() => { result.current.handleSend(); });

    expect(onMessageSent).toHaveBeenCalledWith(expect.objectContaining({
      status: 'queued',
    }));
    expect(mockShowToast).toHaveBeenCalledWith('Message queued — will send when online', 'info');
    expect(mockEnqueue).toHaveBeenCalled();
  });

  it('handleSend stops typing before sending', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    act(() => { result.current.handleMessageChange({ target: { value: 'typing...' } } as any); });
    mockEmit.mockClear();
    act(() => { result.current.handleSend(); });
    expect(mockEmit).toHaveBeenCalledWith('typing:stop', { recipientId: 'r1' });
  });

  it('handleSend includes reply context when replying', () => {
    const replyMsg = {
      id: 'reply-to', content: 'Original msg', senderId: 'r1', recipientId: 'u1',
      senderUsername: '@r1', senderDisplayName: 'R User',
      direction: 'received' as const, status: 'delivered' as const,
      timestamp: new Date(), type: 'text' as const,
    };
    const onMessageSent = jest.fn();
    const { result } = renderHook(() =>
      useMessageInput({ ...defaultOpts, replyingTo: replyMsg, onMessageSent })
    );
    act(() => { result.current.handleMessageChange({ target: { value: 'Reply!' } } as any); });
    act(() => { result.current.handleSend(); });

    expect(onMessageSent).toHaveBeenCalledWith(expect.objectContaining({
      replyTo: expect.objectContaining({ id: 'reply-to' }),
    }));
    expect(mockEmit).toHaveBeenCalledWith('message:send', expect.objectContaining({
      replyTo: expect.objectContaining({ id: 'reply-to' }),
    }));
  });

  // ── Edit Mode ─────────────────────────────────────────

  it('handleSend commits edit when editing a message', async () => {
    const editMsg = {
      id: 'edit-1', content: 'Original', senderId: 'u1', recipientId: 'r1',
      direction: 'sent' as const, status: 'sent' as const, timestamp: new Date(), type: 'text' as const,
    };
    const onEditSaved = jest.fn();
    const onCancelEdit = jest.fn();
    const { result } = renderHook(() =>
      useMessageInput({ ...defaultOpts, editingMessage: editMsg, onEditSaved, onCancelEdit })
    );
    await act(async () => { jest.runAllTimers(); });
    act(() => { result.current.handleMessageChange({ target: { value: 'Updated content' } } as any); });
    act(() => { result.current.handleSend(); });

    expect(mockEmit).toHaveBeenCalledWith('message:edit', expect.objectContaining({
      messageId: 'edit-1',
      content: 'Updated content',
      recipientId: 'r1',
    }));
    expect(onEditSaved).toHaveBeenCalledWith('edit-1', 'Updated content');
    expect(onCancelEdit).toHaveBeenCalled();
    expect(result.current.message).toBe('');
  });

  it('edit mode shows error when offline', () => {
    mockConnected = false;
    const editMsg = {
      id: 'edit-2', content: 'Original', senderId: 'u1', recipientId: 'r1',
      direction: 'sent' as const, status: 'sent' as const, timestamp: new Date(), type: 'text' as const,
    };
    const { result } = renderHook(() =>
      useMessageInput({ ...defaultOpts, editingMessage: editMsg })
    );
    act(() => { result.current.handleMessageChange({ target: { value: 'Changed' } } as any); });
    act(() => { result.current.handleSend(); });
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining("can't edit"), 'error');
  });

  it('populates input when editing starts', async () => {
    const editMsg = {
      id: 'edit-3', content: 'Pre-fill me', senderId: 'u1', recipientId: 'r1',
      direction: 'sent' as const, status: 'sent' as const, timestamp: new Date(), type: 'text' as const,
    };
    const { result, rerender } = renderHook(
      (props) => useMessageInput(props),
      { initialProps: { ...defaultOpts, editingMessage: undefined as any } }
    );
    expect(result.current.message).toBe('');

    rerender({ ...defaultOpts, editingMessage: editMsg });
    await act(async () => { jest.runAllTimers(); });
    expect(result.current.message).toBe('Pre-fill me');
  });

  it('clears input when editing is cancelled', async () => {
    const editMsg = {
      id: 'edit-4', content: 'Edit this', senderId: 'u1', recipientId: 'r1',
      direction: 'sent' as const, status: 'sent' as const, timestamp: new Date(), type: 'text' as const,
    };
    const { result, rerender } = renderHook(
      (props) => useMessageInput(props),
      { initialProps: { ...defaultOpts, editingMessage: editMsg as any } }
    );
    await act(async () => { jest.runAllTimers(); });
    expect(result.current.message).toBe('Edit this');

    rerender({ ...defaultOpts, editingMessage: undefined as any });
    await act(async () => { jest.runAllTimers(); });
    expect(result.current.message).toBe('');
  });

  // ── Emoji ─────────────────────────────────────────────

  it('handleEmojiInsert appends emoji to message', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    act(() => { result.current.handleEmojiInsert('😊'); });
    expect(result.current.message).toBe('😊');
    act(() => { result.current.handleEmojiInsert('👍'); });
    expect(result.current.message).toBe('😊👍');
  });

  // ── File Handling ─────────────────────────────────────

  it('handleFileSelect adds files within size limit', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'size', { value: 100 });

    act(() => {
      result.current.handleFileSelect({
        target: { files: [file], value: 'test.txt' },
      } as any);
    });
    expect(result.current.selectedFiles).toHaveLength(1);
  });

  it('handleFileSelect rejects oversized files', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    const bigFile = new File([''], 'big.zip', { type: 'application/zip' });
    Object.defineProperty(bigFile, 'size', { value: 60 * 1024 * 1024 });

    act(() => {
      result.current.handleFileSelect({
        target: { files: [bigFile], value: 'big.zip' },
      } as any);
    });
    expect(result.current.selectedFiles).toHaveLength(0);
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('exceed 50 MB limit'), 'error');
  });

  it('handleFileSelect handles empty file list', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    act(() => {
      result.current.handleFileSelect({
        target: { files: [], value: '' },
      } as any);
    });
    expect(result.current.selectedFiles).toHaveLength(0);
  });

  it('cancelFileSelection clears all files', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    const file = new File(['x'], 'f.txt', { type: 'text/plain' });
    act(() => {
      result.current.handleFileSelect({ target: { files: [file], value: '' } } as any);
    });
    act(() => { result.current.cancelFileSelection(); });
    expect(result.current.selectedFiles).toEqual([]);
    expect(result.current.filePreviews).toEqual([]);
  });

  it('cancelFileSelection removes specific file by index', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    const f1 = new File(['a'], 'a.txt', { type: 'text/plain' });
    const f2 = new File(['b'], 'b.txt', { type: 'text/plain' });
    act(() => {
      result.current.handleFileSelect({ target: { files: [f1, f2], value: '' } } as any);
    });
    act(() => { result.current.cancelFileSelection(0); });
    expect(result.current.selectedFiles).toHaveLength(1);
    expect(result.current.selectedFiles[0].name).toBe('b.txt');
  });

  // ── Voice Recording ───────────────────────────────────

  it('handleVoiceRecordingStart emits audio:recording', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    act(() => { result.current.handleVoiceRecordingStart(); });
    expect(mockEmit).toHaveBeenCalledWith('audio:recording', { recipientId: 'r1', isRecording: true });
  });

  it('handleVoiceRecordingStop emits audio:recording false', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    act(() => { result.current.handleVoiceRecordingStop(); });
    expect(mockEmit).toHaveBeenCalledWith('audio:recording', { recipientId: 'r1', isRecording: false });
  });

  it('handleVoiceRecording shows error when offline', async () => {
    mockConnected = false;
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    const blob = new Blob(['audio'], { type: 'audio/webm' });
    await act(async () => {
      await result.current.handleVoiceRecording(blob, [1, 2, 3]);
    });
    expect(mockShowToast).toHaveBeenCalledWith('Cannot send voice message', 'error');
  });

  it('handleVoiceRecording uploads and sends via socket', async () => {
    const onMessageSent = jest.fn();
    const { result } = renderHook(() => useMessageInput({ ...defaultOpts, onMessageSent }));
    const blob = new Blob(['audio-data'], { type: 'audio/webm' });

    await act(async () => {
      await result.current.handleVoiceRecording(blob, [0.1, 0.5, 0.8]);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/messages/upload'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(onMessageSent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'audio',
      content: 'Voice message',
    }));
    expect(mockEmit).toHaveBeenCalledWith('message:send', expect.objectContaining({
      type: 'audio',
      recipientId: 'r1',
    }));
    expect(mockShowToast).toHaveBeenCalledWith('Voice message sent', 'success');
  });

  // ── Link Preview ──────────────────────────────────────

  it('setLinkPreview stores preview data', () => {
    const { result } = renderHook(() => useMessageInput(defaultOpts));
    act(() => { result.current.setLinkPreview({ url: 'https://example.com', title: 'Example' }); });
    // No direct state to check, but the ref is set — test it via send
    act(() => { result.current.handleMessageChange({ target: { value: 'Check this link' } } as any); });
    act(() => { result.current.handleSend(); });
    expect(mockEmit).toHaveBeenCalledWith('message:send', expect.objectContaining({
      linkPreview: { url: 'https://example.com', title: 'Example' },
    }));
  });

  it('setLinkPreview cleared after send', () => {
    const onMessageSent = jest.fn();
    const { result } = renderHook(() => useMessageInput({ ...defaultOpts, onMessageSent }));
    act(() => { result.current.setLinkPreview({ url: 'https://example.com' }); });
    act(() => { result.current.handleMessageChange({ target: { value: 'msg' } } as any); });
    act(() => { result.current.handleSend(); });

    // Send again — no link preview
    act(() => { result.current.handleMessageChange({ target: { value: 'msg2' } } as any); });
    act(() => { result.current.handleSend(); });
    const lastCall = mockEmit.mock.calls.filter(c => c[0] === 'message:send').pop();
    expect(lastCall?.[1].linkPreview).toBeNull();
  });

  // ── Queue Flush ───────────────────────────────────────

  it('flushes queued DM messages on reconnect', async () => {
    const queuedItem = {
      id: 'q1', recipientId: 'r1', content: 'queued', type: 'text', tempId: 'temp-q1',
    };
    mockLoadAllQueued.mockResolvedValueOnce([queuedItem]);

    renderHook(() => useMessageInput(defaultOpts));
    await act(async () => { jest.runAllTimers(); });

    expect(mockEmit).toHaveBeenCalledWith('message:send', expect.objectContaining({
      recipientId: 'r1',
      content: 'queued',
      tempId: 'temp-q1',
    }));
  });

  it('does not flush group queued items for DM hook', async () => {
    const groupItem = {
      id: 'g1', groupId: 'group1', content: 'group msg', type: 'text', tempId: 'temp-g1',
    };
    mockLoadAllQueued.mockResolvedValueOnce([groupItem]);

    renderHook(() => useMessageInput(defaultOpts));
    await act(async () => { jest.runAllTimers(); });

    expect(mockEmit).not.toHaveBeenCalledWith('message:send', expect.objectContaining({
      content: 'group msg',
    }));
  });
});
