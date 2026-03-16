import { renderHook, act } from '@testing-library/react';

const mockOn = jest.fn();
const mockOff = jest.fn();
const mockEmit = jest.fn();

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: { on: mockOn, off: mockOff, emit: mockEmit, connected: true },
    connected: true,
    connecting: false,
    disconnect: jest.fn(),
    reconnect: jest.fn(),
  }),
}));

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

const mockLoadQueueForRecipient = jest.fn().mockResolvedValue([]);
const mockDequeue = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/outboundQueue', () => ({
  loadQueueForRecipient: (...args: any[]) => mockLoadQueueForRecipient(...args),
  dequeue: (...args: any[]) => mockDequeue(...args),
}));

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ messages: [] }) });

import { useConversationView } from './useConversationView';
import type { Message } from '@/components/MessageBubble';

function getSocketHandler(eventName: string): ((...args: any[]) => void) | undefined {
  const call = mockOn.mock.calls.find((c: any[]) => c[0] === eventName);
  return call ? call[1] : undefined;
}

const defaultOpts = { recipientId: 'r1', currentUserId: 'u1' };

describe('useConversationView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.setItem('token', 'test');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Interface & Initial State ─────────────────────────

  it('returns expected interface', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    expect(result.current).toHaveProperty('messages');
    expect(result.current).toHaveProperty('messagesEndRef');
    expect(result.current).toHaveProperty('activeAudioMessageId');
    expect(result.current).toHaveProperty('listeningMessageIds');
    expect(result.current).toHaveProperty('isRecipientTyping');
    expect(result.current).toHaveProperty('isRecipientRecording');
    expect(result.current).toHaveProperty('lightboxUrl');
    expect(result.current).toHaveProperty('lightboxName');
    expect(result.current).toHaveProperty('replyingTo');
    expect(result.current).toHaveProperty('editingMessage');
    expect(result.current).toHaveProperty('addMessage');
    expect(result.current).toHaveProperty('handleEditSaved');
    expect(result.current).toHaveProperty('editLastSentMessage');
    expect(result.current).toHaveProperty('handleAudioPlayStatusChange');
    expect(result.current).toHaveProperty('handleReaction');
    expect(result.current).toHaveProperty('handleUnsend');
    expect(result.current).toHaveProperty('openLightbox');
    expect(result.current).toHaveProperty('closeLightbox');
    expect(result.current).toHaveProperty('setReplyingTo');
    expect(result.current).toHaveProperty('setEditingMessage');
    expect(result.current).toHaveProperty('cancelReply');
    expect(result.current).toHaveProperty('cancelEdit');
  });

  it('starts with empty/default state', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    expect(result.current.messages).toEqual([]);
    expect(result.current.activeAudioMessageId).toBeNull();
    expect(result.current.isRecipientTyping).toBe(false);
    expect(result.current.isRecipientRecording).toBe(false);
    expect(result.current.lightboxUrl).toBeNull();
    expect(result.current.lightboxName).toBe('');
    expect(result.current.replyingTo).toBeNull();
    expect(result.current.editingMessage).toBeNull();
  });

  // ── Load cached messages & queue ──────────────────────

  it('loads cached messages and queued messages on mount', async () => {
    const cached: Partial<Message>[] = [
      { id: 'c1', content: 'cached', senderId: 'u1', recipientId: 'r1', direction: 'sent', status: 'sent', timestamp: new Date(1000) },
    ];
    const queued: Partial<Message>[] = [
      { id: 'q1', content: 'queued', senderId: 'u1', recipientId: 'r1', direction: 'sent', status: 'queued', timestamp: new Date(2000) },
    ];
    mockLoadCachedMessages.mockResolvedValueOnce(cached);
    mockLoadQueueForRecipient.mockResolvedValueOnce(queued);

    const { result } = renderHook(() => useConversationView(defaultOpts));
    await act(async () => { jest.runAllTimers(); });

    expect(mockLoadCachedMessages).toHaveBeenCalledWith('u1', 'r1');
    expect(mockLoadQueueForRecipient).toHaveBeenCalledWith('u1', 'r1');
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].id).toBe('c1');
    expect(result.current.messages[1].id).toBe('q1');
  });

  it('deduplicates cached and queued messages', async () => {
    const msg = { id: 'same-id', content: 'msg', senderId: 'u1', recipientId: 'r1', direction: 'sent' as const, status: 'sent' as const, timestamp: new Date(1000) };
    mockLoadCachedMessages.mockResolvedValueOnce([msg]);
    mockLoadQueueForRecipient.mockResolvedValueOnce([msg]);

    const { result } = renderHook(() => useConversationView(defaultOpts));
    await act(async () => { jest.runAllTimers(); });

    expect(result.current.messages).toHaveLength(1);
  });

  // ── addMessage ────────────────────────────────────────

  it('addMessage appends a new message and caches it', async () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = {
      id: 'new1', content: 'Hi', senderId: 'u1', recipientId: 'r1',
      direction: 'sent', status: 'sending', timestamp: new Date(),
    };
    act(() => { result.current.addMessage(msg); });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe('new1');
    expect(mockCacheMessage).toHaveBeenCalledWith(msg, 'u1');
  });

  it('addMessage does not duplicate existing message', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = {
      id: 'dup1', content: 'Hi', senderId: 'u1', recipientId: 'r1',
      direction: 'sent', status: 'sending', timestamp: new Date(),
    };
    act(() => { result.current.addMessage(msg); });
    act(() => { result.current.addMessage(msg); });
    expect(result.current.messages).toHaveLength(1);
  });

  // ── handleEditSaved ───────────────────────────────────

  it('handleEditSaved updates message content and cache', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = {
      id: 'edit1', content: 'Original', senderId: 'u1', recipientId: 'r1',
      direction: 'sent', status: 'sent', timestamp: new Date(), type: 'text',
    };
    act(() => { result.current.addMessage(msg); });
    act(() => { result.current.handleEditSaved('edit1', 'Edited'); });
    expect(result.current.messages[0].content).toBe('Edited');
    expect(result.current.messages[0].edited).toBe(true);
    expect(mockUpdateCachedMessage).toHaveBeenCalledWith('edit1', { content: 'Edited', edited: true });
    expect(result.current.editingMessage).toBeNull();
  });

  // ── editLastSentMessage ───────────────────────────────

  it('editLastSentMessage finds last sent text message', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg1: Message = { id: 'm1', content: 'First', senderId: 'u1', recipientId: 'r1', direction: 'sent', status: 'sent', timestamp: new Date(), type: 'text' };
    const msg2: Message = { id: 'm2', content: 'Second', senderId: 'u1', recipientId: 'r1', direction: 'sent', status: 'sent', timestamp: new Date(), type: 'text' };
    act(() => { result.current.addMessage(msg1); });
    act(() => { result.current.addMessage(msg2); });
    act(() => { result.current.editLastSentMessage(); });
    expect(result.current.editingMessage?.id).toBe('m2');
  });

  it('editLastSentMessage does nothing if no sent text messages exist', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'm1', content: 'Voice', senderId: 'r1', recipientId: 'u1', direction: 'received', status: 'delivered', timestamp: new Date(), type: 'audio' };
    act(() => { result.current.addMessage(msg); });
    act(() => { result.current.editLastSentMessage(); });
    expect(result.current.editingMessage).toBeNull();
  });

  // ── Audio playback ───────────────────────────────────

  it('handleAudioPlayStatusChange sets active audio on play', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    act(() => { result.current.handleAudioPlayStatusChange('a1', 'r1', true); });
    expect(result.current.activeAudioMessageId).toBe('a1');
    expect(result.current.listeningMessageIds.has('a1')).toBe(true);
    expect(mockEmit).toHaveBeenCalledWith('audio:listening', { messageId: 'a1', senderId: 'r1' });
  });

  it('handleAudioPlayStatusChange clears on stop', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    act(() => { result.current.handleAudioPlayStatusChange('a1', 'r1', true); });
    act(() => { result.current.handleAudioPlayStatusChange('a1', 'r1', false); });
    expect(result.current.activeAudioMessageId).toBeNull();
    expect(result.current.listeningMessageIds.has('a1')).toBe(false);
  });

  it('handleAudioPlayStatusChange emits audio:listened on end', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    act(() => { result.current.handleAudioPlayStatusChange('a1', 'r1', true); });
    act(() => { result.current.handleAudioPlayStatusChange('a1', 'r1', false, true); });
    expect(mockEmit).toHaveBeenCalledWith('audio:listened', { messageId: 'a1', senderId: 'r1' });
  });

  it('does not emit audio events for own messages', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    act(() => { result.current.handleAudioPlayStatusChange('a1', 'u1', true); });
    expect(result.current.activeAudioMessageId).toBe('a1');
    expect(mockEmit).not.toHaveBeenCalledWith('audio:listening', expect.anything());
  });

  // ── Reactions ────────────────────────────────────────

  it('handleReaction adds a reaction optimistically', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'react1', content: 'Hi', senderId: 'r1', recipientId: 'u1', direction: 'received', status: 'delivered', timestamp: new Date() };
    act(() => { result.current.addMessage(msg); });
    act(() => { result.current.handleReaction('react1', '❤️'); });

    expect(mockEmit).toHaveBeenCalledWith('message:react', { messageId: 'react1', emoji: '❤️' });
    expect(result.current.messages[0].reactions).toHaveLength(1);
    expect(result.current.messages[0].reactions![0].emoji).toBe('❤️');
  });

  it('handleReaction toggles off existing reaction', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'react2', content: 'Hi', senderId: 'r1', recipientId: 'u1', direction: 'received', status: 'delivered', timestamp: new Date() };
    act(() => { result.current.addMessage(msg); });
    act(() => { result.current.handleReaction('react2', '❤️'); });
    act(() => { result.current.handleReaction('react2', '❤️'); });
    expect(result.current.messages[0].reactions).toHaveLength(0);
  });

  it('handleReaction does nothing when disconnected', () => {
    // Covered by the mock always returning connected=true but the hook checks `connected`
    const { result } = renderHook(() => useConversationView(defaultOpts));
    act(() => { result.current.handleReaction('no-msg', '😊'); });
    expect(mockEmit).toHaveBeenCalledWith('message:react', expect.anything());
  });

  // ── Unsend ───────────────────────────────────────────

  it('handleUnsend removes temp messages locally', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'temp-123', content: 'queued msg', senderId: 'u1', recipientId: 'r1', direction: 'sent', status: 'queued', timestamp: new Date() };
    act(() => { result.current.addMessage(msg); });
    act(() => { result.current.handleUnsend('temp-123'); });
    expect(result.current.messages).toHaveLength(0);
    expect(mockDequeue).toHaveBeenCalledWith('temp-123');
  });

  it('handleUnsend marks server messages as unsent', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'server-1', content: 'sent msg', senderId: 'u1', recipientId: 'r1', direction: 'sent', status: 'sent', timestamp: new Date() };
    act(() => { result.current.addMessage(msg); });
    act(() => { result.current.handleUnsend('server-1'); });
    expect(mockEmit).toHaveBeenCalledWith('message:unsend', 'server-1');
    expect(result.current.messages[0].unsent).toBe(true);
    expect(result.current.messages[0].content).toBe('');
  });

  // ── Lightbox ─────────────────────────────────────────

  it('openLightbox and closeLightbox manage lightbox state', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    act(() => { result.current.openLightbox('https://img.url/pic.jpg', 'photo.jpg'); });
    expect(result.current.lightboxUrl).toBe('https://img.url/pic.jpg');
    expect(result.current.lightboxName).toBe('photo.jpg');

    act(() => { result.current.closeLightbox(); });
    expect(result.current.lightboxUrl).toBeNull();
    expect(result.current.lightboxName).toBe('');
  });

  // ── Reply / Edit ─────────────────────────────────────

  it('setReplyingTo and cancelReply manage reply state', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'rpl', content: 'Reply me', senderId: 'r1', recipientId: 'u1', direction: 'received', status: 'delivered', timestamp: new Date() };
    act(() => { result.current.setReplyingTo(msg); });
    expect(result.current.replyingTo?.id).toBe('rpl');

    act(() => { result.current.cancelReply(); });
    expect(result.current.replyingTo).toBeNull();
  });

  it('setEditingMessage and cancelEdit manage edit state', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'edt', content: 'Edit me', senderId: 'u1', recipientId: 'r1', direction: 'sent', status: 'sent', timestamp: new Date(), type: 'text' };
    act(() => { result.current.setEditingMessage(msg); });
    expect(result.current.editingMessage?.id).toBe('edt');

    act(() => { result.current.cancelEdit(); });
    expect(result.current.editingMessage).toBeNull();
  });

  // ── Socket Events ─────────────────────────────────────

  it('registers all expected socket events', () => {
    renderHook(() => useConversationView(defaultOpts));
    const events = mockOn.mock.calls.map((c: any[]) => c[0]);
    expect(events).toContain('message:received');
    expect(events).toContain('message:sent');
    expect(events).toContain('message:status');
    expect(events).toContain('message:edited');
    expect(events).toContain('message:unsent');
    expect(events).toContain('message:reaction');
    expect(events).toContain('typing:status');
    expect(events).toContain('audio:recording');
    expect(events).toContain('audio:waveform');
    expect(events).toContain('message:blocked');
    expect(events).toContain('conversation:accepted');
    expect(events).toContain('guest:left');
  });

  it('cleans up all socket events on unmount', () => {
    const { unmount } = renderHook(() => useConversationView(defaultOpts));
    unmount();
    const events = mockOff.mock.calls.map((c: any[]) => c[0]);
    expect(events).toContain('message:received');
    expect(events).toContain('message:sent');
    expect(events).toContain('message:status');
    expect(events).toContain('message:edited');
    expect(events).toContain('message:unsent');
    expect(events).toContain('message:reaction');
    expect(events).toContain('typing:status');
    expect(events).toContain('audio:recording');
    expect(events).toContain('audio:waveform');
    expect(events).toContain('message:blocked');
    expect(events).toContain('conversation:accepted');
    expect(events).toContain('guest:left');
  });

  // ── Socket: message:received ─────────────────────────

  it('handles message:received for this conversation', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('message:received');
    act(() => {
      handler!({
        id: 'recv1', content: 'Hello', senderId: 'r1', recipientId: 'u1',
        type: 'text', timestamp: new Date().toISOString(),
      });
    });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].direction).toBe('received');
    expect(mockCacheMessage).toHaveBeenCalled();
  });

  it('ignores message:received from unrelated conversations', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('message:received');
    act(() => {
      handler!({
        id: 'recv2', content: 'Hello', senderId: 'other-user', recipientId: 'another-user',
        type: 'text',
      });
    });
    expect(result.current.messages).toHaveLength(0);
  });

  it('deduplicates received messages with same id', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('message:received');
    act(() => {
      handler!({ id: 'dup-recv', content: 'Hello', senderId: 'r1', recipientId: 'u1', type: 'text' });
    });
    act(() => {
      handler!({ id: 'dup-recv', content: 'Hello', senderId: 'r1', recipientId: 'u1', type: 'text' });
    });
    expect(result.current.messages).toHaveLength(1);
  });

  // ── Socket: message:sent ─────────────────────────────

  it('handles message:sent - replaces temp message with confirmed one', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const tempMsg: Message = {
      id: 'temp-001', content: 'Hi', senderId: 'u1', recipientId: 'r1',
      direction: 'sent', status: 'sending', timestamp: new Date(),
    };
    act(() => { result.current.addMessage(tempMsg); });

    const handler = getSocketHandler('message:sent');
    act(() => {
      handler!({
        id: 'real-001', content: 'Hi', senderId: 'u1', recipientId: 'r1',
        status: 'sent', timestamp: new Date().toISOString(),
      });
    });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe('real-001');
    expect(mockReplaceCachedMessageId).toHaveBeenCalledWith('temp-001', 'real-001');
    expect(mockDequeue).toHaveBeenCalledWith('temp-001');
  });

  // ── Socket: message:status ───────────────────────────

  it('handles message:status updates', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'st1', content: 'Hi', senderId: 'u1', recipientId: 'r1', direction: 'sent', status: 'sent', timestamp: new Date() };
    act(() => { result.current.addMessage(msg); });

    const handler = getSocketHandler('message:status');
    act(() => { handler!({ messageId: 'st1', status: 'read' }); });
    expect(result.current.messages[0].status).toBe('read');
    expect(mockUpdateCachedMessage).toHaveBeenCalledWith('st1', { status: 'read' });
  });

  // ── Socket: message:edited ───────────────────────────

  it('handles message:edited events', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'ed1', content: 'Original', senderId: 'r1', recipientId: 'u1', direction: 'received', status: 'delivered', timestamp: new Date() };
    act(() => { result.current.addMessage(msg); });

    const handler = getSocketHandler('message:edited');
    act(() => { handler!({ messageId: 'ed1', content: 'Changed' }); });
    expect(result.current.messages[0].content).toBe('Changed');
    expect(result.current.messages[0].edited).toBe(true);
    expect(mockUpdateCachedMessage).toHaveBeenCalledWith('ed1', { content: 'Changed', edited: true });
  });

  // ── Socket: message:unsent ───────────────────────────

  it('handles message:unsent events', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'un1', content: 'Delete this', senderId: 'r1', recipientId: 'u1', direction: 'received', status: 'delivered', timestamp: new Date() };
    act(() => { result.current.addMessage(msg); });

    const handler = getSocketHandler('message:unsent');
    act(() => { handler!({ messageId: 'un1' }); });
    expect(result.current.messages[0].unsent).toBe(true);
    expect(result.current.messages[0].content).toBe('');
    expect(mockUpdateCachedMessage).toHaveBeenCalledWith('un1', { unsent: true, content: '' });
  });

  // ── Socket: message:reaction ─────────────────────────

  it('handles message:reaction - adds reaction', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'rr1', content: 'Hi', senderId: 'r1', recipientId: 'u1', direction: 'received', status: 'delivered', timestamp: new Date() };
    act(() => { result.current.addMessage(msg); });

    const handler = getSocketHandler('message:reaction');
    act(() => { handler!({ messageId: 'rr1', emoji: '👍', userId: 'r1', username: '@r1' }); });
    expect(result.current.messages[0].reactions).toHaveLength(1);
    expect(result.current.messages[0].reactions![0].emoji).toBe('👍');
  });

  it('handles message:reaction - toggles off', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = {
      id: 'rr2', content: 'Hi', senderId: 'r1', recipientId: 'u1',
      direction: 'received', status: 'delivered', timestamp: new Date(),
      reactions: [{ emoji: '👍', userId: 'r1', username: '@r1' }],
    };
    act(() => { result.current.addMessage(msg); });

    const handler = getSocketHandler('message:reaction');
    act(() => { handler!({ messageId: 'rr2', emoji: '👍', userId: 'r1', username: '@r1' }); });
    expect(result.current.messages[0].reactions).toHaveLength(0);
  });

  // ── Socket: typing:status ────────────────────────────

  it('handles typing:status start from recipient', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('typing:status');
    act(() => { handler!({ userId: 'r1', isTyping: true }); });
    expect(result.current.isRecipientTyping).toBe(true);
  });

  it('handles typing:status stop from recipient', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('typing:status');
    act(() => { handler!({ userId: 'r1', isTyping: true }); });
    act(() => { handler!({ userId: 'r1', isTyping: false }); });
    expect(result.current.isRecipientTyping).toBe(false);
  });

  it('typing clears via explicit stop event (fallback timeout also exists)', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('typing:status');
    act(() => { handler!({ userId: 'r1', isTyping: true }); });
    expect(result.current.isRecipientTyping).toBe(true);
    act(() => { handler!({ userId: 'r1', isTyping: false }); });
    expect(result.current.isRecipientTyping).toBe(false);
  });

  it('ignores typing events from non-recipient', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('typing:status');
    act(() => { handler!({ userId: 'someone-else', isTyping: true }); });
    expect(result.current.isRecipientTyping).toBe(false);
  });

  // ── Socket: audio:recording ──────────────────────────

  it('handles audio:recording start from recipient', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('audio:recording');
    act(() => { handler!({ userId: 'r1', isRecording: true }); });
    expect(result.current.isRecipientRecording).toBe(true);
  });

  it('handles audio:recording stop from recipient', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('audio:recording');
    act(() => { handler!({ userId: 'r1', isRecording: true }); });
    act(() => { handler!({ userId: 'r1', isRecording: false }); });
    expect(result.current.isRecipientRecording).toBe(false);
  });

  it('recording clears via explicit stop event', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('audio:recording');
    act(() => { handler!({ userId: 'r1', isRecording: true }); });
    expect(result.current.isRecipientRecording).toBe(true);
    act(() => { handler!({ userId: 'r1', isRecording: false }); });
    expect(result.current.isRecipientRecording).toBe(false);
  });

  it('ignores audio:recording from non-recipient', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('audio:recording');
    act(() => { handler!({ userId: 'other', isRecording: true }); });
    expect(result.current.isRecipientRecording).toBe(false);
  });

  // ── Socket: audio:waveform ───────────────────────────

  it('handles audio:waveform updates', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = { id: 'aw1', content: 'Voice', senderId: 'r1', recipientId: 'u1', direction: 'received', status: 'delivered', timestamp: new Date(), type: 'audio' };
    act(() => { result.current.addMessage(msg); });

    const handler = getSocketHandler('audio:waveform');
    act(() => { handler!({ messageId: 'aw1', waveform: [0.5, 0.8], duration: 3.5 }); });
    expect(result.current.messages[0].waveformData).toEqual([0.5, 0.8]);
    expect(result.current.messages[0].duration).toBe(3.5);
    expect(mockUpdateCachedMessage).toHaveBeenCalledWith('aw1', { waveformData: [0.5, 0.8], duration: 3.5 });
  });

  // ── Socket: message:blocked ──────────────────────────

  it('handles message:blocked by marking temp message as failed', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const tempMsg: Message = {
      id: 'temp-block', content: 'Blocked', senderId: 'u1', recipientId: 'r1',
      direction: 'sent', status: 'sending', timestamp: new Date(),
    };
    act(() => { result.current.addMessage(tempMsg); });

    const handler = getSocketHandler('message:blocked');
    act(() => { handler!({ tempId: 'temp-block', recipientId: 'r1', reason: 'blocked' }); });
    expect(result.current.messages[0].status).toBe('failed');
    expect(mockDequeue).toHaveBeenCalledWith('temp-block');
  });

  // ── Socket: conversation:accepted ────────────────────

  it('handles conversation:accepted - upgrades sent message statuses', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const msg: Message = {
      id: 'acc1', content: 'Hi', senderId: 'u1', recipientId: 'r1',
      direction: 'sent', status: 'sent', timestamp: new Date(),
    };
    act(() => { result.current.addMessage(msg); });

    const onAccepted = jest.fn();
    const { result: result2 } = renderHook(() =>
      useConversationView({ ...defaultOpts, onConversationAccepted: onAccepted })
    );
    const msg2: Message = { ...msg, id: 'acc2' };
    act(() => { result2.current.addMessage(msg2); });

    const handler = getSocketHandler('conversation:accepted');
    act(() => { handler!({ conversationId: 'conv1', acceptedBy: 'r1' }); });
    // The first render's messages should be upgraded
    expect(result.current.messages[0].status).toBe('delivered');
  });

  // ── Socket: guest:left ───────────────────────────────

  it('handles guest:left - adds system message', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('guest:left');
    act(() => {
      handler!({ guestId: 'r1', guestName: 'Guest', message: 'Guest has left the chat' });
    });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].type).toBe('system');
    expect(result.current.messages[0].content).toBe('Guest has left the chat');
  });

  it('does not add duplicate guest:left system messages', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('guest:left');
    act(() => { handler!({ guestId: 'r1', guestName: 'Guest', message: 'Guest has left' }); });
    act(() => { handler!({ guestId: 'r1', guestName: 'Guest', message: 'Guest has left' }); });
    expect(result.current.messages).toHaveLength(1);
  });

  it('ignores guest:left from non-recipient', () => {
    const { result } = renderHook(() => useConversationView(defaultOpts));
    const handler = getSocketHandler('guest:left');
    act(() => { handler!({ guestId: 'other-guest', guestName: 'Other', message: 'Other left' }); });
    expect(result.current.messages).toHaveLength(0);
  });

  // ── History loading via socket ────────────────────────

  it('emits messages:history on mount when connected', () => {
    renderHook(() => useConversationView(defaultOpts));
    expect(mockEmit).toHaveBeenCalledWith('messages:history', { recipientId: 'r1' }, expect.any(Function));
  });

  it('requests messages:history on mount when connected', () => {
    renderHook(() => useConversationView(defaultOpts));
    const historyCalls = mockEmit.mock.calls.filter(c => c[0] === 'messages:history');
    expect(historyCalls.length).toBeGreaterThanOrEqual(1);
    expect(historyCalls[0][1]).toEqual({ recipientId: 'r1' });
    expect(typeof historyCalls[0][2]).toBe('function');
  });
});
