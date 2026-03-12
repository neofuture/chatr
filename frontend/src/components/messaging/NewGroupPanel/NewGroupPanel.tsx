'use client';

import { useState, useEffect, useRef } from 'react';
import type { PresenceInfo } from '@/types/types';
import { usePresence } from '@/contexts/PresenceContext';
import PaneSearchBox, { type PaneSearchBoxHandle } from '@/components/common/PaneSearchBox/PaneSearchBox';
import UserRow from '@/components/common/UserRow/UserRow';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import styles from './NewGroupPanel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  isFriend: boolean;
}

interface Props {
  onGroupCreated: (group: { id: string; name: string; members: any[] }) => void;
}

const OFFLINE_PRESENCE = { status: 'offline' as const, lastSeen: null, hidden: true };

export default function NewGroupPanel({ onGroupCreated }: Props) {
  const [step, setStep] = useState<'members' | 'name'>('members');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const searchRef = useRef<PaneSearchBoxHandle>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const { userPresence } = usePresence();

  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (step === 'name') {
      const timer = setTimeout(() => nameRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const runSearch = (q: string) => {
    if (abortRef.current) abortRef.current.abort();
    if (!q.trim()) { setResults([]); setSearching(false); setSearchError(false); return; }
    setSearching(true);
    setSearchError(false);
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 8000);

    (async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`${API}/api/users/search?q=${encodeURIComponent(q.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.users ?? []);
        setSearchError(false);
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          setSearchError(true);
        } else {
          setSearchError(true);
        }
        setResults([]);
      } finally {
        clearTimeout(timer);
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
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim(), memberIds: selected.map(u => u.id) }),
      });
      if (!res.ok) throw new Error('Failed to create group');
      const data = await res.json();
      onGroupCreated(data.group);
    } catch (e) {
      console.error('Create group error:', e);
    } finally {
      setCreating(false);
    }
  };

  if (step === 'name') {
    return (
      <div className={styles.container}>
        {/* Selected members preview */}
        <div className={styles.selectedBar}>
          {selected.map(u => (
            <button key={u.id} className={styles.chip} onClick={() => { setSelected(prev => prev.filter(s => s.id !== u.id)); setStep('members'); }}>
              <PresenceAvatar profileImage={u.profileImage} displayName={u.displayName || u.username} size={28} showDot={false} info={OFFLINE_PRESENCE} />
              <span className={styles.chipName}>{u.displayName || u.username.replace(/^@/, '')}</span>
              <i className="fas fa-times" />
            </button>
          ))}
        </div>

        <div className={styles.nameStep}>
          <div className={styles.groupIconPreview}>
            <i className="fad fa-users" />
          </div>
          <p className={styles.nameHint}>Give your group a name</p>
          <input
            ref={nameRef}
            className={styles.nameInput}
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="Group name…"
            maxLength={60}
            onKeyDown={e => { if (e.key === 'Enter' && groupName.trim()) handleCreate(); }}
          />
          <div className={styles.nameActions}>
            <button className={styles.backBtn} onClick={() => setStep('members')}>
              <i className="fas fa-arrow-left" /> Back
            </button>
            <button
              className={styles.createBtn}
              disabled={!groupName.trim() || creating}
              onClick={handleCreate}
            >
              {creating ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> Create Group</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Selected chips */}
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
        placeholder="Add people…"
        autoFocus
      />

      <div className={styles.list}>
        {!query.trim() && selected.length === 0 ? (
          <div className={styles.empty}>
            <i className="fas fa-users" />
            <div>Search for people to add to your group</div>
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
          <button className={styles.nextBtn} onClick={() => setStep('name')}>
            Next <i className="fas fa-arrow-right" />
          </button>
        </div>
      )}
    </div>
  );
}

