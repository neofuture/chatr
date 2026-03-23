'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useLog } from '@/contexts/LogContext';
import { clearCachedConversation } from '@/lib/messageCache';
import { getApiBase } from '@/lib/api';

export interface ConversationUser {
  id: string;
  username: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
  lastSeen: string | null;
  lastMessage: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    senderId: string;
    isRead: boolean;
    fileType: string | null;
  } | null;
  unreadCount: number;
  lastMessageAt: string | null;
  conversationId: string | null;
  conversationStatus: 'pending' | 'accepted' | null;
  isInitiator: boolean;
  isFriend: boolean;
  friendshipId?: string | null;
  isBlocked?: boolean;
  blockedByMe?: boolean;
  isBot?: boolean;
  isGuest?: boolean;
  summary?: string | null;
  // set by socket events
  isOnline?: boolean;
  // set by search results
  friendship?: { id: string; status: string; iRequested: boolean } | null;
}

function getToken() {
  return localStorage.getItem('token') || '';
}

const CONVERSATIONS_CACHE_KEY = 'chatr:conversations';

function loadCachedConversations(): ConversationUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONVERSATIONS_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveCachedConversations(list: ConversationUser[]) {
  try { localStorage.setItem(CONVERSATIONS_CACHE_KEY, JSON.stringify(list)); } catch {}
}

