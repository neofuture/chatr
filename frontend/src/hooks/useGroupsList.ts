'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface GroupSummary {
  id: string;
  name: string;
  description?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  ownerId: string;
  members: Array<{
    id: string;
    userId: string;
    role?: string;
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
  summary?: string | null;
}

export interface GroupInvite {
  groupId: string;
  groupName: string;
  groupDescription?: string | null;
  memberCount: number;
  invitedBy: string;
  invitedById?: string | null;
}

export function useGroupsList() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useWebSocket();
  const unreadRef = useRef<Record<string, number>>({});

  const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchGroups = useCallback(async (retries = 2) => {
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
    } catch (e: any) {
      if (retries > 0) {
        retryTimer.current = setTimeout(() => fetchGroups(retries - 1), 1500);
        return;
      }
      console.error('useGroupsList fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvites = useCallback(async (retries = 2) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setInvites(data.invites ?? []);
    } catch (e: any) {
      if (retries > 0) {
        setTimeout(() => fetchInvites(retries - 1), 1500);
        return;
      }
      console.error('useGroupsList fetchInvites error:', e);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchInvites();
    return () => clearTimeout(retryTimer.current);
  }, [fetchGroups, fetchInvites]);

  // Accept a group invite
  const acceptInvite = useCallback(async (groupId: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to accept invite');
      const data = await res.json();
      // Remove from invites, add to groups
      setInvites(prev => prev.filter(i => i.groupId !== groupId));
      if (data.group) {
        setGroups(prev => {
          if (prev.find(g => g.id === groupId)) return prev;
          return [{ ...data.group, unreadCount: 0 }, ...prev];
        });
      }
      return data.group ?? null;
    } catch (e) {
      console.error('acceptInvite error:', e);
      return null;
    }
  }, []);

  // Decline a group invite
  const declineInvite = useCallback(async (groupId: string) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${groupId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to decline invite');
      setInvites(prev => prev.filter(i => i.groupId !== groupId));
    } catch (e) {
      console.error('declineInvite error:', e);
    }
  }, []);

  // Listen for new group messages
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
          fetchGroups();
          return prev;
        }
        const group = prev[idx];
        const isMine = payload.sender?.id === currentUserId;
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
            sender: { displayName: payload.sender?.displayName ?? null, username: payload.sender?.username ?? '' },
          },
        };
        const rest = prev.filter(g => g.id !== payload.groupId);
        return [updated, ...rest];
      });
    };

    // Real-time group invite received
    const handleGroupInvite = (payload: GroupInvite) => {
      setInvites(prev => {
        if (prev.find(i => i.groupId === payload.groupId)) return prev;
        return [payload, ...prev];
      });
    };

    // Someone else accepted (we're an existing member — refresh the group's member count)
    const handleInviteAccepted = () => {
      fetchGroups();
    };

    // Creator was notified their invite was declined — no UI change needed beyond toast handled elsewhere
    const handleInviteDeclined = () => { /* no-op */ };

    // group:created fires when WE accept — add to groups list
    const handleGroupCreated = (data: { group: GroupSummary }) => {
      setGroups(prev => {
        if (prev.find(g => g.id === data.group.id)) return prev;
        return [{ ...data.group, unreadCount: 0 }, ...prev];
      });
    };

    // group:removed fires when WE are kicked from a group
    const handleGroupRemoved = (data: { groupId: string }) => {
      setGroups(prev => prev.filter(g => g.id !== data.groupId));
      // Also remove any pending invite for that group
      setInvites(prev => prev.filter(i => i.groupId !== data.groupId));
    };

    // group:deleted fires when the group is deleted (for all members)
    const handleGroupDeleted = (data: { groupId: string }) => {
      setGroups(prev => prev.filter(g => g.id !== data.groupId));
      setInvites(prev => prev.filter(i => i.groupId !== data.groupId));
    };

    const handleMemberJoined = () => {
      fetchGroups();
    };

    // group:memberLeft — refresh member count
    const handleMemberLeft = () => {
      fetchGroups();
    };

    // group:updated — partial update (name, profileImage, coverImage, etc.)
    const handleGroupUpdated = (data: { group: Partial<GroupSummary> & { id: string } }) => {
      setGroups(prev => prev.map(g =>
        g.id === data.group.id ? { ...g, ...data.group } : g
      ));
    };

    socket.on('group:message', handleGroupMessage);
    socket.on('group:invite', handleGroupInvite);
    socket.on('group:inviteAccepted', handleInviteAccepted);
    socket.on('group:inviteDeclined', handleInviteDeclined);
    socket.on('group:created', handleGroupCreated);
    socket.on('group:removed', handleGroupRemoved);
    socket.on('group:deleted', handleGroupDeleted);
    socket.on('group:memberJoined', handleMemberJoined);
    socket.on('group:memberLeft', handleMemberLeft);
    socket.on('group:updated', handleGroupUpdated);
    return () => {
      socket.off('group:message', handleGroupMessage);
      socket.off('group:invite', handleGroupInvite);
      socket.off('group:inviteAccepted', handleInviteAccepted);
      socket.off('group:inviteDeclined', handleInviteDeclined);
      socket.off('group:created', handleGroupCreated);
      socket.off('group:removed', handleGroupRemoved);
      socket.off('group:deleted', handleGroupDeleted);
      socket.off('group:memberJoined', handleMemberJoined);
      socket.off('group:memberLeft', handleMemberLeft);
      socket.off('group:updated', handleGroupUpdated);
    };
  }, [socket, fetchGroups]);

  // Notify BottomNav of total group unread + pending invites
  useEffect(() => {
    const total = groups.reduce((s, g) => s + (g.unreadCount ?? 0), 0) + invites.length;
    window.dispatchEvent(new CustomEvent('chatr:group-unread-changed', { detail: { total } }));
  }, [groups, invites]);

  const clearUnread = useCallback((groupId: string) => {
    unreadRef.current[groupId] = 0;
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, unreadCount: 0 } : g));
  }, []);

  return { groups, invites, loading, refresh: fetchGroups, refreshInvites: fetchInvites, clearUnread, acceptInvite, declineInvite };
}


