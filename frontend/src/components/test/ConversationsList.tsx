'use client';

import type { AvailableUser, PresenceInfo, PresenceStatus } from './types';

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

interface Props {
  isDark: boolean;
  availableUsers: AvailableUser[];
  selectedUserId: string;
  userPresence: Record<string, PresenceInfo>;
  onSelectUser: (id: string) => void;
}

export default function ConversationsList({ isDark, availableUsers, selectedUserId, userPresence, onSelectUser }: Props) {
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
      </div>

      {/* Search (placeholder for future) */}
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
        {availableUsers.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4 }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
            <div style={{ fontSize: '13px' }}>No conversations yet</div>
          </div>
        ) : (
          availableUsers.map(user => {
            const isSelected = user.id === selectedUserId;
            const info: PresenceInfo = userPresence[user.id] ?? { status: 'offline', lastSeen: null };
            const dotColour = PRESENCE_COLOUR[info.status];
            const subtitle = info.status === 'online'
              ? 'online'
              : info.status === 'away'
              ? 'away'
              : formatLastSeen(info.lastSeen);
            return (
              <button
                key={user.id}
                onClick={() => onSelectUser(user.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  backgroundColor: isSelected
                    ? (isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)')
                    : 'transparent',
                  borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                  transition: 'background-color 0.15s',
                }}
              >
                {/* Avatar with presence dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    backgroundColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: '700', color: '#3b82f6',
                  }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  {/* Presence dot */}
                  <div style={{
                    position: 'absolute', bottom: '0px', right: '0px',
                    width: '14px', height: '14px', borderRadius: '50%',
                    backgroundColor: dotColour,
                    border: `2px solid ${isDark ? '#0f172a' : '#f8fafc'}`,
                    transition: 'background-color 0.3s',
                  }} title={info.status} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: '600', fontSize: '14px',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {user.username}
                  </div>
                  <div style={{
                    fontSize: '12px', marginTop: '2px',
                    color: info.status !== 'offline' ? dotColour : (isDark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.8)'),
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {subtitle}
                  </div>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
