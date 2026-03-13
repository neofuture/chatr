'use client';

import { useState, useEffect, useRef } from 'react';
import type { PresenceInfo } from '@/types/types';
import { usePresence } from '@/contexts/PresenceContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import PaneSearchBox, { type PaneSearchBoxHandle } from '@/components/common/PaneSearchBox/PaneSearchBox';
import UserRow from '@/components/common/UserRow/UserRow';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import { socketFirst } from '@/lib/socketRPC';
import styles from './AddGroupMembersPanel.module.css';

interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  isFriend: boolean;
}

interface Props {
  groupId: string;
  existingMemberIds: string[];
  onMembersAdded: () => void;
}

const OFFLINE_PRESENCE = { status: 'offline' as const, lastSeen: null, hidden: true };

export default function AddGroupMembersPanel({ groupId, existingMemberIds, onMembersAdded }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [inviting, setInviting] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const searchRef = useRef<PaneSearchBoxHandle>(null);
  const { userPresence } = usePresence();
  const { socket } = useWebSocket();
  const { showToast } = useToast();

  const memberSet = useRef(new Set(existingMemberIds));

  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  const runSearch = (q: string) => {
    if (!q.trim()) { setResults([]); setSearching(false); setSearchError(false); return; }
    setSearching(true);
    setSearchError(false);
    (async () => {
      try {
        const data = await socketFirst(socket, 'users:search', { q: q.trim() }, 'GET', `/api/users/search?q=${encodeURIComponent(q.trim())}`) as any;
        setResults((data?.users ?? []).filter((u: UserSearchResult) => !memberSet.current.has(u.id)));
        setSearchError(false);
      } catch {
        setSearchError(true);
        setResults([]);
      } finally {
        setSearching(false);
      }
    })();
  };

  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current);
    if (!query.trim()) { setResults([]); setSearching(false); setSearchError(false); return; }
    setSearching(true);
    timeout.current = setTimeout(() => runSearch(query), 250);
    return () => { if (timeout.current) clearTimeout(timeout.current); };
  }, [query]);

  const toggleUser = (user: UserSearchResult) => {
    setSelected(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user],
    );
  };

  const handleInviteAll = async () => {
    if (selected.length === 0) return;
    setInviting(true);
    let successCount = 0;
    for (const user of selected) {
      try {
        const data = await socketFirst(socket, 'groups:members:add', { groupId, memberId: user.id }, 'POST', `/api/groups/${groupId}/members`, { memberId: user.id }) as any;
        if (data?.group) {
          successCount++;
          memberSet.current.add(user.id);
        } else {
          const name = user.displayName || user.username.replace(/^@/, '');
          showToast(data?.error || `Failed to invite ${name}`, 'error');
        }
      } catch {
        const name = user.displayName || user.username.replace(/^@/, '');
        showToast(`Failed to invite ${name}`, 'error');
      }
    }
    setInviting(false);
    if (successCount > 0) {
      showToast(
        successCount === 1
          ? `Invited ${selected[0].displayName || selected[0].username.replace(/^@/, '')}`
          : `Invited ${successCount} people`,
        'success',
      );
      setSelected([]);
      setQuery('');
      setResults([]);
      onMembersAdded();
    }
  };

  return (
    <div className={styles.container}>
      {selected.length > 0 && (
        <div className={styles.selectedBar}>
          {selected.map(u => (
            <button key={u.id} className={styles.chip} onClick={() => toggleUser(u)}>
              <PresenceAvatar profileImage={u.profileImage} displayName={u.displayName || u.username} size={28} showDot={false} info={OFFLINE_PRESENCE} />
              <span className={styles.chipName}>{u.displayName || u.username.replace(/^@/, '')}</span>
              <i className="fas fa-times" />
            </button>
          ))}
        </div>
      )}

      <PaneSearchBox
        ref={searchRef}
        value={query}
        onChange={setQuery}
        placeholder="Search people to invite…"
        autoFocus
      />

      <div className={styles.list}>
        {!query.trim() && selected.length === 0 ? (
          <div className={styles.empty}>
            <i className="fas fa-user-plus" />
            <div>Search for people to add to the group</div>
          </div>
        ) : !query.trim() && selected.length > 0 ? (
          <div className={styles.empty}>
            <div>Search to add more people</div>
          </div>
        ) : searching ? (
          <div className={styles.empty}><div>Searching…</div></div>
        ) : searchError ? (
          <div className={styles.empty}>
            <i className="fas fa-exclamation-triangle" />
            <div>Search failed — check your connection</div>
            <button className={styles.retryBtn} onClick={() => runSearch(query)}>
              <i className="fas fa-redo" /> Retry
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className={styles.empty}><i className="fas fa-search" /><div>No users found</div></div>
        ) : (
          results.map(user => {
            const displayName = user.displayName || user.username.replace(/^@/, '');
            const info: PresenceInfo = user.isFriend
              ? (userPresence[user.id] ?? { status: 'offline', lastSeen: null })
              : { status: 'offline', lastSeen: null, hidden: true };
            const isSelected = !!selected.find(u => u.id === user.id);
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
                actions={
                  <div className={`${styles.checkCircle} ${isSelected ? styles.checkCircleOn : ''}`}>
                    {isSelected && <i className="fas fa-check" />}
                  </div>
                }
                onClick={() => toggleUser(user)}
              />
            );
          })
        )}
      </div>

      {selected.length > 0 && (
        <div className={styles.footer}>
          <span className={styles.footerCount}>{selected.length} selected</span>
          <button className={styles.inviteBtn} onClick={handleInviteAll} disabled={inviting}>
            {inviting
              ? <><i className="fas fa-spinner fa-spin" /> Inviting…</>
              : <><i className="fas fa-paper-plane" /> Invite {selected.length > 1 ? `${selected.length} People` : ''}</>}
          </button>
        </div>
      )}
    </div>
  );
}
