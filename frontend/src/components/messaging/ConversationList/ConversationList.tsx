'use client';

import React, { useCallback } from 'react';
import { useConversationList, ConversationUser } from '@/hooks/useConversationList';
import styles from './ConversationList.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(user: ConversationUser): string {
  const f = user.firstName?.[0] ?? '';
  const l = user.lastName?.[0] ?? '';
  if (f && l) return `${f}${l}`.toUpperCase();
  return (user.displayName ?? user.username).slice(0, 2).toUpperCase();
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function messagePreview(msg: ConversationUser['lastMessage'], isSelf: boolean): string {
  if (!msg) return 'No messages yet';
  const prefix = isSelf ? 'You: ' : '';
  switch (msg.type) {
    case 'image':   return `${prefix}📷 Photo`;
    case 'audio':   return `${prefix}🎵 Voice message`;
    case 'file': {
      if (msg.fileType?.startsWith('audio')) return `${prefix}🎵 Audio`;
      if (msg.fileType?.startsWith('image')) return `${prefix}📷 Photo`;
      return `${prefix}📎 File`;
    }
    default: return `${prefix}${msg.content}`;
  }
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface RowProps {
  user: ConversationUser;
  currentUserId: string;
  onClick: (user: ConversationUser) => void;
}

function ConversationRow({ user, currentUserId, onClick }: RowProps) {
  const isSelf = user.lastMessage?.senderId === currentUserId;

  return (
    <div
      className={styles.row}
      role="button"
      tabIndex={0}
      onClick={() => onClick(user)}
      onKeyDown={e => e.key === 'Enter' && onClick(user)}
      aria-label={`Open conversation with ${user.displayName ?? user.username}`}
    >
      {/* Avatar */}
      <div className={styles.avatarWrap}>
        {user.profileImage ? (
          <img
            src={user.profileImage}
            alt={user.displayName ?? user.username}
            className={styles.avatar}
          />
        ) : (
          <div className={styles.avatarInitials} aria-hidden>
            {initials(user)}
          </div>
        )}
        {user.isOnline && <span className={styles.onlineDot} aria-label="Online" />}
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.topRow}>
          <span className={styles.name}>
            {user.displayName ?? user.username}
          </span>
          {user.lastMessageAt && (
            <span className={styles.time}>{formatTime(user.lastMessageAt)}</span>
          )}
        </div>
        <div className={styles.bottomRow}>
          <span className={`${styles.preview} ${user.unreadCount > 0 ? styles.previewUnread : ''}`}>
            {messagePreview(user.lastMessage, isSelf)}
          </span>
          {user.unreadCount > 0 && (
            <span className={styles.badge} aria-label={`${user.unreadCount} unread`}>
              {user.unreadCount > 99 ? '99+' : user.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ConversationListProps {
  currentUserId: string;
  onSelectUser: (user: ConversationUser) => void;
}

export default function ConversationList({ currentUserId, onSelectUser }: ConversationListProps) {
  const {
    conversations,
    loading,
    search,
    setSearch,
    searching,
  } = useConversationList();

  const handleSelect = useCallback((user: ConversationUser) => {
    onSelectUser(user);
  }, [onSelectUser]);

  // Split into online / with messages / the rest only when not searching
  const isSearching = search.trim().length > 0;

  let content: React.ReactNode;

  if (loading) {
    content = (
      <div className={styles.spinner} role="status" aria-label="Loading conversations">
        <i className="fad fa-spinner-third fa-spin" style={{ fontSize: 28 }} />
      </div>
    );
  } else if (conversations.length === 0) {
    content = (
      <div className={styles.empty}>
        <i className={`fad fa-comments ${styles.emptyIcon}`} />
        <p className={styles.emptyText}>
          {isSearching ? 'No users found' : 'No conversations yet'}
        </p>
      </div>
    );
  } else if (isSearching) {
    content = (
      <div className={styles.list}>
        {searching && (
          <div className={styles.sectionHeader}>Searching…</div>
        )}
        {conversations.map(u => (
          <ConversationRow
            key={u.id}
            user={u}
            currentUserId={currentUserId}
            onClick={handleSelect}
          />
        ))}
      </div>
    );
  } else {
    // Grouped: online with messages → online no messages → offline with messages → offline no messages
    const onlineWithMsg   = conversations.filter(c => c.isOnline  && c.lastMessageAt);
    const onlineNoMsg     = conversations.filter(c => c.isOnline  && !c.lastMessageAt);
    const offlineWithMsg  = conversations.filter(c => !c.isOnline && c.lastMessageAt);
    const offlineNoMsg    = conversations.filter(c => !c.isOnline && !c.lastMessageAt);

    const renderGroup = (label: string, users: ConversationUser[]) =>
      users.length > 0 && (
        <React.Fragment key={label}>
          <div className={styles.sectionHeader}>{label}</div>
          {users.map(u => (
            <ConversationRow
              key={u.id}
              user={u}
              currentUserId={currentUserId}
              onClick={handleSelect}
            />
          ))}
        </React.Fragment>
      );

    content = (
      <div className={styles.list}>
        {renderGroup('Online', [...onlineWithMsg, ...onlineNoMsg])}
        {renderGroup('Recent', offlineWithMsg)}
        {renderGroup('All Users', offlineNoMsg)}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Search */}
      <div className={styles.searchBar}>
        <div className={styles.searchWrap}>
          <i className={`far fa-search ${styles.searchIcon}`} aria-hidden />
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search conversations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search conversations"
          />
          {search && (
            <button
              className={styles.clearBtn}
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <i className="far fa-times" />
            </button>
          )}
        </div>
      </div>

      {content}
    </div>
  );
}

