'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import type { FriendEntry, FriendRequest, FriendUser, AvailableUser } from '@/types/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export function useFriends() {
  const { socket } = useWebSocket();
  const { showToast } = useToast();

  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [blocked, setBlocked] = useState<FriendEntry[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [searching, setSearching] = useState(false);

  const [loading, setLoading] = useState(true);

  // ── Load all friend data ──────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const [fr, inc, out, bl] = await Promise.all([
        fetch(`${API}/api/friends`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/api/friends/requests/incoming`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/api/friends/requests/outgoing`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/api/friends/blocked`, { headers: authHeaders() }).then(r => r.json()),
      ]);
      setFriends(fr.friends ?? []);
      setIncoming(inc.requests ?? []);
      setOutgoing(out.requests ?? []);
      setBlocked(bl.blocked ?? []);
    } catch (err) {
      console.error('useFriends refresh error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Real-time socket events ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { type: string; friendshipId: string; from: AvailableUser }) => {
      refresh();
      const name = data.from.displayName || data.from.username;
      switch (data.type) {
        case 'request':
          showToast(`${name} sent you a friend request`, 'info', 4000, undefined, undefined, 'Friend Request');
          break;
        case 'accepted':
          showToast(`${name} accepted your friend request`, 'success', 4000, undefined, undefined, 'Friend Accepted');
          break;
        case 'declined':
          showToast(`${name} declined your friend request`, 'warning', 4000, undefined, undefined, 'Friend Declined');
          break;
        case 'removed':
          showToast(`${name} removed you as a friend`, 'warning', 4000, undefined, undefined, 'Friend Removed');
          break;
      }
    };
    socket.on('friend:update', handler);
    return () => { socket.off('friend:update', handler); };
  }, [socket, refresh, showToast]);

  // ── Search ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API}/api/friends/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        setSearchResults(data.users ?? []);
      } catch (err) {
        console.error('friend search error', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendRequest = useCallback(async (addresseeId: string) => {
    const res = await fetch(`${API}/api/friends/request`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ addresseeId }),
    });
    const data = await res.json();
    if (res.ok) {
      // Notify addressee via socket
      socket?.emit('friend:notify', {
        type: 'request',
        addresseeId,
        friendshipId: data.friendship.id,
      });
      await refresh();
      // Refresh search results to reflect updated status
      if (searchQuery.trim().length >= 2) {
        const sr = await fetch(`${API}/api/friends/search?q=${encodeURIComponent(searchQuery)}`, { headers: authHeaders() });
        setSearchResults((await sr.json()).users ?? []);
      }
    }
    return data;
  }, [socket, refresh, searchQuery]);

  const acceptRequest = useCallback(async (friendshipId: string, requesterId: string) => {
    const res = await fetch(`${API}/api/friends/${friendshipId}/accept`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) {
      socket?.emit('friend:notify', { type: 'accepted', addresseeId: requesterId, friendshipId });
      await refresh();
    }
    return res.ok;
  }, [socket, refresh]);

  const declineRequest = useCallback(async (friendshipId: string, otherUserId: string) => {
    const res = await fetch(`${API}/api/friends/${friendshipId}/decline`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) {
      socket?.emit('friend:notify', { type: 'declined', addresseeId: otherUserId, friendshipId });
      await refresh();
    }
    return res.ok;
  }, [socket, refresh]);

  const removeFriend = useCallback(async (friendshipId: string, otherUserId: string) => {
    const res = await fetch(`${API}/api/friends/${friendshipId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      socket?.emit('friend:notify', { type: 'removed', addresseeId: otherUserId, friendshipId });
      await refresh();
    }
    return res.ok;
  }, [socket, refresh]);

  const blockUser = useCallback(async (targetUserId: string) => {
    const res = await fetch(`${API}/api/friends/${targetUserId}/block`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) await refresh();
    return res.ok;
  }, [refresh]);

  const unblockUser = useCallback(async (targetUserId: string) => {
    const res = await fetch(`${API}/api/friends/${targetUserId}/unblock`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) await refresh();
    return res.ok;
  }, [refresh]);

  return {
    friends,
    incoming,
    outgoing,
    blocked,
    loading,
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    blockUser,
    unblockUser,
    refresh,
  };
}

