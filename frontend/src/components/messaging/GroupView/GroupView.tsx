'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import type { Message } from '@/components/MessageBubble';
import ChatView from '@/components/messaging/ChatView/ChatView';
import MessageInput from '@/components/messaging/MessageInput/MessageInput';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import Lightbox from '@/components/Lightbox/Lightbox';
import PaneSearchBox from '@/components/common/PaneSearchBox/PaneSearchBox';
import styles from './GroupView.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface GroupMember {
  id: string;
  userId: string;
  role: string; // 'member' | 'admin'
  user: { id: string; username: string; displayName: string | null; profileImage: string | null };
}

export interface GroupData {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  members: GroupMember[];
}

interface Props {
  group: GroupData;
  isDark: boolean;
  currentUserId: string;
  onGroupDeleted?: () => void;
  /** Passed when the panel is opened from an invite notification before the user has accepted */
  initialMemberStatus?: 'pending' | 'accepted';
}

export default function GroupView({ group: initialGroup, isDark, currentUserId, onGroupDeleted, initialMemberStatus }: Props) {
  const { socket } = useWebSocket();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const [group, setGroup] = useState<GroupData>(initialGroup);
  // Track whether the current user has accepted this group
  const [memberStatus, setMemberStatus] = useState<'pending' | 'accepted'>(
    initialMemberStatus ?? (initialGroup.members.find(m => m.userId === currentUserId) ? 'accepted' : 'pending')
  );
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState<{ userId: string; displayName: string }[]>([]);
  const [activeAudioMessageId, setActiveAudioMessageId] = useState<string | null>(null);
  const [listeningMessageIds] = useState<Set<string>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState('');
  const openLightbox = useCallback((url: string, name: string) => { setLightboxUrl(url); setLightboxName(name); }, []);
  const closeLightbox = useCallback(() => setLightboxUrl(null), []);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Current user's membership in this group
  const myMember = group.members.find(m => m.userId === currentUserId);
  const isOwner = group.ownerId === currentUserId;
  const isAdminMember = isOwner || myMember?.role === 'admin';

  const [membersOpen, setMembersOpen] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<Array<{ id: string; username: string; displayName: string | null; profileImage: string | null }>>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set());
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  // Accept / decline the group invite from inside the panel
  const handleAcceptInvite = useCallback(async () => {
    setAcceptingInvite(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${group.id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMemberStatus('accepted');
        if (data.group?.members) {
          setGroup(prev => ({ ...prev, members: data.group.members }));
        }
        showToast(`You joined "${group.name}"`, 'success');
      } else {
        showToast('Failed to accept invite', 'error');
      }
    } catch {
      showToast('Failed to accept invite', 'error');
    } finally {
      setAcceptingInvite(false);
    }
  }, [group.id, group.name, showToast]);

  const handleDeclineInvite = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API}/api/groups/${group.id}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(`Declined invite to "${group.name}"`, 'info');
      onGroupDeleted?.();
    } catch {
      showToast('Failed to decline invite', 'error');
    }
  }, [group.id, group.name, showToast, onGroupDeleted]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ groupId: string; open: boolean }>;
      if (ev.detail.groupId === group.id) {
        setMembersOpen(ev.detail.open);
        // Re-fetch fresh member roles whenever the panel opens
        if (ev.detail.open) {
          const token = localStorage.getItem('token');
          fetch(`${API}/api/groups/${group.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.group?.members) {
                setGroup(prev => ({ ...prev, members: data.group.members }));
              }
            })
            .catch(() => {});
        }
      }
    };
    window.addEventListener('chatr:group-members-toggle', handler);
    return () => window.removeEventListener('chatr:group-members-toggle', handler);
  }, [group.id]);

  // Load message history — only once accepted
  useEffect(() => {
    if (!group.id || memberStatus !== 'accepted') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API}/api/groups/${group.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const msgs: Message[] = (data.messages ?? []).map((m: any) => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId,
          recipientId: group.id,
          direction: m.senderId === currentUserId ? 'sent' : 'received',
          status: 'delivered' as Message['status'],
          timestamp: new Date(m.createdAt),
          type: (m.type || 'text') as Message['type'],
          senderDisplayName: m.sender?.displayName || m.sender?.username?.replace(/^@/, '') || 'Unknown',
          senderUsername: m.sender?.username,
          senderProfileImage: m.sender?.profileImage ?? null,
          fileUrl: m.fileUrl,
          fileName: m.fileName,
          fileSize: m.fileSize,
          fileType: m.fileType,
          waveformData: m.audioWaveform as number[] | undefined,
          duration: m.audioDuration,
        }));
        setMessages(msgs);
      })
      .catch(console.error);
  }, [group.id, currentUserId]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onMessage = (data: any) => {
      if (data.groupId !== group.id) return;
      const msg: Message = {
        id: data.id,
        content: data.content,
        senderId: data.senderId,
        recipientId: group.id,
        direction: data.senderId === currentUserId ? 'sent' : 'received',
        status: 'delivered' as Message['status'],
        timestamp: new Date(data.createdAt),
        type: (data.type || 'text') as Message['type'],
        senderDisplayName: data.sender?.displayName || data.sender?.username?.replace(/^@/, '') || 'Unknown',
        senderUsername: data.sender?.username,
        senderProfileImage: data.sender?.profileImage ?? null,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        waveformData: data.waveform,
        duration: data.duration,
      };
      setMessages(prev => {
        if (data.tempId) {
          const idx = prev.findIndex(m => m.id === data.tempId);
          if (idx !== -1) { const u = [...prev]; u[idx] = msg; return u; }
        }
        if (prev.find(m => m.id === data.id)) return prev;
        return [...prev, msg];
      });
    };

    const onTyping = (data: any) => {
      if (data.groupId !== group.id || data.userId === currentUserId) return;
      if (data.isTyping) {
        setIsTyping(prev => prev.find(t => t.userId === data.userId) ? prev : [...prev, { userId: data.userId, displayName: data.displayName }]);
        if (typingTimers.current[data.userId]) clearTimeout(typingTimers.current[data.userId]);
        typingTimers.current[data.userId] = setTimeout(() => {
          setIsTyping(prev => prev.filter(t => t.userId !== data.userId));
        }, 6000);
      } else {
        clearTimeout(typingTimers.current[data.userId]);
        setIsTyping(prev => prev.filter(t => t.userId !== data.userId));
      }
    };

    const onMemberJoined = (data: any) => {
      if (data.groupId !== group.id) return;
      if (!data.member) return;
      setGroup(prev => {
        // Don't add duplicates
        if (prev.members.find(m => m.userId === data.member.userId)) return prev;
        return { ...prev, members: [...prev.members, data.member] };
      });
    };

    const onMemberRemoved = (data: any) => {
      if (data.groupId !== group.id) return;
      setGroup(prev => ({ ...prev, members: prev.members.filter(m => m.userId !== data.memberId) }));
    };

    const onGroupDeletedEvent = (data: any) => {
      if (data.groupId !== group.id) return;
      showToast(`Group "${data.groupName}" was deleted`, 'warning', 4000);
      onGroupDeleted?.();
    };

    const onOwnerChanged = (data: any) => {
      if (data.groupId !== group.id) return;
      setGroup(prev => ({
        ...prev,
        ownerId: data.newOwnerId,
        members: prev.members.map(m =>
          m.userId === data.newOwnerId ? { ...m, role: 'admin' } : m
        ),
      }));
    };

    const onMemberPromoted = (data: any) => {
      if (data.groupId !== group.id) return;
      setGroup(prev => ({
        ...prev,
        members: prev.members.map(m =>
          m.userId === data.memberId ? { ...m, role: 'admin' } : m
        ),
      }));
    };

    const onMemberDemoted = (data: any) => {
      if (data.groupId !== group.id) return;
      setGroup(prev => ({
        ...prev,
        members: prev.members.map(m =>
          m.userId === data.memberId ? { ...m, role: 'member' } : m
        ),
      }));
    };

    // Fired when the current user is removed from the group by an admin
    const onRemovedFromGroup = (data: any) => {
      if (data.groupId !== group.id) return;
      showToast(`You were removed from "${group.name}"`, 'warning', 4000);
      onGroupDeleted?.();
    };

    socket.on('group:message', onMessage);
    socket.on('group:typing', onTyping);
    socket.on('group:memberJoined', onMemberJoined);
    socket.on('group:memberLeft', onMemberRemoved);
    socket.on('group:deleted', onGroupDeletedEvent);
    socket.on('group:removed', onRemovedFromGroup);
    socket.on('group:ownerChanged', onOwnerChanged);
    socket.on('group:memberPromoted', onMemberPromoted);
    socket.on('group:memberDemoted', onMemberDemoted);
    return () => {
      socket.off('group:message', onMessage);
      socket.off('group:typing', onTyping);
      socket.off('group:memberJoined', onMemberJoined);
      socket.off('group:memberLeft', onMemberRemoved);
      socket.off('group:deleted', onGroupDeletedEvent);
      socket.off('group:removed', onRemovedFromGroup);
      socket.off('group:ownerChanged', onOwnerChanged);
      socket.off('group:memberPromoted', onMemberPromoted);
      socket.off('group:memberDemoted', onMemberDemoted);
    };
  }, [socket, group.id, currentUserId, onGroupDeleted, showToast]);

  // When MessageInput sends a temp message, add it to local state immediately
  const handleMessageSent = useCallback((msg: Message) => {
    setMessages(prev => {
      if (prev.find(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const closeMembersPanel = useCallback(() => {
    setMembersOpen(false);
    setAddingMembers(false);
    setMemberSearch('');
    setMemberSearchResults([]);
    setInvitedIds(new Set());
  }, []);

  // Search users to invite — debounced
  useEffect(() => {
    if (!addingMembers) return;
    const q = memberSearch.trim();
    if (!q) { setMemberSearchResults([]); return; }
    setMemberSearching(true);
    const t = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`${API}/api/users/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const currentIds = new Set(group.members.map(m => m.userId));
        currentIds.add(currentUserId);
        setMemberSearchResults((data.users ?? data ?? []).filter((u: any) => !currentIds.has(u.id)));
      } catch { /* ignore */ }
      finally { setMemberSearching(false); }
    }, 280);
    return () => clearTimeout(t);
  }, [memberSearch, addingMembers, group.members, currentUserId]);

  const handleInviteMember = useCallback(async (user: { id: string; username: string; displayName: string | null }) => {
    const name = user.displayName || user.username.replace(/^@/, '');
    setInvitingIds(prev => new Set(prev).add(user.id));
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API}/api/groups/${group.id}/members`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: user.id }),
      });
      if (res.ok) {
        showToast(`Invited ${name} to the group`, 'success');
        setInvitedIds(prev => new Set(prev).add(user.id));
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to invite member', 'error');
      }
    } catch {
      showToast('Failed to invite member', 'error');
    } finally {
      setInvitingIds(prev => { const s = new Set(prev); s.delete(user.id); return s; });
    }
  }, [group.id, showToast]);

  const handleRemoveMember = useCallback(async (member: GroupMember) => {
    const name = member.user.displayName || member.user.username.replace(/^@/, '');
    const confirmed = await showConfirmation({
      title: 'Remove Member',
      message: `Remove ${name} from the group?`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Remove', variant: 'destructive', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/groups/${group.id}/members/${member.userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGroup(prev => ({ ...prev, members: prev.members.filter(m => m.userId !== member.userId) }));
        showToast(`${name} removed from group`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to remove member', 'error');
      }
    } catch {
      showToast('Failed to remove member', 'error');
    }
  }, [group.id, showConfirmation, showToast]);

  const handlePromote = useCallback(async (member: GroupMember) => {
    const name = member.user.displayName || member.user.username.replace(/^@/, '');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/groups/${group.id}/members/${member.userId}/promote`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGroup(prev => ({
          ...prev,
          members: prev.members.map(m => m.userId === member.userId ? { ...m, role: 'admin' } : m),
        }));
        showToast(`${name} is now an admin`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to promote member', 'error');
      }
    } catch {
      showToast('Failed to promote member', 'error');
    }
  }, [group.id, showToast]);

  const handleDemote = useCallback(async (member: GroupMember) => {
    const name = member.user.displayName || member.user.username.replace(/^@/, '');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/groups/${group.id}/members/${member.userId}/demote`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGroup(prev => ({
          ...prev,
          members: prev.members.map(m => m.userId === member.userId ? { ...m, role: 'member' } : m),
        }));
        showToast(`${name} is now a regular member`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to demote member', 'error');
      }
    } catch {
      showToast('Failed to demote member', 'error');
    }
  }, [group.id, showToast]);

  const handleLeaveGroup = useCallback(async () => {
    const confirmed = await showConfirmation({
      title: 'Leave Group',
      message: isOwner
        ? `You are the owner of "${group.name}". Leaving will promote another member to owner. Continue?`
        : `Leave "${group.name}"?`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Leave Group', variant: 'destructive', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/groups/${group.id}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Left "${group.name}"`, 'success');
        onGroupDeleted?.();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to leave group', 'error');
      }
    } catch {
      showToast('Failed to leave group', 'error');
    }
  }, [group.id, group.name, isOwner, showConfirmation, showToast, onGroupDeleted]);

  const handleDeleteGroup = useCallback(async () => {
    const confirmed = await showConfirmation({
      title: 'Delete Group',
      message: `Delete "${group.name}"? This will permanently remove all messages and cannot be undone.`,
      urgency: 'danger',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Delete Group', variant: 'destructive', value: true },
      ],
    });
    if (confirmed !== true) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/groups/${group.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Group "${group.name}" deleted`, 'success');
        onGroupDeleted?.();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete group', 'error');
      }
    } catch {
      showToast('Failed to delete group', 'error');
    }
  }, [group.id, group.name, showConfirmation, showToast, onGroupDeleted]);

  const typingLabel = (() => {
    if (isTyping.length === 0) return '';
    const names = isTyping.map(t => t.displayName.split(' ')[0]);
    if (names.length === 1) return `${names[0]} is typing`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
    const last = names[names.length - 1];
    const rest = names.slice(0, -1).join(', ');
    return `${rest} and ${last} are typing`;
  })();

  const border = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';

  return (
    <div className={styles.container}>
      <div className={styles.messageArea}>
        <ChatView
          messages={messages}
          isDark={isDark}
          messagesEndRef={messagesEndRef}
          isRecipientTyping={isTyping.length > 0}
          isRecipientRecording={false}
          recipientGhostText={typingLabel}
          listeningMessageIds={listeningMessageIds}
          onImageClick={openLightbox}
          onAudioPlayStatusChange={(id, _sid, playing) => setActiveAudioMessageId(playing ? id : null)}
          activeAudioMessageId={activeAudioMessageId}
          currentUserId={currentUserId}
          conversationStatus="accepted"
        />
      </div>

      {/* Members panel — slides up from bottom */}
      {membersOpen && (
        <div className={styles.membersPanel} style={{ background: isDark ? '#1e293b' : '#f8fafc', borderTop: `1px solid ${border}` }}>
          <div className={styles.membersPanelHeader}>
            {addingMembers ? (
              <>
                <button className={styles.iconBtn} onClick={() => { setAddingMembers(false); setMemberSearch(''); setMemberSearchResults([]); setInvitedIds(new Set()); }} aria-label="Back to members">
                  <i className="fas fa-arrow-left" />
                </button>
                <span style={{ fontWeight: 600, fontSize: '14px', color: isDark ? '#f1f5f9' : '#0f172a', flex: 1, marginLeft: '6px' }}>
                  Add Members
                </span>
              </>
            ) : (
              <>
                <span style={{ fontWeight: 600, fontSize: '14px', color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  Members ({group.members.length})
                </span>
              </>
            )}
            <button className={styles.iconBtn} onClick={closeMembersPanel} aria-label="Close members">
              <i className="fas fa-xmark" />
            </button>
          </div>

          {/* ── Add Members view ── */}
          {addingMembers ? (
            <div className={styles.addMembersView}>
              <PaneSearchBox
                value={memberSearch}
                onChange={setMemberSearch}
                onClear={() => setMemberSearchResults([])}
                placeholder="Search by name or username…"
                autoFocus
              />
              <div className={styles.searchResults}>
                {memberSearching && (
                  <div className={styles.searchHint}><i className="fas fa-spinner fa-pulse" /> Searching…</div>
                )}
                {!memberSearching && memberSearch.trim() && memberSearchResults.length === 0 && (
                  <div className={styles.searchHint}>No users found</div>
                )}
                {!memberSearch.trim() && (
                  <div className={styles.searchHint}>Start typing to search for people to add</div>
                )}
                {memberSearchResults.map(user => {
                  const name = user.displayName || user.username.replace(/^@/, '');
                  return (
                    <div key={user.id} className={styles.memberRow}>
                      <PresenceAvatar
                        displayName={name}
                        profileImage={user.profileImage}
                        info={{ status: 'offline', lastSeen: null }}
                        size={36}
                      />
                      <div className={styles.memberInfo}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#f1f5f9' : '#0f172a' }}>{name}</span>
                        <span style={{ fontSize: '11px', color: isDark ? '#64748b' : '#94a3b8' }}>{user.username}</span>
                      </div>
                      {invitedIds.has(user.id) ? (
                        <button className={styles.invitedBtn} disabled aria-label={`${name} invited`}>
                          <i className="fas fa-check" /> Invited
                        </button>
                      ) : (
                        <button
                          className={styles.inviteBtn}
                          onClick={() => handleInviteMember(user)}
                          disabled={invitingIds.has(user.id)}
                          aria-label={`Invite ${name}`}
                        >
                          {invitingIds.has(user.id)
                            ? <i className="fas fa-spinner fa-pulse" />
                            : <><i className="fas fa-user-plus" /> Invite</>}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Members list ── */
            <>
              <div className={styles.membersList}>
                {group.members.map(member => {
                  const name = member.user.displayName || member.user.username.replace(/^@/, '');
                  const memberIsOwner = member.userId === group.ownerId;
                  const memberIsAdmin = member.role === 'admin';
                  const isSelf = member.userId === currentUserId;
                  return (
                    <div key={member.userId} className={styles.memberRow}>
                      <PresenceAvatar
                        displayName={name}
                        profileImage={member.user.profileImage}
                        info={{ status: 'offline', lastSeen: null }}
                        size={36}
                      />
                      <div className={styles.memberInfo}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#f1f5f9' : '#0f172a' }}>
                          {name}{isSelf ? ' (you)' : ''}
                        </span>
                        {memberIsOwner && <span className={styles.ownerBadge}>Owner</span>}
                        {memberIsAdmin && <span className={styles.adminBadge}>Admin</span>}
                      </div>
                      {isAdminMember && !isSelf && !memberIsOwner && (
                        <div className={styles.memberActions}>
                          {isAdminMember && !memberIsAdmin && (
                            <button className={styles.actionBtn} onClick={() => handlePromote(member)} title={`Make ${name} admin`}>
                              <i className="fas fa-shield-plus" /><span>Make Admin</span>
                            </button>
                          )}
                          {isOwner && memberIsAdmin && (
                            <button className={styles.actionBtn} onClick={() => handleDemote(member)} title={`Remove admin from ${name}`}>
                              <i className="fas fa-shield-minus" /><span>Remove Admin</span>
                            </button>
                          )}
                          <button className={styles.removeMemberBtn} onClick={() => handleRemoveMember(member)} title={`Remove ${name}`}>
                            <i className="fas fa-user-minus" /><span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className={styles.membersPanelFooter}>
                {isAdminMember && (
                  <button className={styles.addMemberBtn} onClick={() => setAddingMembers(true)}>
                    <i className="fas fa-user-plus" /> Add Members
                  </button>
                )}
                <button className={styles.leaveGroupBtn} onClick={handleLeaveGroup}>
                  <i className="fas fa-arrow-right-from-bracket" /> Leave Group
                </button>
                {isOwner && (
                  <button className={styles.deleteGroupBtn} onClick={handleDeleteGroup}>
                    <i className="fas fa-trash" /> Delete Group
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Invite bar (pending) or message input (accepted) */}
      {memberStatus === 'pending' ? (
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          background: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          <div style={{ fontSize: '13px', color: isDark ? '#f1f5f9' : '#0f172a', fontWeight: '500', textAlign: 'center' }}>
            <i className="fas fa-envelope" style={{ color: '#f59e0b', marginRight: '6px' }} />
            You have been invited to join <strong>{group.name}</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAcceptInvite}
              disabled={acceptingInvite}
              style={{
                flex: 1, padding: '10px 0', border: 'none', borderRadius: '8px', cursor: acceptingInvite ? 'not-allowed' : 'pointer',
                background: '#22c55e', color: '#fff', fontSize: '13px', fontWeight: '600',
                opacity: acceptingInvite ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              <i className="fas fa-check" /> {acceptingInvite ? 'Joining…' : 'Accept'}
            </button>
            <button
              onClick={handleDeclineInvite}
              disabled={acceptingInvite}
              style={{
                flex: 1, padding: '10px 0', cursor: 'pointer',
                background: 'transparent',
                border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`,
                borderRadius: '8px',
                color: isDark ? '#94a3b8' : '#64748b', fontSize: '13px', fontWeight: '600',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              <i className="fas fa-xmark" /> Decline
            </button>
          </div>
        </div>
      ) : (
        <MessageInput
          isDark={isDark}
          groupId={group.id}
          onMessageSent={handleMessageSent}
        />
      )}

      {lightboxUrl && (
        <Lightbox
          imageUrl={lightboxUrl}
          imageName={lightboxName}
          isOpen={!!lightboxUrl}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}
