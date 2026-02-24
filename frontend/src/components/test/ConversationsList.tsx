'use client';

import { useState, useRef, useEffect } from 'react';
import type { AvailableUser, PresenceInfo, PresenceStatus, ConversationSummary } from './types';
import FlipText from './FlipText';

const PRESENCE_COLOUR: Record<PresenceStatus, string> = {
  online:  '#10b981',
  away:    '#f97316',
  offline: '#64748b',
};


function formatLastSeen(date: Date | null): string {
  if (!date) return 'Offline';
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60)   return `Last seen ${diff}s ago`;
  if (diff < 300)  return `Last seen ${Math.floor(diff / 60)}m ago`;
  // 5 min – 24 h: show actual time
  if (diff < 86400) return `Last seen at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  // over 24 h: show date + time
  return `Last seen ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function formatTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

interface Props {
  isDark: boolean;
  availableUsers: AvailableUser[];
  selectedUserId: string;
  userPresence: Record<string, PresenceInfo>;
  conversations: Record<string, ConversationSummary>;
  currentUserId: string;
  onSelectUser: (id: string) => void;
}

export default function ConversationsList({ isDark, availableUsers, selectedUserId, userPresence, conversations, currentUserId, onSelectUser }: Props) {
  const [search, setSearch] = useState('');
  const [showPresence, setShowPresence] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flip between last message and presence info every 5 seconds
  useEffect(() => {
    const id = setInterval(() => setShowPresence(prev => !prev), 5000);
    return () => clearInterval(id);
  }, []);

  // Sort: 1) users with messages → by most recent message desc
  //       2) users without messages → alphabetical
  const sorted = [...availableUsers].sort((a, b) => {
    const ca = conversations[a.id];
    const cb = conversations[b.id];
    // Both have messages: most recent first
    if (ca && cb) return cb.lastMessageAt.getTime() - ca.lastMessageAt.getTime();
    // Only one has messages: that one goes first
    if (ca) return -1;
    if (cb) return 1;
    // Neither has messages: alphabetical
    return (a.displayName || a.username).localeCompare(b.displayName || b.username);
  });

  // Filter by search
  const q = search.trim().toLowerCase();
  const filtered = q
    ? sorted.filter(u => {
        const name = (u.displayName || u.username).toLowerCase();
        const uname = u.username.toLowerCase();
        return name.includes(q) || uname.includes(q);
      })
    : sorted;

  const totalUnread = Object.values(conversations).reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '0 16px', minHeight: '49px',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <i className="fas fa-inbox" style={{ color: '#3b82f6', fontSize: '14px' }} />
        <span style={{ fontWeight: '700', fontSize: '14px' }}>Conversations</span>
        <span style={{
          fontSize: '11px', padding: '1px 7px', borderRadius: '12px', fontWeight: '600',
          backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
          color: '#3b82f6',
        }}>{availableUsers.length}</span>
        {totalUnread > 0 && (
          <span style={{
            fontSize: '11px', padding: '1px 7px', borderRadius: '12px', fontWeight: '700',
            backgroundColor: '#ef4444', color: '#fff', marginLeft: 'auto',
          }}>{totalUnread > 99 ? '99+' : totalUnread}</span>
        )}
      </div>

      {/* Search */}
      <div style={{
        flexShrink: 0, padding: '10px 12px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 12px', borderRadius: '8px',
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}>
          <i className="fas fa-search" style={{ fontSize: '12px', opacity: 0.4, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: '13px', color: isDark ? '#f1f5f9' : '#0f172a',
            }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); inputRef.current?.focus(); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                color: isDark ? '#94a3b8' : '#64748b', fontSize: '12px', display: 'flex',
              }}
              aria-label="Clear search"
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4 }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontSize: '13px' }}>{q ? 'No results found' : 'No conversations yet'}</div>
          </div>
        ) : (
          filtered.map(user => {
            const isSelected = user.id === selectedUserId;
            const info: PresenceInfo = userPresence[user.id] ?? { status: 'offline', lastSeen: null };
            const dotColour = PRESENCE_COLOUR[info.status];
            const convo = conversations[user.id];
            const unread = convo?.unreadCount ?? 0;
            const displayName = user.displayName || user.username.replace(/^@/, '');
            const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('') || displayName.slice(0, 2).toUpperCase();

            // Subtitle: flip between last message and presence every 5s
            let subtitle = '';
            if (convo && !showPresence) {
              const prefix = convo.lastSenderId === currentUserId ? 'You: ' : '';
              subtitle = prefix + convo.lastMessage;
            } else {
              subtitle = info.status === 'online' ? 'Online'
                : info.status === 'away' ? 'Away'
                : formatLastSeen(info.lastSeen);
            }

            return (
              <button
                key={user.id}
                onClick={() => onSelectUser(user.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  backgroundColor: isSelected
                    ? (isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)')
                    : unread > 0
                    ? (isDark ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.04)')
                    : 'transparent',
                  borderLeft: isSelected ? '3px solid #3b82f6' : unread > 0 ? '3px solid #ef4444' : '3px solid transparent',
                  transition: 'background-color 0.15s',
                }}
              >
                {/* Avatar with gradient ring + presence dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '50px', height: '50px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f97316, #ef4444)',
                    padding: '3px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {user.profileImage ? (
                      <img src={user.profileImage} alt={displayName}
                        style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        backgroundColor: isDark ? '#334155' : 'rgba(59,130,246,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: '700', color: isDark ? '#f1f5f9' : '#3b82f6',
                      }}>{initials}</div>
                    )}
                  </div>
                  {/* Presence dot */}
                  <div style={{
                    position: 'absolute', bottom: '1px', right: '1px',
                    width: '13px', height: '13px', borderRadius: '50%',
                    backgroundColor: dotColour,
                    border: `2px solid ${isDark ? '#0f172a' : '#f8fafc'}`,
                    transition: 'background-color 0.3s',
                  }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                    <div style={{
                      fontWeight: unread > 0 ? '700' : '600', fontSize: '14px',
                      color: isDark ? '#f1f5f9' : '#0f172a',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {displayName}
                    </div>
                    {convo && (
                      <div style={{ fontSize: '11px', color: isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.7)', flexShrink: 0 }}>
                        {formatTime(convo.lastMessageAt)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <FlipText
                      value={subtitle}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: '12px',
                        color: unread > 0
                          ? (isDark ? '#f1f5f9' : '#0f172a')
                          : convo
                          ? (isDark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.8)')
                          : dotColour,
                        fontWeight: unread > 0 ? '500' : 'normal',
                      }}
                    />
                    {unread > 0 && (
                      <div style={{
                        flexShrink: 0, minWidth: '20px', height: '20px', borderRadius: '10px',
                        backgroundColor: '#ef4444', color: '#fff',
                        fontSize: '11px', fontWeight: '700',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 5px',
                      }}>{unread > 99 ? '99+' : unread}</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
