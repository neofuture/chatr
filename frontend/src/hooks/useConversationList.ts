'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

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
  // set by socket events
  isOnline?: boolean;
}

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

function getToken() {
  return localStorage.getItem('token') || '';
}

export function useConversationList() {
  const { socket } = useWebSocket();
  const [conversations, setConversations] = useState<ConversationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [searchResults, setSearchResults] = useState<ConversationUser[] | null>(null);
  const [searching, setSearching] = useState(false);

  // ── Fetch conversations ──────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getApiBase()}/api/users/conversations`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = await res.json();
      setConversations(data.conversations ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

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

    // When a new message arrives, bump that conversation to the top
    const onMessage = (data: any) => {
      const otherId = data.senderId;
      setConversations(prev =>
        prev.map(c =>
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
              }
            : c
        )
      );
    };

    socket.on('presence:update', onPresence);
    socket.on('user:status',     onUserStatus);
    socket.on('message:receive', onMessage);

    return () => {
      socket.off('presence:update', onPresence);
      socket.off('user:status',     onUserStatus);
      socket.off('message:receive', onMessage);
    };
  }, [socket]);

  // ── Search ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!search.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${getApiBase()}/api/users/search?q=${encodeURIComponent(search.trim())}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSearchResults(data.users ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, [search]);

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

  // Apply search results if active (overlay on top of sorted list)
  const displayList: ConversationUser[] = searchResults !== null
    ? searchResults.map(u => {
        const existing = conversations.find(c => c.id === u.id);
        return {
          ...u,
          lastMessage: existing?.lastMessage ?? null,
          unreadCount: existing?.unreadCount ?? 0,
          lastMessageAt: existing?.lastMessageAt ?? null,
          isOnline: onlineUserIds.has(u.id),
        };
      })
    : sorted;

  const clearUnread = useCallback((userId: string) => {
    setConversations(prev =>
      prev.map(c => c.id === userId ? { ...c, unreadCount: 0 } : c)
    );
  }, []);

  return {
    conversations: displayList,
    loading,
    error,
    search,
    setSearch,
    searching,
    onlineUserIds,
    refresh: fetchConversations,
    clearUnread,
  };
}

