'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface GroupSummary {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  members: Array<{
    id: string;
    userId: string;
    user: { id: string; username: string; displayName: string | null; profileImage: string | null };
  }>;
  lastMessage: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    sender: { displayName: string | null; username: string };
  } | null;
  unreadCount?: number;
}

export function useGroupsList() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useWebSocket();
  const unreadRef = useRef<Record<string, number>>({});

  const fetchGroups = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch groups');
      const data = await res.json();
      setGroups((data.groups ?? []).map((g: GroupSummary) => ({
        ...g,
        unreadCount: unreadRef.current[g.id] ?? 0,
      })));
    } catch (e) {
      console.error('useGroupsList fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Listen for new group messages to bump unread count and move group to top
  useEffect(() => {
    if (!socket) return;

    const handleGroupMessage = (payload: {
      groupId: string;
      content: string;
      type: string;
      createdAt: string;
      sender: { id: string; displayName: string | null; username: string };
    }) => {
      const currentUserId = (() => {
        try {
          const t = localStorage.getItem('token');
          if (!t) return '';
          const p = JSON.parse(atob(t.split('.')[1]));
          return p.userId || '';
        } catch { return ''; }
      })();

      setGroups(prev => {
        const idx = prev.findIndex(g => g.id === payload.groupId);
        if (idx === -1) {
          // New group we haven't loaded yet — refresh
          fetchGroups();
          return prev;
        }
        const group = prev[idx];
        const isMine = payload.sender.id === currentUserId;
        const newUnread = isMine ? (group.unreadCount ?? 0) : (group.unreadCount ?? 0) + 1;
        unreadRef.current[payload.groupId] = newUnread;

        const updated: GroupSummary = {
          ...group,
          unreadCount: newUnread,
          lastMessage: {
            id: '',
            content: payload.content,
            type: payload.type,
            createdAt: payload.createdAt,
            sender: { displayName: payload.sender.displayName, username: payload.sender.username },
          },
        };
        // Move to top
        const rest = prev.filter(g => g.id !== payload.groupId);
        return [updated, ...rest];
      });
    };

    socket.on('group:message', handleGroupMessage);
    return () => { socket.off('group:message', handleGroupMessage); };
  }, [socket, fetchGroups]);

  const clearUnread = useCallback((groupId: string) => {
    unreadRef.current[groupId] = 0;
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, unreadCount: 0 } : g));
  }, []);

  return { groups, loading, refresh: fetchGroups, clearUnread };
}

