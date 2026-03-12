'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGroupsList, type GroupSummary } from '@/hooks/useGroupsList';
import { useTheme } from '@/contexts/ThemeContext';
import { usePanels, type ActionIcon } from '@/contexts/PanelContext';
import { useToast } from '@/contexts/ToastContext';
import { useOpenUserProfile } from '@/hooks/useOpenUserProfile';
import GroupView from '@/components/messaging/GroupView/GroupView';
import type { GroupData } from '@/components/messaging/GroupView/GroupView';
import GroupProfilePanel from '@/components/GroupProfilePanel/GroupProfilePanel';
import NewGroupPanel from '@/components/messaging/NewGroupPanel/NewGroupPanel';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import PaneSearchBox from '@/components/common/PaneSearchBox/PaneSearchBox';
import styles from './groups.module.css';

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

function previewContent(raw: string): string {
  const stripped = raw.replace(/```/g, '').trim();
  return stripped || 'Code block';
}


export default function GroupsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { showToast } = useToast();
  const { openPanel, closePanel } = usePanels();
  const openUserProfile = useOpenUserProfile();
  const {
    groups,
    invites: groupInvites,
    loading,
    syncing,
    refresh: refreshGroups,
    clearUnread: clearGroupUnread,
    acceptInvite: acceptGroupInvite,
    declineInvite: declineGroupInvite,
  } = useGroupsList();
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [search, setSearch] = useState('');
  const [flipPhase, setFlipPhase] = useState<0 | 1>(0); // 0=message, 1=AI summary
  const prevFlipRef = useRef(0);

  // Syncing banner state
  const [showSyncBanner, setShowSyncBanner] = useState(false);
  const [syncExiting, setSyncExiting] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (syncing) {
      clearTimeout(syncTimerRef.current);
      setSyncExiting(false);
      setShowSyncBanner(true);
    } else if (showSyncBanner) {
      setSyncExiting(true);
      syncTimerRef.current = setTimeout(() => {
        setShowSyncBanner(false);
        setSyncExiting(false);
      }, 250);
    }
    return () => clearTimeout(syncTimerRef.current);
  }, [syncing]);

  useEffect(() => {
    const t = setTimeout(() => { prevFlipRef.current = flipPhase; }, 550);
    return () => clearTimeout(t);
  }, [flipPhase]);

  useEffect(() => {
    const durations = [4000, 6000];
    let phase = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      phase = (phase + 1) % 2;
      setFlipPhase(phase as 0 | 1);
      timer = setTimeout(tick, durations[phase]);
    };
    timer = setTimeout(tick, durations[0]);
    return () => clearTimeout(timer);
  }, []);

  const currentUserId = typeof window !== 'undefined'
    ? (() => { try { const t = localStorage.getItem('token'); if (!t) return ''; const p = JSON.parse(atob(t.split('.')[1])); return p.userId || ''; } catch { return ''; } })()
    : '';

  const buildGroupActionIcons = useCallback((groupId: string, memberCount: number): ActionIcon[] => {
    return [{
      icon: 'fas fa-users',
      label: `Members (${memberCount})`,
      onClick: () => {
        window.dispatchEvent(new CustomEvent('chatr:group-members-toggle', { detail: { groupId, open: true } }));
      },
    }];
  }, []);

  const openGroupPanel = useCallback((group: GroupData | GroupSummary) => {
    const panelId = `group-${group.id}`;
    const memberCount = group.members.length;
    openPanel(
      panelId,
      <GroupView
        group={group as GroupData}
        isDark={isDark}
        currentUserId={currentUserId}
        onGroupDeleted={() => { closePanel(panelId); refreshGroups(); }}
      />,
      group.name,
      'left',
      `${memberCount} member${memberCount !== 1 ? 's' : ''}`,
      group.profileImage ?? undefined,
      true,
      buildGroupActionIcons(group.id, memberCount),
    );
  }, [openPanel, closePanel, isDark, currentUserId, refreshGroups, buildGroupActionIcons]);

  const handleSelectGroup = useCallback((group: GroupSummary) => {
    setSelectedGroupId(group.id);
    clearGroupUnread(group.id);
    openGroupPanel(group);
  }, [openGroupPanel, clearGroupUnread]);

  const handleAcceptGroupInvite = useCallback(async (groupId: string) => {
    const group = await acceptGroupInvite(groupId);
    if (group) {
      showToast(`You joined "${group.name}"`, 'success');
      openGroupPanel(group as GroupData);
    }
  }, [acceptGroupInvite, showToast, openGroupPanel]);

  const handleDeclineGroupInvite = useCallback(async (groupId: string) => {
    await declineGroupInvite(groupId);
    showToast('Group invite declined', 'info');
  }, [declineGroupInvite, showToast]);

  const openNewGroupPanel = useCallback(() => {
    openPanel(
      'new-group',
      <NewGroupPanel
        onGroupCreated={(group) => {
          closePanel('new-group');
          refreshGroups();
          openGroupPanel(group as GroupData);
        }}
      />,
      'New Group',
      'center',
      undefined,
      undefined,
      true,
    );
  }, [openPanel, closePanel, refreshGroups, openGroupPanel]);

  const openGroupProfilePanel = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    openPanel(
      `group-profile-${groupId}`,
      <GroupProfilePanel
        groupId={groupId}
        currentUserId={currentUserId}
        initialGroup={group ? { id: group.id, name: group.name, description: group.description, profileImage: group.profileImage, coverImage: group.coverImage, ownerId: group.ownerId, members: group.members as any } : undefined}
        onGroupLeft={() => {
          closePanel(`group-profile-${groupId}`);
          closePanel(`group-${groupId}`);
          refreshGroups();
        }}
      />,
      group?.name ?? 'Group Info',
      'left',
      undefined,
      group?.profileImage ?? undefined,
      true,
    );
  }, [openPanel, closePanel, groups, currentUserId, refreshGroups]);

  useEffect(() => {
    const handler = () => openNewGroupPanel();
    window.addEventListener('chatr:new-group', handler);
    return () => window.removeEventListener('chatr:new-group', handler);
  }, [openNewGroupPanel]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { groupId } = (e as CustomEvent).detail;
      if (groupId) openGroupProfilePanel(groupId);
    };
    window.addEventListener('chatr:group-profile-open', handler);
    return () => window.removeEventListener('chatr:group-profile-open', handler);
  }, [openGroupProfilePanel]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { userId, title, profileImage } = (e as CustomEvent).detail;
      if (userId) openUserProfile(userId, title, profileImage);
    };
    window.addEventListener('chatr:user-profile-open', handler);
    return () => window.removeEventListener('chatr:user-profile-open', handler);
  }, [openUserProfile]);

  const q = search.trim().toLowerCase();
  const filteredGroups = q
    ? groups.filter(g => g.name.toLowerCase().includes(q))
    : groups;

  if (!currentUserId) return null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PaneSearchBox value={search} onChange={setSearch} placeholder="Search groups..." />

      {showSyncBanner && (
        <div className={`${styles.syncBanner} ${syncExiting ? styles.syncBannerHide : ''}`}>
          <div className={styles.syncSpinner} />
          Syncing…
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Group invites */}
        {!q && groupInvites.length > 0 && (
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
                  <PresenceAvatar
                    displayName={invite.groupName}
                    profileImage={null}
                    info={{ status: 'offline', lastSeen: null }}
                    size={36}
                    showDot={false}
                    isGroup
                  />
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
                  <button onClick={() => handleAcceptGroupInvite(invite.groupId)} style={{
                    flex: 1, padding: '6px 0', border: 'none', borderRadius: '7px', cursor: 'pointer',
                    background: '#22c55e', color: '#fff', fontSize: '12px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    fontFamily: 'inherit',
                  }}>
                    <i className="fas fa-check" style={{ fontSize: '11px' }} /> Accept
                  </button>
                  <button onClick={() => handleDeclineGroupInvite(invite.groupId)} style={{
                    flex: 1, padding: '6px 0', cursor: 'pointer',
                    background: 'transparent',
                    border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                    borderRadius: '7px',
                    color: isDark ? '#94a3b8' : '#64748b', fontSize: '12px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                    fontFamily: 'inherit',
                  }}>
                    <i className="fas fa-xmark" style={{ fontSize: '11px' }} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Groups list */}
        {loading ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.4 }}>
            <div style={{ fontSize: '13px' }}>Loading...</div>
          </div>
        ) : filteredGroups.length === 0 && groupInvites.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', opacity: 0.5 }}>
            <i className="fad fa-users" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>
              {q ? 'No matching groups' : 'No groups yet'}
            </div>
            {!q && (
              <div style={{ fontSize: '13px', opacity: 0.7 }}>
                Create a group to chat with multiple people
              </div>
            )}
          </div>
        ) : (
          filteredGroups.map(group => {
            const unread = group.unreadCount ?? 0;
            const lastMsg = group.lastMessage;
            const lastMsgTime = lastMsg ? new Date(lastMsg.createdAt) : null;
            const memberCount = group.members.length;
            return (
              <button key={group.id} onClick={() => handleSelectGroup(group)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                backgroundColor: unread > 0
                  ? (isDark ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.04)')
                  : 'transparent',
                borderLeft: unread > 0 ? '3px solid #ef4444' : '3px solid transparent',
                transition: 'background-color 0.15s',
                fontFamily: 'inherit',
              }}>
                <PresenceAvatar
                  displayName={group.name}
                  profileImage={group.profileImage ?? null}
                  info={{ status: 'offline', lastSeen: null }}
                  size={50}
                  showDot={false}
                  isGroup
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('chatr:group-profile-open', { detail: { groupId: group.id } }));
                  }}
                />
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
                    {(() => {
                      const gHas = !!group.summary;
                      const gE = gHas ? flipPhase : 0;
                      const gP = gHas ? prevFlipRef.current : 0;
                      const gChanged = gE !== gP;
                      const gb: React.CSSProperties = { position: 'absolute', left: 0, right: 0, pointerEvents: 'none' };
                      const gMsgText = lastMsg
                        ? `${lastMsg.sender.displayName || lastMsg.sender.username.replace(/^@/, '')}: ${previewContent(lastMsg.content)}`
                        : `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
                      const gc = (s: number) => s === gE && gChanged ? styles.flipIn : s === gP && gChanged ? styles.flipOut : '';
                      const gv = (s: number): React.CSSProperties => s === gE && !gChanged ? { transform: 'translateY(0)', opacity: 1 } : { transform: 'translateY(100%)', opacity: 0 };

                      return (
                        <div style={{ flex: 1, minWidth: 0, position: 'relative', height: '16px', overflow: 'hidden' }}>
                          <div className={gc(0)} style={{ ...gb, ...gv(0), fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', fontWeight: unread > 0 ? '500' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '16px' }}>
                            {gMsgText}
                          </div>
                          {gHas && (
                            <div className={gc(1)} style={{ ...gb, ...gv(1), fontSize: '11px', color: isDark ? '#a78bfa' : '#7c3aed', display: 'flex', alignItems: 'flex-start', gap: '4px', lineHeight: '1.3' }}>
                              <i className={`fas fa-sparkles ${styles.sparkleIcon}`} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{group.summary}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '9px', fontWeight: '600', color: isDark ? '#94a3b8' : '#64748b', border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, borderRadius: '4px', padding: '1px 4px', lineHeight: '1.2' }}>
                        {memberCount} member{memberCount !== 1 ? 's' : ''}
                      </span>
                      {unread > 0 && (
                        <div style={{
                          minWidth: '20px', height: '20px', borderRadius: '10px',
                          backgroundColor: '#ef4444', color: '#fff',
                          fontSize: '11px', fontWeight: '700',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                        }}>{unread > 99 ? '99+' : unread}</div>
                      )}
                    </div>
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
