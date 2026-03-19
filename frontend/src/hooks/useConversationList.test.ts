import { renderHook, act } from '@testing-library/react';

const mockOn = jest.fn();
const mockOff = jest.fn();
const mockEmit = jest.fn();
let mockConnected = false;

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: mockConnected ? { on: mockOn, off: mockOff, emit: mockEmit, connected: mockConnected } : null,
    connected: mockConnected,
  }),
}));

jest.mock('@/contexts/LogContext', () => ({
  useLog: () => ({ addLog: jest.fn() }),
}));

jest.mock('@/lib/messageCache', () => ({
  clearCachedConversation: jest.fn().mockResolvedValue(undefined),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockConnected = false;
});

import { useConversationList } from './useConversationList';

describe('useConversationList', () => {
  it('exports a function', () => {
    expect(typeof useConversationList).toBe('function');
  });

  it('returns expected shape', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: [] }),
    });

    const { result } = renderHook(() => useConversationList());

    expect(result.current).toHaveProperty('conversations');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('search');
    expect(result.current).toHaveProperty('setSearch');
    expect(result.current).toHaveProperty('refresh');
    expect(result.current).toHaveProperty('clearUnread');
    expect(Array.isArray(result.current.conversations)).toBe(true);
  });

  it('starts with empty conversations when no cache', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: [] }),
    });

    const { result } = renderHook(() => useConversationList());
    expect(result.current.conversations).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('loads conversations from localStorage cache', () => {
    const cached = [
      { id: '1', username: '@alice', displayName: 'Alice', firstName: null, lastName: null, profileImage: null, lastSeen: null, lastMessage: null, unreadCount: 0, lastMessageAt: null, conversationId: null, conversationStatus: null, isInitiator: false, isFriend: true },
    ];
    localStorage.setItem('chatr:conversations', JSON.stringify(cached));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ conversations: cached }),
    });

    const { result } = renderHook(() => useConversationList());
    expect(result.current.conversations.length).toBe(1);
    expect(result.current.loading).toBe(false);
  });

  it('clearUnread sets unread count to 0 for given user', () => {
    const cached = [
      { id: '1', username: '@alice', displayName: 'Alice', firstName: null, lastName: null, profileImage: null, lastSeen: null, lastMessage: null, unreadCount: 5, lastMessageAt: null, conversationId: null, conversationStatus: null, isInitiator: false, isFriend: true },
    ];
    localStorage.setItem('chatr:conversations', JSON.stringify(cached));
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ conversations: cached }) });

    const { result } = renderHook(() => useConversationList());

    act(() => {
      result.current.clearUnread('1');
    });

    expect(result.current.conversations.find(c => c.id === '1')?.unreadCount).toBe(0);
  });

  it('setSearch filters conversations by message content', () => {
    const now = new Date().toISOString();
    const cached = [
      { id: '1', username: '@alice', displayName: 'Alice', firstName: null, lastName: null, profileImage: null, lastSeen: null, lastMessage: { id: 'm1', content: 'hello world', type: 'text', createdAt: now, senderId: '1', isRead: true, fileType: null }, unreadCount: 0, lastMessageAt: now, conversationId: 'c1', conversationStatus: 'accepted', isInitiator: false, isFriend: true },
      { id: '2', username: '@bob', displayName: 'Bob', firstName: null, lastName: null, profileImage: null, lastSeen: null, lastMessage: { id: 'm2', content: 'goodbye', type: 'text', createdAt: now, senderId: '2', isRead: true, fileType: null }, unreadCount: 0, lastMessageAt: now, conversationId: 'c2', conversationStatus: 'accepted', isInitiator: false, isFriend: true },
    ];
    localStorage.setItem('chatr:conversations', JSON.stringify(cached));
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ conversations: cached }) });

    const { result } = renderHook(() => useConversationList());

    act(() => {
      result.current.setSearch('hello');
    });

    expect(result.current.conversations.length).toBe(1);
    expect(result.current.conversations[0].id).toBe('1');
  });
});
