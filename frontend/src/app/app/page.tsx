"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConversationsList from "@/components/messaging/ConversationsList";
import ConversationView from "@/components/messaging/ConversationView/ConversationView";
import NewChatPanel from "@/components/messaging/NewChatPanel/NewChatPanel";
import NewGroupPanel from "@/components/messaging/NewGroupPanel/NewGroupPanel";
import GroupView from "@/components/messaging/GroupView/GroupView";
import type { GroupData } from "@/components/messaging/GroupView/GroupView";
import { useConversationList, type ConversationUser } from "@/hooks/useConversationList";
import { useGroupsList, type GroupSummary } from "@/hooks/useGroupsList";
import { useTheme } from "@/contexts/ThemeContext";
import { usePanels, type ActionIcon } from "@/contexts/PanelContext";
import { usePresence } from "@/contexts/PresenceContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useFriends } from "@/hooks/useFriends";
import { useMessageToast } from "@/hooks/useMessageToast";

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';


export default function AppPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const {
    conversations,
    loading,
    search,
    setSearch,
    refresh,
    clearUnread,
  } = useConversationList();
  const { openPanel, closePanel, panels, updatePanelActionIcons } = usePanels();
  const { userPresence, requestPresence, setSuppressedIds } = usePresence();
  const { socket } = useWebSocket();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { blockUser, removeFriend, unblockUser } = useFriends();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const { groups, invites: groupInvites, loading: groupsLoading, refresh: refreshGroups, clearUnread: clearGroupUnread, acceptInvite: acceptGroupInvite, declineInvite: declineGroupInvite } = useGroupsList();
  // Per-user nuke ref map — ConversationView stores its nuke handler here on mount
  const nukeRefs = useRef<Record<string, React.MutableRefObject<(() => Promise<void>) | null>>>({});

  const currentUserId = typeof window !== 'undefined'
    ? (() => { try { const t = localStorage.getItem('token'); if (!t) return ''; const p = JSON.parse(atob(t.split('.')[1])); return p.userId || ''; } catch { return ''; } })()
    : '';

  // Suppress presence for blocked users and pending outgoing conversations
  const suppressedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of conversations) {
      if (c.isBlocked) { ids.add(c.id); continue; }
      const isPendingOutgoing = c.conversationStatus === 'pending' && c.isInitiator;
      const noConvo = !c.conversationStatus && !c.isFriend;
      if (isPendingOutgoing || noConvo) ids.add(c.id);
    }
    return ids;
  }, [conversations]);

  useEffect(() => {
    setSuppressedIds(suppressedIds);
  }, [suppressedIds, setSuppressedIds]);

  useEffect(() => {
    if (conversations.length > 0) {
      requestPresence(conversations.map(u => u.id));
    }
  }, [conversations, requestPresence]);

  /**
   * Keep a live ref to conversations so onClick handlers always read fresh state.
   */
  const conversationsRef = useRef(conversations);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  /**
   * Build action icons for a chat panel.
   * - Which items are SHOWN is determined by `snap` (the user data at build time).
   * - onClick handlers always read the LIVE friendshipId etc. from conversationsRef
   *   so they work correctly even if the icon was built with slightly stale state.
   */
  const buildActionIcons = useCallback((userId: string, snap?: ConversationUser): ActionIcon[] => {
    // AI bot only gets delete conversation
    if (snap?.isBot) {
      return [{
        icon: 'fas fa-ellipsis-vertical',
        label: 'More options',
        onClick: () => {},
        submenu: [{
          icon: 'fas fa-radiation',
          label: 'Delete conversation',
          variant: 'danger',
          onClick: async () => {
            const nukeHandler = nukeRefs.current[userId]?.current;
            if (nukeHandler) {
              await nukeHandler();
            } else {
              showToast('Could not delete conversation', 'error');
            }
          },
        }],
      }];
    }

    const name = snap?.displayName || snap?.username || userId;
    const isFriend        = snap?.isFriend      ?? false;
    const friendshipId    = snap?.friendshipId   ?? null;
    const hasPending      = !!snap?.friendship   && snap.friendship.status === 'pending';
    const isBlockedByMe   = snap?.blockedByMe    ?? false;
    // isBlocked means either party blocked — don't show "block" if already blocked
    const isBlocked       = snap?.isBlocked      ?? false;

    const items: ActionIcon['submenu'] = [];

    // ── Add friend ── visible when: not a friend, no pending request, not blocked
    if (!isFriend && !hasPending && !isBlocked) {
      items.push({
        icon: 'fas fa-user-plus',
        label: 'Add friend',
        onClick: async () => {
          try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/friends/request`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ addresseeId: userId }),
            });
            if (res.ok) {
              const data = await res.json();
              socket?.emit('friend:notify', { type: 'request', addresseeId: userId, friendshipId: data.friendship.id });
              showToast('Friend request sent', 'success');
              refresh();
            } else {
              const err = await res.json();
              showToast(err.message || 'Could not send request', 'error');
            }
          } catch {
            showToast('Failed to send friend request', 'error');
          }
        },
      });
    }

    // ── Remove friend ── visible when: currently friends
    if (isFriend) {
      items.push({
        icon: 'fas fa-user-minus',
        label: 'Remove friend',
        onClick: async () => {
          // Read live friendshipId in case it changed since the icon was built
          const live = conversationsRef.current.find(u => u.id === userId);
          const liveFriendshipId = live?.friendshipId ?? friendshipId;
          if (!liveFriendshipId) { showToast('Could not find friendship', 'error'); return; }
          const ok = await showConfirmation({
            title: 'Remove Friend',
            message: `Remove ${name} from your friends?`,
            urgency: 'warning',
            actions: [
              { label: 'Cancel', variant: 'secondary', value: false },
              { label: 'Remove', variant: 'destructive', value: true },
            ],
          });
          if (ok !== true) return;
          try {
            await removeFriend(liveFriendshipId, userId);
            refresh();
          } catch {
            showToast('Failed to remove friend', 'error');
          }
        },
      });
    }

    // ── Block ── visible when: I have NOT already blocked them
    if (!isBlockedByMe) {
      items.push({
        icon: 'fas fa-ban',
        label: 'Block',
        variant: 'danger',
        onClick: async () => {
          const ok = await showConfirmation({
            title: 'Block User',
            message: 'Block this user? They will no longer be able to message you.',
            urgency: 'danger',
            actions: [
              { label: 'Cancel', variant: 'secondary', value: false },
              { label: 'Block', variant: 'destructive', value: true },
            ],
          });
          if (ok !== true) return;
          try {
            await blockUser(userId);
            closePanel(`chat-${userId}`);
            refresh();
          } catch {
            showToast('Failed to block user', 'error');
          }
        },
      });
    }

    // ── Unblock ── visible when: I have blocked them
    if (isBlockedByMe) {
      items.push({
        icon: 'fas fa-lock-open',
        label: 'Unblock',
        onClick: async () => {
          try {
            await unblockUser(userId);
            closePanel(`chat-${userId}`);
            refresh();
          } catch {
            showToast('Failed to unblock user', 'error');
          }
        },
      });
    }

    // ── Delete conversation ── always visible
    items.push({
      icon: 'fas fa-radiation',
      label: 'Delete conversation',
      variant: 'danger',
      onClick: async () => {
        const nukeHandler = nukeRefs.current[userId]?.current;
        if (nukeHandler) {
          await nukeHandler();
        } else {
          showToast('Could not delete conversation', 'error');
        }
      },
    });

    // Always return the ellipsis button — even if only block is present
    return [{
      icon: 'fas fa-ellipsis-vertical',
      label: 'More options',
      onClick: () => {},
      submenu: items,
    }];
  }, [socket, showToast, showConfirmation, refresh, blockUser, removeFriend, unblockUser, closePanel]);

  /**
   * When conversations update, refresh the visible menu items for any open chat panel.
   * We use a ref to track the previous key so we only patch when something meaningful changed.
   */
  const panelStatusKeyRef = useRef<Record<string, string>>({});

  useEffect(() => {
    for (const panel of panels) {
      if (!panel.id.startsWith('chat-') || panel.isClosing) continue;
      const userId = panel.id.slice(5);
      const user = conversations.find(u => u.id === userId);
      if (!user) continue;

      const key = `${user.isFriend ? 1 : 0}|${user.friendshipId ?? ''}|${user.isBlocked ? 1 : 0}|${user.blockedByMe ? 1 : 0}|${user.friendship?.status ?? ''}`;
      if (panelStatusKeyRef.current[userId] === key) continue;
      panelStatusKeyRef.current[userId] = key;

      updatePanelActionIcons(panel.id, buildActionIcons(userId, user));
    }
  // panels intentionally omitted — we don't want panel changes to re-trigger this
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, buildActionIcons, updatePanelActionIcons]);

  const handleSelectUser = useCallback((id: string, userData?: { displayName: string | null; username: string; profileImage: string | null }) => {
    const user: ConversationUser | undefined = conversations.find(u => u.id === id);
    setSelectedUserId(id);
    clearUnread(id);

    const displayName = userData?.displayName || userData?.username
      || user?.displayName || user?.username || id;
    const convoStatus = user?.conversationStatus;
    const convoId = user?.conversationId;
    const isInitiator = user?.isInitiator ?? false;
    const profileImage = userData?.profileImage ?? user?.profileImage ?? undefined;
    const isBlocked = user?.isBlocked ?? false;
    const blockedByMe = user?.blockedByMe ?? false;

    // Ensure a stable ref exists for this user's nuke handler
    if (!nukeRefs.current[id]) {
      nukeRefs.current[id] = { current: null };
    }
    const nukeRef = nukeRefs.current[id];

    // Clear the status key so the update effect sets fresh icons if this panel was previously open
    if (panelStatusKeyRef.current[id]) {
      delete panelStatusKeyRef.current[id];
    }

    openPanel(
      `chat-${id}`,
      <ConversationView
        recipientId={id}
        isDark={isDark}
        conversationId={convoId ?? undefined}
        conversationStatus={convoStatus ?? undefined}
        isInitiator={isInitiator}
        onConversationAccepted={refresh}
        isBlocked={isBlocked}
        blockedByMe={blockedByMe}
        recipientProfileImage={profileImage ?? null}
        nukeRef={nukeRef}
      />,
      displayName,
      'left',
      undefined,
      profileImage ?? undefined,
      true,
      buildActionIcons(id, user),
    );
  }, [conversations, clearUnread, openPanel, isDark, refresh, buildActionIcons]);

  /** Build action icons for a group panel — members button always opens the sheet */
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
      undefined,
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

  const openNewChatPanel = useCallback(() => {
    openPanel(
      'new-chat',
      <NewChatPanel isDark={isDark} onSelectUser={handleSelectUser} />,
      'New Message',
      'center',
      undefined,
      undefined,
      true,
    );
  }, [openPanel, isDark, handleSelectUser]);

  // Listen for compose events (header + button in ConversationsList)
  useEffect(() => {
    const handler = () => openNewChatPanel();
    window.addEventListener('chatr:compose', handler);
    return () => window.removeEventListener('chatr:compose', handler);
  }, [openNewChatPanel]);

  // Listen for new-group events (button in groups tab of ConversationsList)
  useEffect(() => {
    const handler = () => openNewGroupPanel();
    window.addEventListener('chatr:new-group', handler);
    return () => window.removeEventListener('chatr:new-group', handler);
  }, [openNewGroupPanel]);

  useMessageToast(handleSelectUser, currentUserId);

  if (!currentUserId) return null;

  return (
    <div style={{ height: '100%', display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ConversationsList
        isDark={isDark}
        conversations={conversations}
        selectedUserId={selectedUserId}
        userPresence={userPresence}
        currentUserId={currentUserId}
        onSelectUser={handleSelectUser}
        search={search}
        onSearchChange={setSearch}
        loading={loading}
        groups={groups}
        groupsLoading={groupsLoading}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSelectGroup}
        groupInvites={groupInvites}
        onAcceptGroupInvite={handleAcceptGroupInvite}
        onDeclineGroupInvite={handleDeclineGroupInvite}
      />
    </div>
  );
}

