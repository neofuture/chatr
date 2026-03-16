import { renderHook, act } from '@testing-library/react';

const mockOn = jest.fn();
const mockOff = jest.fn();
const mockEmit = jest.fn();
const mockDisconnect = jest.fn();
const mockReconnect = jest.fn();

let mockConnected = true;

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: { on: mockOn, off: mockOff, emit: mockEmit, connected: mockConnected },
    connected: mockConnected,
    connecting: false,
    disconnect: mockDisconnect,
    reconnect: mockReconnect,
  }),
}));

const mockShowToast = jest.fn();
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ toasts: [], showToast: mockShowToast, removeToast: jest.fn() }),
}));

const mockSetSetting = jest.fn();
jest.mock('@/contexts/UserSettingsContext', () => ({
  useUserSettings: () => ({
    settings: {
      ghostTypingEnabled: false,
      privacyOnlineStatus: 'everyone',
      privacyPhone: 'nobody',
      privacyEmail: 'nobody',
      privacyFullName: 'everyone',
      privacyGender: 'nobody',
      privacyJoinedDate: 'everyone',
    },
    setSetting: mockSetSetting,
  }),
}));

const mockAddLog = jest.fn();
jest.mock('@/contexts/LogContext', () => ({
  useLog: () => ({ logs: [], addLog: mockAddLog, clearLogs: jest.fn(), copyLogs: jest.fn() }),
}));

jest.mock('@/utils/extractWaveform', () => ({ extractWaveformFromFile: jest.fn() }));

const mockLoadCachedMessages = jest.fn().mockResolvedValue([]);
const mockCacheMessages = jest.fn().mockResolvedValue(undefined);
const mockCacheMessage = jest.fn().mockResolvedValue(undefined);
const mockUpdateCachedMessage = jest.fn().mockResolvedValue(undefined);
const mockReplaceCachedMessageId = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/messageCache', () => ({
  loadCachedMessages: (...args: any[]) => mockLoadCachedMessages(...args),
  cacheMessages: (...args: any[]) => mockCacheMessages(...args),
  cacheMessage: (...args: any[]) => mockCacheMessage(...args),
  updateCachedMessage: (...args: any[]) => mockUpdateCachedMessage(...args),
  replaceCachedMessageId: (...args: any[]) => mockReplaceCachedMessageId(...args),
}));

jest.mock('@/lib/socketRPC', () => ({
  socketFirst: jest.fn().mockResolvedValue({ users: [], conversations: [] }),
}));

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ messages: [], users: [] }) });

import { useConversation } from './useConversation';

function setupUser(id = 'u1', username = '@test', displayName = 'Test User') {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('user', JSON.stringify({ id, username, displayName }));
}

function getSocketHandler(eventName: string): ((...args: any[]) => void) | undefined {
  const calls = mockOn.mock.calls.filter((c: any[]) => c[0] === eventName);
  const call = calls[calls.length - 1];
  return call ? call[1] : undefined;
}

