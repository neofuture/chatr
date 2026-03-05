'use client';

import { useState, useEffect } from 'react';
import type { PresenceInfo } from '@/types/types';
import type { ConversationUser } from '@/hooks/useConversationList';
import PresenceLabel from '@/components/PresenceLabel/PresenceLabel';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import PaneSearchBox from '@/components/common/PaneSearchBox/PaneSearchBox';

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

type Tab = 'all' | 'chats' | 'requests' | 'search';

interface Props {
  isDark: boolean;
  conversations: ConversationUser[];
  selectedUserId: string;
  userPresence: Record<string, PresenceInfo>;
  currentUserId: string;
  onSelectUser: (id: string, userData?: { displayName: string | null; username: string; profileImage: string | null }) => void;
  search: string;
  onSearchChange: (val: string) => void;
  loading: boolean;
}

export default function ConversationsList({
  isDark,
  conversations,
  selectedUserId,
  userPresence,
  currentUserId,
  onSelectUser,
  search,
  onSearchChange,
  loading,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [showPresence, setShowPresence] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setShowPresence(prev => !prev), 5000);
    return () => clearInterval(id);
  }, []);

  const isSearching = search.trim().length > 0;

  const requests = conversations.filter(c =>
    c.conversationStatus === 'pending' && !c.isInitiator
  );

  const hasRequests = requests.length > 0;
  const requestCount = requests.reduce((sum, r) => sum + r.unreadCount, 0) || requests.length;

  // "Chats" = everything except incoming requests
  const chats = conversations.filter(c => {
    if (!c.conversationStatus) return true;
    if (c.conversationStatus === 'accepted') return true;
    if (c.conversationStatus === 'pending' && c.isInitiator) return true;
    return false;
  });

  const chatsUnreadCount = chats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  const effectiveTab = isSearching ? 'search' : (!hasRequests ? 'all' : activeTab);
  const displayList = isSearching
    ? conversations
    : effectiveTab === 'requests'
      ? requests
      : effectiveTab === 'chats'
        ? chats
        : conversations;

  const tabStyle = (tab: Tab, active: boolean) => ({
    flex: 1,
    padding: '8px 0',
    border: 'none',
    borderBottom: active ? '2px solid var(--color-blue-500, #3b82f6)' : '2px solid transparent',
    backgroundColor: 'transparent',
    color: active
      ? (isDark ? '#f1f5f9' : '#0f172a')
      : (isDark ? '#64748b' : '#94a3b8'),
    fontWeight: active ? '600' : '400',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: '6px',
  });

  // ── Conversations view ─────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Search */}
      <PaneSearchBox
        value={search}
        onChange={onSearchChange}
        placeholder="Search messages..."
      />

      {/* Tabs — only shown when searching or when there are message requests */}
      {(isSearching || hasRequests) && (
        <div style={{ display: 'flex', borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
          {isSearching ? (
            <button style={tabStyle('search', true)}>
              <i className="fas fa-search" style={{ fontSize: '11px' }} />
              Search
              {displayList.length > 0 && (
                <span style={{ fontSize: '11px', opacity: 0.6, fontWeight: '400' }}>
                  ({displayList.length})
                </span>
              )}
            </button>
          ) : (
            <>
              <button style={tabStyle('all', activeTab === 'all')} onClick={() => setActiveTab('all')}>
                All
              </button>
              <button style={tabStyle('chats', activeTab === 'chats')} onClick={() => setActiveTab('chats')}>
                Chats
                {chatsUnreadCount > 0 && (
                  <span style={{
                    minWidth: '18px', height: '18px', borderRadius: '9px',
                    backgroundColor: '#ef4444', color: '#fff',
                    fontSize: '10px', fontWeight: '700',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px',
                  }}>
                    {chatsUnreadCount > 99 ? '99+' : chatsUnreadCount}
                  </span>
                )}
              </button>
              <button style={tabStyle('requests', activeTab === 'requests')} onClick={() => setActiveTab('requests')}>
                Requests
                {requests.length > 0 && (
                  <span style={{
                    minWidth: '18px', height: '18px', borderRadius: '9px',
                    backgroundColor: '#ef4444', color: '#fff',
                    fontSize: '10px', fontWeight: '700',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px',
                  }}>
                    {requestCount > 99 ? '99+' : requestCount}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4 }}>
            <div style={{ fontSize: '13px' }}>Loading...</div>
          </div>
        ) : displayList.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4 }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>
              {isSearching ? '🔍' : effectiveTab === 'requests' ? '📩' : '💬'}
            </div>
            <div style={{ fontSize: '13px' }}>
              {isSearching
                ? 'No matching conversations'
                : effectiveTab === 'requests'
                  ? 'No message requests'
                  : 'No conversations yet'}
            </div>
          </div>
        ) : (
          displayList.map(user => {
            const isSelected = user.id === selectedUserId;
            const unread = user.unreadCount ?? 0;
            const displayName = user.displayName || user.username.replace(/^@/, '');
            const lastMsg = user.lastMessage;
            const lastMsgTime = user.lastMessageAt ? new Date(user.lastMessageAt) : null;
            const isPending = user.conversationStatus === 'pending';
            const isIncomingRequest = isPending && !user.isInitiator;
            const isOutgoingPending = isPending && user.isInitiator;
            // Hide presence from sender until message request is accepted
            const info: PresenceInfo = isOutgoingPending
              ? { status: 'offline', lastSeen: null, hidden: true }
              : (userPresence[user.id] ?? { status: 'offline', lastSeen: null });
            const isHidden = !!info.hidden;
            const canFlip = !!lastMsg && !isHidden;

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
                <PresenceAvatar
                  displayName={displayName}
                  profileImage={user.profileImage}
                  info={info}
                  size={50}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                    <div style={{
                      fontWeight: unread > 0 ? '700' : '600', fontSize: '14px',
                      color: isDark ? '#f1f5f9' : '#0f172a',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}>
                      {displayName}
                      {user.isBlocked ? (
                        <span style={{
                          fontSize: '9px', fontWeight: '600',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: '4px',
                          padding: '1px 4px',
                          lineHeight: '1.2',
                          flexShrink: 0,
                        }}>
                          Blocked
                        </span>
                      ) : user.isFriend ? (
                        <span style={{
                          fontSize: '9px', fontWeight: '600',
                          color: '#22c55e',
                          border: '1px solid #22c55e',
                          borderRadius: '4px',
                          padding: '1px 4px',
                          lineHeight: '1.2',
                          flexShrink: 0,
                        }}>
                          Friend
                        </span>
                      ) : null}
                      {isIncomingRequest && (
                        <i className="fas fa-inbox" title="Message request" style={{
                          fontSize: '10px',
                          color: '#f59e0b',
                          flexShrink: 0,
                        }} />
                      )}
                      {isOutgoingPending && (
                        <span style={{
                          fontSize: '9px', fontWeight: '600',
                          color: isDark ? '#94a3b8' : '#64748b',
                          border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                          borderRadius: '4px',
                          padding: '1px 4px',
                          lineHeight: '1.2',
                          flexShrink: 0,
                        }}>
                          Pending
                        </span>
                      )}
                    </div>
                    {lastMsgTime && (
                      <div style={{ fontSize: '11px', color: isDark ? '#f1f5f9' : '#0f172a', flexShrink: 0 }}>
                        {formatTime(lastMsgTime)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <div style={{ flex: 1, minWidth: 0, position: 'relative', height: '16px', overflow: 'hidden' }}>
                      <div style={{
                        position: 'absolute', inset: 0,
                        fontSize: '12px',
                        color: isDark ? '#94a3b8' : '#64748b',
                        fontWeight: unread > 0 ? '500' : 'normal',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        opacity: (canFlip && showPresence) ? 0 : 1,
                        transition: 'opacity 0.4s ease',
                        pointerEvents: 'none',
                      }}>
                        {lastMsg
                          ? `${lastMsg.senderId === currentUserId ? 'You: ' : ''}${lastMsg.content}`
                          : ''}
                      </div>
                      {!isHidden && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          fontSize: '12px',
                          color: isDark ? '#94a3b8' : '#64748b',
                          opacity: (!lastMsg || showPresence) ? 1 : 0,
                          transition: 'opacity 0.4s ease',
                          pointerEvents: 'none',
                          display: 'flex', alignItems: 'center',
                        }}>
                          <PresenceLabel info={info} showDot={false} />
                        </div>
                      )}
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