export function useConversationList() {
  const { socket } = useWebSocket();
  const { addLog } = useLog();
  const cached = useRef(loadCachedConversations());
  const [conversations, setConversations] = useState<ConversationUser[]>(cached.current);
  const [loading, setLoading] = useState(cached.current.length === 0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Persist to localStorage whenever conversations change
  useEffect(() => {
    saveCachedConversations(conversations);
  }, [conversations]);

  // ── Fetch conversations (socket-first, REST fallback) ─────────────────
  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const fetchRef = useRef<(bg?: boolean, r?: number) => Promise<void>>(undefined!);

  const fetchConversations = useCallback(async (background = false, retries = 2) => {
    if (!background) setLoading(true);
    if (background) setSyncing(true);

    try {
      // Try socket first if connected
      if (socket?.connected) {
        const gotSocket = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 3000);
          socket.emit('conversations:request', {}, (res: any) => {
            clearTimeout(timeout);
            if (res?.error || !res?.conversations) { resolve(false); return; }
            setConversations(res.conversations);
            setError(null);
            addLog('info', 'conversations:loaded', { via: 'socket', count: res.conversations.length });
            resolve(true);
          });
        });
        if (gotSocket) return;
      }

      // REST fallback
      try {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        const res = await fetch(`${getApiBase()}/api/users/conversations`, {
          headers: { Authorization: `Bearer ${getToken()}` },
          signal: ac.signal,
        });
        if (!res.ok) throw new Error('Failed to fetch conversations');
        const data = await res.json();
        setConversations(data.conversations ?? []);
        setError(null);
        addLog('info', 'conversations:loaded', { via: 'rest', count: (data.conversations ?? []).length });
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        if (retries > 0) {
          retryTimer.current = setTimeout(() => fetchRef.current?.(true, retries - 1), 1500);
          return;
        }
        setError(e.message);
        addLog('error', 'conversations:load-failed', { error: e.message });
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [socket, addLog]);

  fetchRef.current = fetchConversations;

  useEffect(() => {
    fetchConversations(cached.current.length > 0);
    return () => {
      clearTimeout(retryTimer.current);
      abortRef.current?.abort();
    };
  }, [fetchConversations]);

  // Re-fetch when local block/unblock happens (fired by FriendsContext).
  // Apply optimistic update immediately, then confirm with server after a short
  // delay to ensure the DB has committed before we re-fetch.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = (e: Event) => {
      const { action, targetUserId } = (e as CustomEvent).detail ?? {};
      if (targetUserId) {
        setConversations(prev => prev.map(c => {
          if (c.id !== targetUserId) return c;
          if (action === 'block'   || action === 'blocked')   return { ...c, isBlocked: true,  blockedByMe: true };
          if (action === 'unblock' || action === 'unblocked') return { ...c, isBlocked: false, blockedByMe: false };
          return c;
        }));
      }
      // Background fetch to confirm from DB (cache now invalidated by backend)
      clearTimeout(timer);
      timer = setTimeout(() => fetchConversations(true), 100);
    };
    window.addEventListener('chatr:friends-changed', handler);
    return () => {
      window.removeEventListener('chatr:friends-changed', handler);
      clearTimeout(timer);
    };
  }, [fetchConversations]);

  // ── Online presence via socket ───────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Initial list of online users from presence:update
    const onPresence = (data: { onlineUsers: { userId: string; status: string }[] }) => {
      const ids = new Set(
        data.onlineUsers.filter(u => u.status === 'online').map(u => u.userId)
      );
      setOnlineUserIds(ids);
    };

    // Real-time individual user status changes
    const onUserStatus = (data: { userId: string; status: 'online' | 'offline' | 'away' }) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        if (data.status === 'online') next.add(data.userId);
        else next.delete(data.userId);
        return next;
      });
    };

    // When a new message arrives, bump that conversation to the top (or create it)
    const onMessage = (data: any) => {
      addLog('received', 'message:received', { from: data.senderId, type: data.type ?? 'text', id: data.id });
      const otherId = data.senderId;
      setConversations(prev => {
        let next: ConversationUser[];
        const exists = prev.some(c => c.id === otherId);
        if (exists) {
          next = prev.map(c =>
            c.id === otherId
              ? {
                  ...c,
                  lastMessage: {
                    id: data.id,
                    content: data.content,
                    type: data.type ?? 'text',
                    createdAt: data.createdAt ?? new Date().toISOString(),
                    senderId: data.senderId,
                    isRead: false,
                    fileType: data.fileType ?? null,
                  },
                  unreadCount: c.unreadCount + 1,
                  lastMessageAt: data.createdAt ?? new Date().toISOString(),
                  conversationId: data.conversationId ?? c.conversationId,
                  conversationStatus: data.conversationStatus ?? c.conversationStatus,
                }
              : c
          );
        } else {
          next = [...prev, {
            id: otherId,
            username: data.senderUsername ?? '',
            displayName: data.senderDisplayName ?? null,
            firstName: null,
            lastName: null,
            profileImage: data.senderProfileImage ?? null,
            lastSeen: null,
            isGuest: data.senderIsGuest ?? false,
            lastMessage: {
              id: data.id,
              content: data.content,
              type: data.type ?? 'text',
              createdAt: data.createdAt ?? new Date().toISOString(),
              senderId: data.senderId,
              isRead: false,
              fileType: data.fileType ?? null,
            },
            unreadCount: 1,
            lastMessageAt: data.createdAt ?? new Date().toISOString(),
            conversationId: data.conversationId ?? null,
            conversationStatus: data.conversationStatus ?? 'pending',
            isInitiator: false,
            isFriend: false,
          }];
        }
        queueMicrotask(() => {
          const total = next.reduce((sum, c) => sum + c.unreadCount, 0);
          window.dispatchEvent(new CustomEvent('chatr:unread-changed', { detail: { total } }));
        });
        return next;
      });
    };

    // Conversation accepted — move from requests to chats
    const onConvoAccepted = (data: { conversationId: string }) => {
      addLog('info', 'conversation:accepted', { conversationId: data.conversationId });
      setConversations(prev =>
        prev.map(c =>
          c.conversationId === data.conversationId
            ? { ...c, conversationStatus: 'accepted' as const }
            : c
        )
      );
    };

    // Conversation declined/nuked — remove from list and clear local cache
    const onConvoDeclined = (data: { conversationId: string | null; otherUserId?: string }) => {
      addLog('info', 'conversation:declined', { conversationId: data.conversationId, otherUserId: data.otherUserId });
      // Clear IndexedDB cache for this conversation
      const otherUserId = data.otherUserId;
      if (otherUserId) {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const meId = JSON.parse(userStr).id;
            if (meId) clearCachedConversation(meId, otherUserId).catch(() => {});
          }
        } catch {}
      }

      setConversations(prev =>
        prev.filter(c => {
          if (data.conversationId && c.conversationId === data.conversationId) return false;
          if (data.otherUserId && c.id === data.otherUserId) return false;
          return true;
        })
      );
    };

    // Profile fields updated by another user (displayName, profileImage, etc.)
    const onProfileUpdate = (data: { userId: string; displayName?: string | null; firstName?: string | null; lastName?: string | null; profileImage?: string | null }) => {
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== data.userId) return c;
          return {
            ...c,
            ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
            ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
            ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
            ...(data.profileImage !== undefined ? { profileImage: data.profileImage } : {}),
          };
        })
      );
    };

    const onMessageUnsent = (data: { messageId: string; senderDisplayName?: string }) => {
      setConversations(prev => prev.map(c => {
        if (c.lastMessage?.id !== data.messageId) return c;
        return {
          ...c,
          lastMessage: { ...c.lastMessage, content: 'Message unsent', type: 'text' },
        };
      }));
    };

    socket.on('presence:update', onPresence);
    socket.on('user:status',     onUserStatus);
    socket.on('user:profileUpdate', onProfileUpdate);
    socket.on('message:received', onMessage);
    socket.on('message:unsent', onMessageUnsent);
    socket.on('conversation:accepted', onConvoAccepted);
    socket.on('conversation:declined', onConvoDeclined);
    socket.on('friend:update', fetchConversations);

    return () => {
      socket.off('presence:update', onPresence);
      socket.off('user:status',     onUserStatus);
      socket.off('user:profileUpdate', onProfileUpdate);
      socket.off('message:received', onMessage);
      socket.off('message:unsent', onMessageUnsent);
      socket.off('conversation:accepted', onConvoAccepted);
      socket.off('conversation:declined', onConvoDeclined);
      socket.off('friend:update', fetchConversations);
    };
  }, [socket]);

  // ── Sorting ──────────────────────────────────────────────────────────────
  // Priority: 1) online  2) has messages (most recent first)  3) alphabetical
  const sorted = [...conversations]
    .map(c => ({ ...c, isOnline: onlineUserIds.has(c.id) }))
    .sort((a, b) => {
      // Online users first
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      // Then most recent message
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      // Alphabetical fallback
      const aName = a.displayName || a.username;
      const bName = b.displayName || b.username;
      return aName.localeCompare(bName);
    });

  // Local search: filter across all conversations by message content
  const q = search.trim().toLowerCase();
  const displayList: ConversationUser[] = q
    ? sorted.filter(c => {
        const msgContent = (c.lastMessage?.content || '').toLowerCase();
        return msgContent.includes(q);
      })
    : sorted;

  const clearUnread = useCallback((userId: string) => {
    setConversations(prev => {
      const next = prev.map(c => c.id === userId ? { ...c, unreadCount: 0 } : c);
      queueMicrotask(() => {
        const total = next.reduce((sum, c) => sum + c.unreadCount, 0);
        window.dispatchEvent(new CustomEvent('chatr:unread-changed', { detail: { total } }));
      });
      return next;
    });
  }, []);

  return {
    conversations: displayList,
    loading,
    syncing,
    error,
    search,
    setSearch,
    onlineUserIds,
    refresh: fetchConversations,
    clearUnread,
  };
}