describe('useConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockConnected = true;
    localStorage.clear();
    setupUser();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Interface & Initial State ─────────────────────────

  it('returns expected interface with all handlers and state', () => {
    const { result } = renderHook(() => useConversation());
    expect(result.current).toHaveProperty('messages');
    expect(result.current).toHaveProperty('currentUserId');
    expect(result.current).toHaveProperty('handleMessageSend');
    expect(result.current).toHaveProperty('handleMessageInputChange');
    expect(result.current).toHaveProperty('handleEmojiInsert');
    expect(result.current).toHaveProperty('handleFileSelect');
    expect(result.current).toHaveProperty('cancelFileSelection');
    expect(result.current).toHaveProperty('sendFile');
    expect(result.current).toHaveProperty('handleVoiceRecording');
    expect(result.current).toHaveProperty('handleReaction');
    expect(result.current).toHaveProperty('handleUnsend');
    expect(result.current).toHaveProperty('handleStartEdit');
    expect(result.current).toHaveProperty('handleCancelEdit');
    expect(result.current).toHaveProperty('handleEditMessage');
    expect(result.current).toHaveProperty('editLastSentMessage');
    expect(result.current).toHaveProperty('handleTypingStart');
    expect(result.current).toHaveProperty('handleTypingStop');
    expect(result.current).toHaveProperty('handlePresenceUpdate');
    expect(result.current).toHaveProperty('handlePresenceRequest');
    expect(result.current).toHaveProperty('handleGhostTypingToggle');
    expect(result.current).toHaveProperty('handleRecipientChange');
    expect(result.current).toHaveProperty('handleReply');
    expect(result.current).toHaveProperty('clearReply');
    expect(result.current).toHaveProperty('replyingTo');
    expect(result.current).toHaveProperty('editingMessage');
    expect(result.current).toHaveProperty('userPresence');
    expect(result.current).toHaveProperty('conversations');
    expect(result.current).toHaveProperty('effectivelyOnline');
  });

  it('starts with empty messages and default state', () => {
    const { result } = renderHook(() => useConversation());
    expect(result.current.messages).toEqual([]);
    expect(result.current.messageQueue).toEqual([]);
    expect(result.current.isRecipientTyping).toBe(false);
    expect(result.current.isUserTyping).toBe(false);
    expect(result.current.ghostTypingEnabled).toBe(false);
    expect(result.current.recipientGhostText).toBe('');
    expect(result.current.isRecipientRecording).toBe(false);
    expect(result.current.isRecipientListeningToMyAudio).toBeNull();
    expect(result.current.selectedFiles).toEqual([]);
    expect(result.current.filePreviews).toEqual([]);
    expect(result.current.uploadingFile).toBe(false);
    expect(result.current.replyingTo).toBeNull();
    expect(result.current.editingMessage).toBeNull();
    expect(result.current.activeAudioMessageId).toBeNull();
  });

  it('loads user from localStorage on mount', async () => {
    renderHook(() => useConversation());
    await act(async () => { jest.runAllTimers(); });
    expect(mockAddLog).toHaveBeenCalledWith('info', 'user:loaded', expect.objectContaining({ userId: 'u1' }));
  });

  it('handles missing user in localStorage gracefully', async () => {
    localStorage.removeItem('user');
    const { result } = renderHook(() => useConversation());
    await act(async () => { jest.runAllTimers(); });
    expect(result.current.currentUserId).toBe('');
  });

  it('handles invalid JSON in user localStorage', async () => {
    localStorage.setItem('user', 'not-json');
    renderHook(() => useConversation());
    await act(async () => { jest.runAllTimers(); });
    expect(mockAddLog).toHaveBeenCalledWith('error', 'user:parse-failed', expect.anything());
  });

  // ── Socket Listeners ─────────────────────────────────

  it('registers all expected socket listeners on mount', () => {
    renderHook(() => useConversation());
    const events = mockOn.mock.calls.map((c: any[]) => c[0]);
    expect(events).toContain('message:received');
    expect(events).toContain('message:sent');
    expect(events).toContain('message:status');
    expect(events).toContain('typing:status');
    expect(events).toContain('ghost:typing');
    expect(events).toContain('audio:recording');
    expect(events).toContain('audio:listening');
    expect(events).toContain('audio:waveform');
    expect(events).toContain('user:status');
    expect(events).toContain('presence:response');
    expect(events).toContain('message:reaction');
    expect(events).toContain('message:unsent');
    expect(events).toContain('message:edited');
  });

  it('cleans up all socket listeners on unmount', () => {
    const { unmount } = renderHook(() => useConversation());
    unmount();
    const events = mockOff.mock.calls.map((c: any[]) => c[0]);
    expect(events).toContain('message:received');
    expect(events).toContain('message:sent');
    expect(events).toContain('message:status');
    expect(events).toContain('typing:status');
    expect(events).toContain('ghost:typing');
    expect(events).toContain('audio:recording');
    expect(events).toContain('audio:listening');
    expect(events).toContain('audio:waveform');
    expect(events).toContain('user:status');
    expect(events).toContain('presence:response');
    expect(events).toContain('message:reaction');
    expect(events).toContain('message:unsent');
    expect(events).toContain('message:edited');
  });

  // ── Message Sending ─────────────────────────────────

  it('does not send when no recipient is selected', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleMessageSend(); });
    expect(mockShowToast).toHaveBeenCalledWith('Select a recipient', 'error');
  });

  it('does not send empty messages', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => { result.current.handleMessageSend(); });
    expect(mockEmit).not.toHaveBeenCalledWith('message:send', expect.anything(), expect.anything());
  });

  it('sends a text message and updates state', async () => {
    const { result } = renderHook(() => useConversation());
    await act(async () => { jest.runAllTimers(); });

    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => {
      result.current.handleMessageInputChange({ target: { value: 'Hello!' } } as any);
    });
    act(() => { result.current.handleMessageSend(); });

    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].content).toBe('Hello!');
    expect(result.current.messages[0].direction).toBe('sent');
    expect(result.current.messages[0].status).toBe('sending');
    expect(mockEmit).toHaveBeenCalledWith('message:send', expect.objectContaining({
      recipientId: 'r1',
      content: 'Hello!',
      type: 'text',
    }), expect.any(Function));
    expect(mockCacheMessage).toHaveBeenCalled();
  });

  // ── Emoji Insert ────────────────────────────────────

  it('inserts emoji into message', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleEmojiInsert('😊'); });
    expect(result.current.testMessage).toBe('😊');
    act(() => { result.current.handleEmojiInsert('👍'); });
    expect(result.current.testMessage).toBe('😊👍');
  });

  // ── Recipient Change ────────────────────────────────

  it('clears messages and unread on recipient change', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    expect(result.current.testRecipientId).toBe('r1');
    expect(result.current.messages).toEqual([]);
    expect(mockAddLog).toHaveBeenCalledWith('info', 'recipient:selected', { userId: 'r1' });
  });

  it('persists selected recipient to localStorage', async () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    await act(async () => { jest.runAllTimers(); });
    expect(localStorage.getItem('chatr:lastRecipient')).toBe('r1');
  });

  // ── Typing Handlers ─────────────────────────────────

  it('handleTypingStart emits typing:start via socket', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => { result.current.handleTypingStart(); });
    expect(mockEmit).toHaveBeenCalledWith('typing:start', { recipientId: 'r1' });
    expect(mockShowToast).toHaveBeenCalledWith('Typing started', 'success');
  });

  it('handleTypingStop emits typing:stop via socket', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => { result.current.handleTypingStop(); });
    expect(mockEmit).toHaveBeenCalledWith('typing:stop', { recipientId: 'r1' });
    expect(mockShowToast).toHaveBeenCalledWith('Typing stopped', 'success');
  });

  it('shows error toast when typing start is called without connection', () => {
    mockConnected = false;
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleTypingStart(); });
    expect(mockShowToast).toHaveBeenCalledWith('Not connected', 'error');
  });

  // ── Presence Handlers ───────────────────────────────

  it('handlePresenceUpdate emits presence:update', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handlePresenceUpdate('away'); });
    expect(mockEmit).toHaveBeenCalledWith('presence:update', 'away');
    expect(mockShowToast).toHaveBeenCalledWith('Presence: away', 'success');
  });

  it('handlePresenceRequest emits presence:request', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => { result.current.handlePresenceRequest(); });
    expect(mockEmit).toHaveBeenCalledWith('presence:request', ['r1']);
    expect(mockShowToast).toHaveBeenCalledWith('Presence requested', 'success');
  });

  // ── Ghost Typing Toggle ─────────────────────────────

  it('handleGhostTypingToggle updates setting and shows toast', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleGhostTypingToggle(true); });
    expect(mockSetSetting).toHaveBeenCalledWith('ghostTypingEnabled', true);
    expect(mockShowToast).toHaveBeenCalledWith('Ghost typing on', 'info');
  });

  it('handleGhostTypingToggle off clears ghost text', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => { result.current.handleGhostTypingToggle(false); });
    expect(mockSetSetting).toHaveBeenCalledWith('ghostTypingEnabled', false);
    expect(mockShowToast).toHaveBeenCalledWith('Ghost typing off', 'info');
  });

  // ── Socket Event: message:received ──────────────────

  it('handles message:received for active conversation', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('sender1'); });
    const handler = getSocketHandler('message:received');
    expect(handler).toBeDefined();
    act(() => {
      handler!({
        id: 'msg1',
        content: 'Hello from sender',
        senderId: 'sender1',
        senderUsername: '@sender',
        timestamp: new Date().toISOString(),
        type: 'text',
      });
    });
    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].direction).toBe('received');
    expect(result.current.messages[0].status).toBe('delivered');
    expect(mockCacheMessage).toHaveBeenCalled();
  });

  it('handles message:received for non-active conversation (increments unread)', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('other-user'); });
    const handler = getSocketHandler('message:received');
    act(() => {
      handler!({
        id: 'msg2',
        content: 'Hello',
        senderId: 'sender1',
        senderUsername: '@sender',
        type: 'text',
      });
    });
    // Message not added to current conversation
    expect(result.current.messages.length).toBe(0);
    // But conversation summary should be updated
    expect(result.current.conversations['sender1']).toBeDefined();
    expect(result.current.conversations['sender1'].unreadCount).toBe(1);
  });

  // ── Socket Event: message:sent ──────────────────────

  it('handles message:sent - updates sending to sent status', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => {
      result.current.handleMessageInputChange({ target: { value: 'Hi' } } as any);
    });
    act(() => { result.current.handleMessageSend(); });

    const sentHandler = getSocketHandler('message:sent');
    expect(sentHandler).toBeDefined();
    act(() => {
      sentHandler!({
        id: 'server-id-1',
        recipientId: 'r1',
        status: 'sent',
      });
    });
    const msg = result.current.messages[0];
    expect(msg.status).toBe('sent');
    expect(msg.id).toBe('server-id-1');
  });

  // ── Socket Event: message:status ────────────────────

  it('handles message:status updates', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => {
      result.current.handleMessageInputChange({ target: { value: 'Hi' } } as any);
    });
    act(() => { result.current.handleMessageSend(); });
    const msgId = result.current.messages[0].id;

    const statusHandler = getSocketHandler('message:status');
    act(() => {
      statusHandler!({ messageId: msgId, status: 'delivered' });
    });
    expect(result.current.messages[0].status).toBe('delivered');
  });

  // ── Socket Event: typing:status ─────────────────────

  it('handles typing:status - sets recipient typing', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('sender1'); });

    const typingHandler = getSocketHandler('typing:status');
    act(() => {
      typingHandler!({ userId: 'sender1', isTyping: true });
    });
    expect(result.current.isRecipientTyping).toBe(true);
  });

  it('handles typing:status - creates a fallback timeout', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('sender1'); });

    const typingHandler = getSocketHandler('typing:status');
    act(() => { typingHandler!({ userId: 'sender1', isTyping: true }); });
    expect(result.current.isRecipientTyping).toBe(true);

    // Verify it can be turned off by a stop event
    act(() => { typingHandler!({ userId: 'sender1', isTyping: false }); });
    expect(result.current.isRecipientTyping).toBe(false);
  });

  it('handles typing:status - stop typing explicitly', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('sender1'); });

    const typingHandler = getSocketHandler('typing:status');
    act(() => { typingHandler!({ userId: 'sender1', isTyping: true }); });
    expect(result.current.isRecipientTyping).toBe(true);

    act(() => { typingHandler!({ userId: 'sender1', isTyping: false }); });
    expect(result.current.isRecipientTyping).toBe(false);
  });

  it('ignores typing events from non-active recipient', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });

    const typingHandler = getSocketHandler('typing:status');
    act(() => { typingHandler!({ userId: 'other-user', isTyping: true }); });
    expect(result.current.isRecipientTyping).toBe(false);
  });

  // ── Socket Event: audio:recording ───────────────────

  it('handles audio:recording events', () => {
    const { result } = renderHook(() => useConversation());
    const handler = getSocketHandler('audio:recording');
    act(() => { handler!({ isRecording: true }); });
    expect(result.current.isRecipientRecording).toBe(true);
  });

  it('clears audio:recording after 10s timeout', () => {
    const { result } = renderHook(() => useConversation());
    const handler = getSocketHandler('audio:recording');
    act(() => { handler!({ isRecording: true }); });
    expect(result.current.isRecipientRecording).toBe(true);
    act(() => { jest.advanceTimersByTime(10000); });
    expect(result.current.isRecipientRecording).toBe(false);
  });

  // ── Socket Event: audio:listening ───────────────────

  it('handles audio:listening start/stop', () => {
    const { result } = renderHook(() => useConversation());
    const handler = getSocketHandler('audio:listening');

    act(() => { handler!({ messageId: 'msg1', isListening: true }); });
    expect(result.current.isRecipientListeningToMyAudio).toBe('msg1');
    expect(result.current.listeningMessageIds.has('msg1')).toBe(true);

    act(() => { handler!({ messageId: 'msg1', isListening: false }); });
    expect(result.current.isRecipientListeningToMyAudio).toBeNull();
    expect(result.current.listeningMessageIds.has('msg1')).toBe(false);
  });

  // ── Socket Event: audio:waveform ────────────────────

  it('handles audio:waveform updates', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    // Inject a message via received handler
    const recvHandler = getSocketHandler('message:received');
    act(() => {
      recvHandler!({ id: 'audio-msg', content: 'Voice', senderId: 'r1', type: 'audio' });
    });

    const waveformHandler = getSocketHandler('audio:waveform');
    act(() => { waveformHandler!({ messageId: 'audio-msg', waveform: [1, 2, 3], duration: 5 }); });
    const msg = result.current.messages.find(m => m.id === 'audio-msg');
    expect(msg?.waveformData).toEqual([1, 2, 3]);
    expect(msg?.duration).toBe(5);
  });

  // ── Socket Event: user:status ───────────────────────

  it('handles user:status events and updates presence', () => {
    const { result } = renderHook(() => useConversation());
    const handler = getSocketHandler('user:status');
    act(() => { handler!({ userId: 'u2', status: 'online', lastSeen: null, hidden: false }); });
    expect(result.current.userPresence['u2']).toEqual({
      status: 'online',
      lastSeen: null,
      hidden: false,
    });
  });

  // ── Socket Event: presence:response ─────────────────

  it('handles presence:response (array)', () => {
    const { result } = renderHook(() => useConversation());
    const handler = getSocketHandler('presence:response');
    act(() => {
      handler!([
        { userId: 'u2', status: 'online', lastSeen: null, hidden: false },
        { userId: 'u3', status: 'away', lastSeen: '2024-01-01T00:00:00Z', hidden: true },
      ]);
    });
    expect(result.current.userPresence['u2'].status).toBe('online');
    expect(result.current.userPresence['u3'].status).toBe('away');
    expect(result.current.userPresence['u3'].hidden).toBe(true);
  });

  // ── Socket Event: message:reaction ──────────────────

  it('handles message:reaction updates', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    const recvHandler = getSocketHandler('message:received');
    act(() => {
      recvHandler!({ id: 'msg-react', content: 'Hi', senderId: 'r1', type: 'text' });
    });

    const reactionHandler = getSocketHandler('message:reaction');
    act(() => {
      reactionHandler!({ messageId: 'msg-react', reactions: [{ userId: 'u2', emoji: '❤️', username: '@u2' }] });
    });
    const msg = result.current.messages.find(m => m.id === 'msg-react');
    expect(msg?.reactions).toHaveLength(1);
    expect(msg?.reactions?.[0].emoji).toBe('❤️');
    expect(mockUpdateCachedMessage).toHaveBeenCalledWith('msg-react', expect.objectContaining({ reactions: expect.any(Array) }));
  });

  // ── Socket Event: message:unsent ────────────────────

  it('handles message:unsent events', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    const recvHandler = getSocketHandler('message:received');
    act(() => {
      recvHandler!({ id: 'msg-unsend', content: 'Delete me', senderId: 'r1', type: 'text' });
    });

    const unsentHandler = getSocketHandler('message:unsent');
    act(() => { unsentHandler!({ messageId: 'msg-unsend' }); });
    const msg = result.current.messages.find(m => m.id === 'msg-unsend');
    expect(msg?.unsent).toBe(true);
    expect(msg?.reactions).toEqual([]);
    expect(mockUpdateCachedMessage).toHaveBeenCalledWith('msg-unsend', { unsent: true, reactions: [] });
  });

  // ── Socket Event: message:edited ────────────────────

  it('handles message:edited events', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    const recvHandler = getSocketHandler('message:received');
    act(() => {
      recvHandler!({ id: 'msg-edit', content: 'Original', senderId: 'r1', type: 'text' });
    });

    const editedHandler = getSocketHandler('message:edited');
    act(() => {
      editedHandler!({ messageId: 'msg-edit', content: 'Edited content', editedAt: new Date().toISOString() });
    });
    const msg = result.current.messages.find(m => m.id === 'msg-edit');
    expect(msg?.content).toBe('Edited content');
    expect(msg?.edited).toBe(true);
    expect(mockUpdateCachedMessage).toHaveBeenCalledWith('msg-edit', { content: 'Edited content', edited: true });
  });

  // ── Reaction Handler ────────────────────────────────

  it('handleReaction optimistically adds a reaction', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    const recvHandler = getSocketHandler('message:received');
    act(() => {
      recvHandler!({ id: 'msg-r', content: 'Hi', senderId: 'r1', type: 'text' });
    });
    act(() => { result.current.handleReaction('msg-r', '👍'); });
    expect(mockEmit).toHaveBeenCalledWith('message:react', { messageId: 'msg-r', emoji: '👍' });
    const msg = result.current.messages.find(m => m.id === 'msg-r');
    expect(msg?.reactions).toEqual(expect.arrayContaining([expect.objectContaining({ emoji: '👍' })]));
  });

  // ── Unsend Handler ──────────────────────────────────

  it('handleUnsend emits and optimistically marks as unsent', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => {
      result.current.handleMessageInputChange({ target: { value: 'msg to unsend' } } as any);
    });
    act(() => { result.current.handleMessageSend(); });
    const msgId = result.current.messages[0].id;

    act(() => { result.current.handleUnsend(msgId); });
    expect(mockEmit).toHaveBeenCalledWith('message:unsend', msgId);
    expect(result.current.messages[0].unsent).toBe(true);
  });

  // ── Edit Handlers ───────────────────────────────────

  it('handleStartEdit sets editing state and populates message', () => {
    const testMsg = { id: 'e1', content: 'Edit me', direction: 'sent' as const, senderId: 'u1', recipientId: 'r1', status: 'sent' as const, timestamp: new Date() };
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleStartEdit(testMsg as any); });
    expect(result.current.editingMessage).not.toBeNull();
    expect(result.current.testMessage).toBe('Edit me');
  });

  it('handleCancelEdit clears editing state', () => {
    const testMsg = { id: 'e1', content: 'Edit me', direction: 'sent' as const, senderId: 'u1', recipientId: 'r1', status: 'sent' as const, timestamp: new Date() };
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleStartEdit(testMsg as any); });
    act(() => { result.current.handleCancelEdit(); });
    expect(result.current.editingMessage).toBeNull();
    expect(result.current.testMessage).toBe('');
  });

  it('handleEditMessage commits edit with socket emit', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => {
      result.current.handleMessageInputChange({ target: { value: 'original text' } } as any);
    });
    act(() => { result.current.handleMessageSend(); });
    const msg = result.current.messages[0];

    act(() => { result.current.handleStartEdit(msg); });
    act(() => { result.current.handleEditMessage('updated text'); });

    expect(mockEmit).toHaveBeenCalledWith('message:edit', expect.objectContaining({ content: 'updated text' }));
    const updated = result.current.messages.find(m => m.id === msg.id);
    expect(updated?.content).toBe('updated text');
    expect(updated?.edited).toBe(true);
    expect(result.current.editingMessage).toBeNull();
  });

  it('editLastSentMessage picks last sent text message for editing', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => { result.current.handleMessageInputChange({ target: { value: 'msg1' } } as any); });
    act(() => { result.current.handleMessageSend(); });
    act(() => { result.current.handleMessageInputChange({ target: { value: 'msg2' } } as any); });
    act(() => { result.current.handleMessageSend(); });

    act(() => { result.current.editLastSentMessage(); });
    expect(result.current.editingMessage).not.toBeNull();
    expect(result.current.testMessage).toBe('msg2');
  });

  // ── Reply Handlers ──────────────────────────────────

  it('handleReply and clearReply manage reply state', () => {
    const replyMsg = { id: 'r1', content: 'Reply to me', direction: 'received' as const, senderId: 's1', recipientId: 'u1', status: 'delivered' as const, timestamp: new Date() };
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleReply(replyMsg as any); });
    expect(result.current.replyingTo).not.toBeNull();
    expect(result.current.replyingTo?.id).toBe('r1');

    act(() => { result.current.clearReply(); });
    expect(result.current.replyingTo).toBeNull();
  });

  // ── Manual Offline ──────────────────────────────────

  it('setManualOffline triggers disconnect', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.setManualOffline(true); });
    expect(mockEmit).toHaveBeenCalledWith('presence:update', 'offline');
    act(() => { jest.advanceTimersByTime(200); });
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('setManualOffline false triggers reconnect', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.setManualOffline(false); });
    expect(mockReconnect).toHaveBeenCalled();
  });

  // ── Clear helpers ───────────────────────────────────

  it('clearMessages empties the messages array', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => { result.current.handleMessageInputChange({ target: { value: 'hi' } } as any); });
    act(() => { result.current.handleMessageSend(); });
    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => { result.current.clearMessages(); });
    expect(result.current.messages).toEqual([]);
  });

  // ── File handling ───────────────────────────────────

  it('cancelFileSelection clears all files', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.cancelFileSelection(); });
    expect(result.current.selectedFiles).toEqual([]);
    expect(result.current.filePreviews).toEqual([]);
  });

  it('cancelFileSelection removes specific file by index', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.cancelFileSelection(0); });
    expect(result.current.selectedFiles).toEqual([]);
  });

  // ── Settings sync ──────────────────────────────────

  it('emits settings:update when connected', () => {
    renderHook(() => useConversation());
    expect(mockEmit).toHaveBeenCalledWith('settings:update', expect.objectContaining({ privacyOnlineStatus: 'everyone' }));
  });

  // ── effectivelyOnline ──────────────────────────────

  it('effectivelyOnline reflects connection state', () => {
    mockConnected = true;
    const { result } = renderHook(() => useConversation());
    expect(result.current.effectivelyOnline).toBe(true);
  });

  it('effectivelyOnline is false when manually offline', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.setManualOffline(true); });
    expect(result.current.manualOffline).toBe(true);
  });

  // ── Audio play status change ───────────────────────

  it('handleAudioPlayStatusChange sets active audio message', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleAudioPlayStatusChange('audio1', 'u2', true); });
    expect(result.current.activeAudioMessageId).toBe('audio1');
  });

  it('handleAudioPlayStatusChange clears on pause', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleAudioPlayStatusChange('audio1', 'u2', true); });
    act(() => { result.current.handleAudioPlayStatusChange('audio1', 'u2', false); });
    expect(result.current.activeAudioMessageId).toBeNull();
  });

  // ── Audio recording start/stop handlers ─────────────

  it('handleAudioRecordingStart emits audio:recording', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => { result.current.handleAudioRecordingStart(); });
    expect(mockEmit).toHaveBeenCalledWith('audio:recording', expect.objectContaining({ isRecording: true }));
  });

  it('handleAudioRecordingStop emits audio:recording false', () => {
    const { result } = renderHook(() => useConversation());
    act(() => { result.current.handleRecipientChange('r1'); });
    act(() => { result.current.handleAudioRecordingStop(); });
    expect(mockEmit).toHaveBeenCalledWith('audio:recording', expect.objectContaining({ isRecording: false }));
  });
});
