'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { socketFirst } from '@/lib/socketRPC';
import type { FriendEntry, FriendRequest, FriendUser, AvailableUser } from '@/types/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

const FRIENDS_CACHE_KEY = 'chatr:friends-data';

function loadFriendsCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FRIENDS_CACHE_KEY);
    if (raw) return JSON.parse(raw) as { friends: FriendEntry[]; incoming: FriendRequest[]; outgoing: FriendRequest[]; blocked: FriendEntry[] };
  } catch {}
  return null;
}

function saveFriendsCache(data: { friends: FriendEntry[]; incoming: FriendRequest[]; outgoing: FriendRequest[]; blocked: FriendEntry[] }) {
  try { localStorage.setItem(FRIENDS_CACHE_KEY, JSON.stringify(data)); } catch {}
}

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { socket } = useWebSocket();
  const { showToast } = useToast();
  const cachedFriends = useRef(loadFriendsCache());

  const [friends, setFriends] = useState<FriendEntry[]>(cachedFriends.current?.friends ?? []);
  const [incoming, setIncoming] = useState<FriendRequest[]>(cachedFriends.current?.incoming ?? []);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>(cachedFriends.current?.outgoing ?? []);
  const [blocked, setBlocked] = useState<FriendEntry[]>(cachedFriends.current?.blocked ?? []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(cachedFriends.current === null);

  // Persist friends data to localStorage on changes
  useEffect(() => {
    saveFriendsCache({ friends, incoming, outgoing, blocked });
  }, [friends, incoming, outgoing, blocked]);

  // ── Load all friend data ──────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || token === 'undefined') { setLoading(false); return; }
    try {
      const [fr, inc, out, bl] = await Promise.all([
        socketFirst(socket, 'friends:list', {}, 'GET', '/api/friends'),
        socketFirst(socket, 'friends:requests:incoming', {}, 'GET', '/api/friends/requests/incoming'),
        socketFirst(socket, 'friends:requests:outgoing', {}, 'GET', '/api/friends/requests/outgoing'),
        socketFirst(socket, 'friends:blocked', {}, 'GET', '/api/friends/blocked'),
      ]) as any[];
      setFriends(fr?.friends ?? []);
      setIncoming(inc?.requests ?? []);
      setOutgoing(out?.requests ?? []);
      setBlocked(bl?.blocked ?? []);
    } catch (err: any) {
      console.error('FriendsContext refresh error', err);
    } finally {
      setLoading(false);
    }
  }, [socket]);

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
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await socketFirst(socket, 'friends:search', { q: searchQuery }, 'GET', `/api/friends/search?q=${encodeURIComponent(searchQuery)}`) as any;
        if (!cancelled) setSearchResults(data?.users ?? []);
      } catch (err: any) {
        console.error('friend search error', err);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, socket]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const refreshSearch = useCallback(async () => {
    if (searchQuery.trim().length >= 2) {
      const sr = await socketFirst(socket, 'friends:search', { q: searchQuery }, 'GET', `/api/friends/search?q=${encodeURIComponent(searchQuery)}`) as any;
      setSearchResults(sr?.users ?? []);
    }
  }, [socket, searchQuery]);

  const sendRequest = useCallback(async (addresseeId: string) => {
    const data = await socketFirst(socket, 'friends:request', { addresseeId }, 'POST', '/api/friends/request', { addresseeId }) as any;
    if (data?.friendship) {
      socket?.emit('friend:notify', { type: 'request', addresseeId, friendshipId: data.friendship.id });
      await refresh();
      await refreshSearch();
    }
    return data;
  }, [socket, refresh, refreshSearch]);

  const acceptRequest = useCallback(async (friendshipId: string, requesterId: string) => {
    const data = await socketFirst(socket, 'friends:accept', { friendshipId }, 'POST', `/api/friends/${friendshipId}/accept`) as any;
    const ok = !!data?.friendship;
    if (ok) {
      socket?.emit('friend:notify', { type: 'accepted', addresseeId: requesterId, friendshipId });
      await refresh();
    }
    return ok;
  }, [socket, refresh]);

  const declineRequest = useCallback(async (friendshipId: string, requesterId: string) => {
    const requester = incoming.find(r => r.friendshipId === friendshipId);
    const requesterName = requester ? (requester.user.displayName || requester.user.username.replace(/^@/, '')) : 'them';
    const data = await socketFirst(socket, 'friends:decline', { friendshipId }, 'POST', `/api/friends/${friendshipId}/decline`) as any;
    const ok = !!data?.success;
    if (ok) {
      socket?.emit('friend:notify', { type: 'declined', addresseeId: requesterId, friendshipId });
      showToast(`You declined the friend request from ${requesterName}`, 'info', 4000, undefined, undefined, 'Request Declined');
      await refresh();
    }
    return ok;
  }, [socket, refresh, showToast, incoming]);

  const cancelRequest = useCallback(async (friendshipId: string, addresseeId: string) => {
    const outgoingReq = outgoing.find(r => r.friendshipId === friendshipId);
    const addresseeName = outgoingReq ? (outgoingReq.user.displayName || outgoingReq.user.username.replace(/^@/, '')) : 'them';
    const data = await socketFirst(socket, 'friends:decline', { friendshipId }, 'POST', `/api/friends/${friendshipId}/decline`) as any;
    const ok = !!data?.success;
    if (ok) {
      socket?.emit('friend:notify', { type: 'cancelled', addresseeId, friendshipId });
      showToast(`Friend request to ${addresseeName} cancelled`, 'info', 3000, undefined, undefined, 'Request Cancelled');
      await refresh();
      await refreshSearch();
    }
    return ok;
  }, [socket, refresh, showToast, outgoing, refreshSearch]);

  const removeFriend = useCallback(async (friendshipId: string, otherUserId: string) => {
    const data = await socketFirst(socket, 'friends:remove', { friendshipId }, 'DELETE', `/api/friends/${friendshipId}`) as any;
    const ok = !!data?.success;
    if (ok) {
      socket?.emit('friend:notify', { type: 'removed', addresseeId: otherUserId, friendshipId });
      await refresh();
    }
    return ok;
  }, [socket, refresh]);

  const blockUser = useCallback(async (targetUserId: string) => {
    const data = await socketFirst(socket, 'friends:block', { targetUserId }, 'POST', `/api/friends/${targetUserId}/block`) as any;
    const ok = !!data?.friendship;
    if (ok) {
      socket?.emit('friend:notify', { type: 'blocked', addresseeId: targetUserId });
      refresh();
      window.dispatchEvent(new CustomEvent('chatr:friends-changed', { detail: { action: 'block', targetUserId } }));
    }
    return ok;
  }, [socket, refresh]);

  const unblockUser = useCallback(async (targetUserId: string) => {
    const data = await socketFirst(socket, 'friends:unblock', { targetUserId }, 'POST', `/api/friends/${targetUserId}/unblock`) as any;
    const ok = !!data?.success;
    if (ok) {
      socket?.emit('friend:notify', { type: 'unblocked', addresseeId: targetUserId });
      refresh();
      window.dispatchEvent(new CustomEvent('chatr:friends-changed', { detail: { action: 'unblock', targetUserId } }));
    }
    return ok;
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

