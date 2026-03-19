'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { socketFirst } from '@/lib/socketRPC';

export interface GroupSummary {
  id: string;
  name: string;
  description?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  ownerId?: string;
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

const GROUPS_CACHE_KEY = 'chatr:groups';
const INVITES_CACHE_KEY = 'chatr:group-invites';

function loadCached<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveCache<T>(key: string, list: T[]) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
}

export function useGroupsList() {
  const cachedGroups = useRef(loadCached<GroupSummary>(GROUPS_CACHE_KEY));
  const cachedInvites = useRef(loadCached<GroupInvite>(INVITES_CACHE_KEY));
  const [groups, setGroups] = useState<GroupSummary[]>(cachedGroups.current);
  const [invites, setInvites] = useState<GroupInvite[]>(cachedInvites.current);
  const [loading, setLoading] = useState(cachedGroups.current.length === 0);
  const [syncing, setSyncing] = useState(false);
  const { socket, connected } = useWebSocket();
  const unreadRef = useRef<Record<string, number>>({});

  // Persist to localStorage whenever lists change
  useEffect(() => { saveCache(GROUPS_CACHE_KEY, groups); }, [groups]);
  useEffect(() => { saveCache(INVITES_CACHE_KEY, invites); }, [invites]);

  const fetchGroups = useCallback(async () => {
    if (!connected) { setSyncing(false); return; }
    try {
      setSyncing(true);
      const data = await socketFirst(socket, 'groups:list', {}, 'GET', '/api/groups') as any;
      if (data?.groups) {
        setGroups(data.groups.map((g: GroupSummary) => ({
          ...g,
          unreadCount: unreadRef.current[g.id] ?? 0,
        })));
      }
    } catch (e: any) {
      console.warn('useGroupsList fetch error:', e?.message || e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [socket, connected]);

  const fetchInvites = useCallback(async () => {
    if (!connected) return;
    try {
      const data = await socketFirst(socket, 'groups:invites', {}, 'GET', '/api/groups/invites') as any;
      if (data?.invites) setInvites(data.invites);
    } catch (e: any) {
      console.warn('useGroupsList fetchInvites error:', e?.message || e);
    }
  }, [socket, connected]);

  useEffect(() => {
    fetchGroups();
    fetchInvites();
  }, [fetchGroups, fetchInvites]);

  const acceptInvite = useCallback(async (groupId: string) => {
    try {
      const data = await socketFirst(socket, 'groups:accept', { groupId }, 'POST', `/api/groups/${groupId}/accept`) as any;
      setInvites(prev => prev.filter(i => i.groupId !== groupId));
      if (data?.group) {
        setGroups(prev => {
          if (prev.find(g => g.id === groupId)) return prev;
          return [{ ...data.group, unreadCount: 0 }, ...prev];
        });
      }
      return data?.group ?? null;
    } catch (e) {
      console.error('acceptInvite error:', e);
      return null;
    }
  }, [socket]);

  const declineInvite = useCallback(async (groupId: string) => {
    try {
      await socketFirst(socket, 'groups:decline', { groupId }, 'POST', `/api/groups/${groupId}/decline`);
      setInvites(prev => prev.filter(i => i.groupId !== groupId));
    } catch (e) {
      console.error('declineInvite error:', e);
    }
  }, [socket]);

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

    // Someone else accepted (we're an existing member — add them to that group's members)
    const handleInviteAccepted = (data: { groupId: string; acceptedBy?: string }) => {
      if (!data.groupId) return;
      // We'll get the full member via group:memberJoined, so just remove from invites
      setInvites(prev => prev.filter(i => i.groupId !== data.groupId));
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
      setInvites(prev => prev.filter(i => i.groupId !== data.groupId));
    };

    // group:deleted fires when the group is deleted (for all members)
    const handleGroupDeleted = (data: { groupId: string }) => {
      setGroups(prev => prev.filter(g => g.id !== data.groupId));
      setInvites(prev => prev.filter(i => i.groupId !== data.groupId));
    };

    const handleMemberJoined = (data: { groupId: string; member?: { id: string; userId: string; role?: string; user: { id: string; username: string; displayName: string | null; profileImage: string | null } } }) => {
      if (!data.groupId || !data.member) return;
      setGroups(prev => prev.map(g => {
        if (g.id !== data.groupId) return g;
        if (g.members.some(m => m.userId === data.member!.userId)) return g;
        return { ...g, members: [...g.members, data.member!] };
      }));
    };

    const handleMemberLeft = (data: { groupId: string; memberId: string }) => {
      if (!data.groupId) return;
      setGroups(prev => prev.map(g => {
        if (g.id !== data.groupId) return g;
        return { ...g, members: g.members.filter(m => m.userId !== data.memberId) };
      }));
    };

    // group:updated — partial update (name, profileImage, coverImage, etc.)
    const handleGroupUpdated = (data: { group: Partial<GroupSummary> & { id: string } }) => {
      setGroups(prev => prev.map(g =>
        g.id === data.group.id ? { ...g, ...data.group } : g
      ));
    };

    const updateMemberRole = (groupId: string, memberId: string, role: string) => {
      setGroups(prev => prev.map(g => {
        if (g.id !== groupId) return g;
        return { ...g, members: g.members.map(m => m.userId === memberId ? { ...m, role } : m) };
      }));
    };

    const handleMemberPromoted = (data: { groupId: string; memberId: string }) => {
      updateMemberRole(data.groupId, data.memberId, 'admin');
    };
    const handleMemberDemoted = (data: { groupId: string; memberId: string }) => {
      updateMemberRole(data.groupId, data.memberId, 'member');
    };
    const handleOwnerChanged = (data: { groupId: string; newOwnerId: string }) => {
      updateMemberRole(data.groupId, data.newOwnerId, 'owner');
    };
    const handleOwnershipTransferred = (data: { groupId: string; newOwnerId: string }) => {
      updateMemberRole(data.groupId, data.newOwnerId, 'owner');
    };
    const handleOwnerSteppedDown = (data: { groupId: string; userId: string }) => {
      updateMemberRole(data.groupId, data.userId, 'admin');
    };

    const handleGroupMessageUnsent = (data: { messageId: string; groupId: string }) => {
      setGroups(prev => prev.map(g => {
        if (g.id !== data.groupId) return g;
        if (g.lastMessage?.id !== data.messageId) return g;
        return {
          ...g,
          lastMessage: { ...g.lastMessage, content: 'Message unsent' },
        };
      }));
    };

    socket.on('group:message', handleGroupMessage);
    socket.on('group:message:unsent', handleGroupMessageUnsent);
    socket.on('group:invite', handleGroupInvite);
    socket.on('group:inviteAccepted', handleInviteAccepted);
    socket.on('group:inviteDeclined', handleInviteDeclined);
    socket.on('group:created', handleGroupCreated);
    socket.on('group:removed', handleGroupRemoved);
    socket.on('group:deleted', handleGroupDeleted);
    socket.on('group:memberJoined', handleMemberJoined);
    socket.on('group:memberLeft', handleMemberLeft);
    socket.on('group:updated', handleGroupUpdated);
    socket.on('group:memberPromoted', handleMemberPromoted);
    socket.on('group:memberDemoted', handleMemberDemoted);
    socket.on('group:ownerChanged', handleOwnerChanged);
    socket.on('group:ownershipTransferred', handleOwnershipTransferred);
    socket.on('group:ownerSteppedDown', handleOwnerSteppedDown);
    return () => {
      socket.off('group:message', handleGroupMessage);
      socket.off('group:message:unsent', handleGroupMessageUnsent);
      socket.off('group:invite', handleGroupInvite);
      socket.off('group:inviteAccepted', handleInviteAccepted);
      socket.off('group:inviteDeclined', handleInviteDeclined);
      socket.off('group:created', handleGroupCreated);
      socket.off('group:removed', handleGroupRemoved);
      socket.off('group:deleted', handleGroupDeleted);
      socket.off('group:memberJoined', handleMemberJoined);
      socket.off('group:memberLeft', handleMemberLeft);
      socket.off('group:updated', handleGroupUpdated);
      socket.off('group:memberPromoted', handleMemberPromoted);
      socket.off('group:memberDemoted', handleMemberDemoted);
      socket.off('group:ownerChanged', handleOwnerChanged);
      socket.off('group:ownershipTransferred', handleOwnershipTransferred);
      socket.off('group:ownerSteppedDown', handleOwnerSteppedDown);
    };
  }, [socket]);

  // Notify BottomNav of total group unread + pending invites
  useEffect(() => {
    const total = groups.reduce((s, g) => s + (g.unreadCount ?? 0), 0) + invites.length;
    window.dispatchEvent(new CustomEvent('chatr:group-unread-changed', { detail: { total } }));
  }, [groups, invites]);

  const clearUnread = useCallback((groupId: string) => {
    unreadRef.current[groupId] = 0;
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, unreadCount: 0 } : g));
  }, []);

  return { groups, invites, loading, syncing, refresh: fetchGroups, refreshInvites: fetchInvites, clearUnread, acceptInvite, declineInvite };
}


