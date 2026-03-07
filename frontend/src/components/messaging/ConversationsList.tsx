'use client';

import { useState, useEffect } from 'react';
import type { PresenceInfo } from '@/types/types';
import type { ConversationUser } from '@/hooks/useConversationList';
import type { GroupSummary, GroupInvite } from '@/hooks/useGroupsList';
import PresenceLabel from '@/components/PresenceLabel/PresenceLabel';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import PaneSearchBox from '@/components/common/PaneSearchBox/PaneSearchBox';
import { useOpenUserProfile } from '@/hooks/useOpenUserProfile';

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

type Tab = 'all' | 'chats' | 'groups' | 'requests' | 'search';

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
  groups: GroupSummary[];
  groupsLoading: boolean;
  selectedGroupId: string;
  onSelectGroup: (group: GroupSummary) => void;
  groupInvites?: GroupInvite[];
  onAcceptGroupInvite?: (groupId: string) => void;
  onDeclineGroupInvite?: (groupId: string) => void;
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
  groups,
  groupsLoading,
  selectedGroupId,
  onSelectGroup,
  groupInvites = [],
  onAcceptGroupInvite,
  onDeclineGroupInvite,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [showPresence, setShowPresence] = useState(false);
  const openUserProfile = useOpenUserProfile();

  useEffect(() => {
    const id = setInterval(() => setShowPresence(prev => !prev), 5000);
    return () => clearInterval(id);
  }, []);

  const isSearching = search.trim().length > 0;

  const requests = conversations.filter(c =>
    c.conversationStatus === 'pending' && !c.isInitiator
  );

  const hasRequests = requests.length > 0;
  const requestUnreadCount = requests.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0);
  const groupsUnreadCount  = (groups ?? []).reduce((sum, g) => sum + (g.unreadCount ?? 0), 0);
  const groupInviteCount = groupInvites.length;

  // "Chats" = everything except incoming requests
  const chats = conversations.filter(c => {
    if (!c.conversationStatus) return true;
    if (c.conversationStatus === 'accepted') return true;
    if (c.conversationStatus === 'pending' && c.isInitiator) return true;
    return false;
  });

  const chatsUnreadCount = chats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  const effectiveTab = isSearching ? 'search' : activeTab;
  const displayList = isSearching
    ? conversations
    : effectiveTab === 'requests'
      ? requests
      : chats;

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

      {/* Tabs */}
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
            <button style={tabStyle('groups', activeTab === 'groups')} onClick={() => setActiveTab('groups')}>
              Groups
              {(groupsUnreadCount + groupInviteCount) > 0 && (
                <span style={{
                  minWidth: '18px', height: '18px', borderRadius: '9px',
                  backgroundColor: groupInviteCount > 0 ? '#f59e0b' : '#ef4444', color: '#fff',
                  fontSize: '10px', fontWeight: '700',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {(groupsUnreadCount + groupInviteCount) > 99 ? '99+' : (groupsUnreadCount + groupInviteCount)}
                </span>
              )}
            </button>
            {hasRequests && (
              <button style={tabStyle('requests', activeTab === 'requests')} onClick={() => setActiveTab('requests')}>
                Requests
                {requestUnreadCount > 0 && (
                  <span style={{
                    minWidth: '18px', height: '18px', borderRadius: '9px',
                    backgroundColor: '#ef4444', color: '#fff',
                    fontSize: '10px', fontWeight: '700',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px',
                  }}>
                    {requestUnreadCount > 99 ? '99+' : requestUnreadCount}
                  </span>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Groups tab */}
      {!isSearching && activeTab === 'groups' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Group Invites */}
          {groupInvites.length > 0 && (
            <div style={{ padding: '8px 12px 0' }}>
              <div style={{
                fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em',
                color: '#f59e0b', textTransform: 'uppercase', marginBottom: '6px',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <i className="fas fa-envelope" style={{ fontSize: '10px' }} />
                Group Invites ({groupInvites.length})
              </div>
              {groupInvites.map(invite => (
                <div key={invite.groupId} style={{
                  background: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
                  border: `1px solid ${isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.2)'}`,
                  borderRadius: '10px', padding: '10px 12px', marginBottom: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--color-orange-500), var(--color-red-500))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', color: '#fff',
                    }}>
                      <i className="fas fa-users" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '600', fontSize: '13px',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {invite.groupName}
                      </div>
                      <div style={{ fontSize: '11px', color: isDark ? '#94a3b8' : '#64748b' }}>
                        Invited by {invite.invitedBy} · {invite.memberCount} member{invite.memberCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onAcceptGroupInvite?.(invite.groupId)}
                      style={{
                        flex: 1, padding: '6px 0', border: 'none', borderRadius: '7px', cursor: 'pointer',
                        background: '#22c55e', color: '#fff', fontSize: '12px', fontWeight: '600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      }}
                    >
                      <i className="fas fa-check" style={{ fontSize: '11px' }} /> Accept
                    </button>
                    <button
                      onClick={() => onDeclineGroupInvite?.(invite.groupId)}
                      style={{
                        flex: 1, padding: '6px 0', cursor: 'pointer',
                        background: 'transparent',
                        border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                        borderRadius: '7px',
                        color: isDark ? '#94a3b8' : '#64748b', fontSize: '12px', fontWeight: '600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      }}
                    >
                      <i className="fas fa-xmark" style={{ fontSize: '11px' }} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Group button */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('chatr:new-group'))}
            style={{
              margin: '12px 12px 4px',
              padding: '12px 16px',
              border: `1px dashed ${isDark ? 'rgba(249,115,22,0.5)' : 'rgba(249,115,22,0.4)'}`,
              borderRadius: '12px',
              background: isDark ? 'rgba(249,115,22,0.06)' : 'rgba(249,115,22,0.04)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--color-orange-500)',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            <i className="fas fa-users-plus" style={{ fontSize: '16px' }} />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Create New Group</span>
          </button>

          {/* Groups list */}
          {groupsLoading ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4 }}>
              <div style={{ fontSize: '13px' }}>Loading...</div>
            </div>
          ) : groups.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>👥</div>
                <div style={{ fontSize: '13px' }}>No group conversations yet</div>
              </div>
            </div>
          ) : (
            groups.map(group => {
              const isSelected = group.id === selectedGroupId;
              const unread = group.unreadCount ?? 0;
              const lastMsg = group.lastMessage;
              const lastMsgTime = lastMsg ? new Date(lastMsg.createdAt) : null;
              const memberCount = group.members.length;

              return (
                <button
                  key={group.id}
                  onClick={() => onSelectGroup(group)}
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
                  {/* Group avatar */}
                  <div style={{
                    width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--color-orange-500), var(--color-red-500))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', color: '#fff',
                  }}>
                    <i className="fas fa-users" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                      <div style={{
                        fontWeight: unread > 0 ? '700' : '600', fontSize: '14px',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {group.name}
                      </div>
                      {lastMsgTime && (
                        <div style={{ fontSize: '11px', color: isDark ? '#f1f5f9' : '#0f172a', flexShrink: 0 }}>
                          {formatTime(lastMsgTime)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <div style={{
                        flex: 1, minWidth: 0, fontSize: '12px',
                        color: isDark ? '#94a3b8' : '#64748b',
                        fontWeight: unread > 0 ? '500' : 'normal',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {lastMsg
                          ? `${lastMsg.sender.displayName || lastMsg.sender.username.replace(/^@/, '')}: ${lastMsg.content}`
                          : `${memberCount} member${memberCount !== 1 ? 's' : ''}`}
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
      )}

      {/* List — hidden when on groups tab */}
      {(isSearching || activeTab !== 'groups') && (
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
            // Bot conversations are never pending from the user's perspective
            const isIncomingRequest = isPending && !user.isInitiator && !user.isBot;
            const isOutgoingPending = isPending && user.isInitiator && !user.isBot;
            // Hide presence from sender until message request is accepted; bots are always shown
            const info: PresenceInfo = (isOutgoingPending && !user.isBot)
              ? { status: 'offline', lastSeen: null, hidden: true }
              : (userPresence[user.id] ?? { status: 'offline', lastSeen: null });
            const isHidden = !!info.hidden;
            const canFlip = !!lastMsg && !isHidden && !user.isBot;

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
                  borderLeft: isSelected
                    ? '3px solid #3b82f6'
                    : unread > 0
                    ? '3px solid #ef4444'
                    : user.isBot
                    ? '3px solid #0891b2'
                    : '3px solid transparent',
                  transition: 'background-color 0.15s',
                }}
              >
                <PresenceAvatar
                  displayName={displayName}
                  profileImage={user.profileImage}
                  info={user.isBot ? { status: 'online', lastSeen: null } : info}
                  size={50}
                  isBot={user.isBot}
                  showDot={!user.isBot}
                  onClick={(e) => { e.stopPropagation(); if (!user.isBot) openUserProfile(user.id, displayName, user.profileImage); }}
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
                      {user.isBot ? (
                        <span style={{
                          fontSize: '9px', fontWeight: '700',
                          color: '#0891b2',
                          border: '1px solid #0891b2',
                          borderRadius: '4px',
                          padding: '1px 4px',
                          lineHeight: '1.2',
                          flexShrink: 0,
                        }}>
                          AI
                        </span>
                      ) : user.blockedByMe ? (
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
                        color: user.isBot ? (isDark ? '#22d3ee' : '#0891b2') : (isDark ? '#94a3b8' : '#64748b'),
                        fontWeight: unread > 0 ? '500' : 'normal',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        opacity: (canFlip && showPresence) ? 0 : 1,
                        transition: 'opacity 0.4s ease',
                        pointerEvents: 'none',
                      }}>
                        {lastMsg
                          ? `${lastMsg.senderId === currentUserId ? 'You: ' : ''}${lastMsg.content}`
                          : user.isBot
                          ? 'Your AI assistant Luna — say hello! 👋'
                          : ''}
                      </div>
                      {!isHidden && !user.isBot && (
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
      )}
    </div>
  );
}
