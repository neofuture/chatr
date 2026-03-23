'use client';

import { useState, useEffect, useRef } from 'react';
import type { PresenceInfo } from '@/types/types';
import { usePresence } from '@/contexts/PresenceContext';
import PaneSearchBox, { type PaneSearchBoxHandle } from '@/components/common/PaneSearchBox/PaneSearchBox';
import UserRow from '@/components/common/UserRow/UserRow';
import { getApiBase } from '@/lib/api';

const API = getApiBase();

interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
  lastSeen: string | null;
  isFriend: boolean;
  friendship: { id: string; status: string; iRequested: boolean } | null;
}

interface Props {
  isDark: boolean;
  onSelectUser: (id: string, userData: { displayName: string | null; username: string; profileImage: string | null }) => void;
}

export default function NewChatPanel({ isDark, onSelectUser }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const searchRef = useRef<PaneSearchBoxHandle>(null);
  const { userPresence } = usePresence();

  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current);

    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    timeout.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch(
          `${API}/api/users/search?q=${encodeURIComponent(query.trim())}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.users ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  }, [query]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PaneSearchBox
        ref={searchRef}
        value={query}
        onChange={setQuery}
        placeholder="Search users..."
        autoFocus
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!query.trim() ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4 }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>
              <i className="fas fa-user-plus" />
            </div>
            <div style={{ fontSize: '13px' }}>
              Search for a user to start a conversation
            </div>
          </div>
        ) : searching ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4 }}>
            <div style={{ fontSize: '13px' }}>Searching...</div>
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4 }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '13px' }}>No users found</div>
          </div>
        ) : (
          results.map(user => {
            const displayName = user.displayName || user.username.replace(/^@/, '');
            const info: PresenceInfo = user.isFriend
              ? (userPresence[user.id] ?? { status: 'offline', lastSeen: null })
              : { status: 'offline', lastSeen: null, hidden: true };

            return (
              <UserRow
                key={user.id}
                profileImage={user.profileImage}
                displayName={displayName}
                subtitle={user.username}
                presence={info}
                showPresenceDot={!info.hidden}
                avatarSize={44}
                isFriend={user.isFriend}
                onClick={() => onSelectUser(user.id, {
                  displayName: user.displayName,
                  username: user.username,
                  profileImage: user.profileImage,
                })}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
