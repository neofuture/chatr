'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import type { FriendEntry, FriendRequest, FriendUser, AvailableUser } from '@/types/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

interface FriendsContextValue {
  friends: FriendEntry[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  blocked: FriendEntry[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: FriendUser[];
  searching: boolean;
  sendRequest: (addresseeId: string) => Promise<any>;
  acceptRequest: (friendshipId: string, requesterId: string) => Promise<boolean>;
  declineRequest: (friendshipId: string, otherUserId: string) => Promise<boolean>;
  cancelRequest: (friendshipId: string, addresseeId: string) => Promise<boolean>;
  removeFriend: (friendshipId: string, otherUserId: string) => Promise<boolean>;
  blockUser: (targetUserId: string) => Promise<boolean>;
  unblockUser: (targetUserId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

export function FriendsProvider({ children }: { children: ReactNode }) {
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
      console.error('FriendsContext refresh error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Real-time socket events ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { type: string; friendshipId: string; from: AvailableUser }) => {
      // Refresh our own friends data
      refresh();
      // Also tell the conversation list to refresh
      window.dispatchEvent(new CustomEvent('chatr:friends-changed', { detail: { action: data.type, targetUserId: data.from.id } }));

      const name = data.from.displayName || data.from.username;
      switch (data.type) {
        case 'request':
          showToast(`${name} sent you a friend request`, 'info', 4000, undefined, undefined, 'Friend Request');
          break;
        case 'accepted':
          showToast(`${name} accepted your friend request`, 'success', 4000, undefined, undefined, 'Friend Accepted');
          break;
        case 'declined':
          // The sender receives this — their request was declined
          showToast(`${name} declined your friend request`, 'warning', 4000, undefined, undefined, 'Friend Declined');
          break;
        case 'cancelled':
          // The addressee receives this — the sender withdrew their request (silent, no toast)
          break;
        case 'removed':
          showToast(`${name} removed you as a friend`, 'warning', 4000, undefined, undefined, 'Friend Removed');
          break;
        // blocked/unblocked are silent — no toast needed for the blocked party
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
      socket?.emit('friend:notify', { type: 'request', addresseeId, friendshipId: data.friendship.id });
      await refresh();
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

  const declineRequest = useCallback(async (friendshipId: string, requesterId: string) => {
    // Look up the requester's name for the local toast
    const requester = incoming.find(r => r.friendshipId === friendshipId);
    const requesterName = requester
      ? (requester.user.displayName || requester.user.username.replace(/^@/, ''))
      : 'them';

    const res = await fetch(`${API}/api/friends/${friendshipId}/decline`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) {
      // Tell the original sender their request was declined
      socket?.emit('friend:notify', { type: 'declined', addresseeId: requesterId, friendshipId });
      // Show the decliner their own confirmation toast
      showToast(`You declined the friend request from ${requesterName}`, 'info', 4000, undefined, undefined, 'Request Declined');
      await refresh();
    }
    return res.ok;
  }, [socket, refresh, showToast, incoming]);

  // Cancel an outgoing request that the current user sent
  const cancelRequest = useCallback(async (friendshipId: string, addresseeId: string) => {
    const outgoingReq = outgoing.find(r => r.friendshipId === friendshipId);
    const addresseeName = outgoingReq
      ? (outgoingReq.user.displayName || outgoingReq.user.username.replace(/^@/, ''))
      : 'them';

    const res = await fetch(`${API}/api/friends/${friendshipId}/decline`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) {
      // Silently notify the addressee so their UI removes the incoming request
      socket?.emit('friend:notify', { type: 'cancelled', addresseeId, friendshipId });
      showToast(`Friend request to ${addresseeName} cancelled`, 'info', 3000, undefined, undefined, 'Request Cancelled');
      await refresh();
      // Refresh search results so the "Pending" button resets
      if (searchQuery.trim().length >= 2) {
        const sr = await fetch(`${API}/api/friends/search?q=${encodeURIComponent(searchQuery)}`, { headers: authHeaders() });
        setSearchResults((await sr.json()).users ?? []);
      }
    }
    return res.ok;
  }, [socket, refresh, showToast, outgoing, searchQuery]);

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
    if (res.ok) {
      socket?.emit('friend:notify', { type: 'blocked', addresseeId: targetUserId });
      refresh();
      window.dispatchEvent(new CustomEvent('chatr:friends-changed', { detail: { action: 'block', targetUserId } }));
    }
    return res.ok;
  }, [socket, refresh]);

  const unblockUser = useCallback(async (targetUserId: string) => {
    const res = await fetch(`${API}/api/friends/${targetUserId}/unblock`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) {
      socket?.emit('friend:notify', { type: 'unblocked', addresseeId: targetUserId });
      refresh();
      window.dispatchEvent(new CustomEvent('chatr:friends-changed', { detail: { action: 'unblock', targetUserId } }));
    }
    return res.ok;
  }, [socket, refresh]);

  return (
    <FriendsContext.Provider value={{
      friends, incoming, outgoing, blocked, loading,
      searchQuery, setSearchQuery, searchResults, searching,
      sendRequest, acceptRequest, declineRequest, cancelRequest, removeFriend,
      blockUser, unblockUser, refresh,
    }}>
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used within a FriendsProvider');
  return ctx;
}

