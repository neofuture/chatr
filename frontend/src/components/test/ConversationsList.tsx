'use client';

import type { AvailableUser, PresenceInfo, PresenceStatus, ConversationSummary } from './types';

const PRESENCE_COLOUR: Record<PresenceStatus, string> = {
  online:  '#10b981',
  away:    '#f97316',
  offline: '#64748b',
};

function formatLastSeen(date: Date | null): string {
  if (!date) return 'Last seen just now';
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60)  return 'Last seen just now';
  if (diff < 3600) return `Last seen ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Last seen ${Math.floor(diff / 3600)}h ago`;
  return `Last seen ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function formatTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
  // Sort: conversations with activity first (by lastMessageAt), then rest alphabetically
  const sorted = [...availableUsers].sort((a, b) => {
    const ca = conversations[a.id];
    const cb = conversations[b.id];
    if (ca && cb) return cb.lastMessageAt.getTime() - ca.lastMessageAt.getTime();
    if (ca) return -1;
    if (cb) return 1;
    return (a.displayName || a.username).localeCompare(b.displayName || b.username);
  });

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

      {/* Search placeholder */}
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
          <i className="fas fa-search" style={{ fontSize: '12px', opacity: 0.4 }} />
          <span style={{ fontSize: '13px', opacity: 0.4 }}>Search conversations…</span>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sorted.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4 }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontSize: '13px' }}>No conversations yet</div>
          </div>
        ) : (
          sorted.map(user => {
            const isSelected = user.id === selectedUserId;
            const info: PresenceInfo = userPresence[user.id] ?? { status: 'offline', lastSeen: null };
            const dotColour = PRESENCE_COLOUR[info.status];
            const convo = conversations[user.id];
            const unread = convo?.unreadCount ?? 0;
            const displayName = user.displayName || user.username.replace(/^@/, '');
            const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('') || displayName.slice(0, 2).toUpperCase();

            // Subtitle: last message or presence
            let subtitle = '';
            if (convo) {
              const prefix = convo.lastSenderId === currentUserId ? 'You: ' : '';
              subtitle = prefix + convo.lastMessage;
            } else {
              subtitle = info.status === 'online' ? 'online'
                : info.status === 'away' ? 'away'
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
                {/* Avatar with presence dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={displayName}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      backgroundColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', fontWeight: '700', color: '#3b82f6',
                    }}>{initials}</div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: '0px', right: '0px',
                    width: '12px', height: '12px', borderRadius: '50%',
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
                    <div style={{
                      fontSize: '12px',
                      color: unread > 0
                        ? (isDark ? '#f1f5f9' : '#0f172a')
                        : convo
                        ? (isDark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.8)')
                        : dotColour,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: unread > 0 ? '500' : 'normal',
                    }}>
                      {subtitle}
                    </div>
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
