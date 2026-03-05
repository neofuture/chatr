"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConversationsList from "@/components/messaging/ConversationsList";
import ConversationView from "@/components/messaging/ConversationView/ConversationView";
import NewChatPanel from "@/components/messaging/NewChatPanel/NewChatPanel";
import { useConversationList, type ConversationUser } from "@/hooks/useConversationList";
import { useTheme } from "@/contexts/ThemeContext";
import { usePanels, type ActionIcon } from "@/contexts/PanelContext";
import { usePresence } from "@/contexts/PresenceContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useFriends } from "@/hooks/useFriends";
import { useMessageToast } from "@/hooks/useMessageToast";
import { clearCachedConversation } from "@/lib/messageCache";

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AppPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const {
    conversations,
    loading,
    search,
    setSearch,
    onlineUserIds,
    refresh,
    clearUnread,
  } = useConversationList();
  const { openPanel, closePanel } = usePanels();
  const { userPresence, requestPresence, setSuppressedIds } = usePresence();
  const { socket } = useWebSocket();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { blockUser, removeFriend } = useFriends();
  const [selectedUserId, setSelectedUserId] = useState('');

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
    const isFriend = user?.isFriend ?? false;
    const friendshipId = user?.friendshipId ?? null;
    const hasPendingFriendship = !!user?.friendship && user.friendship.status === 'pending';
    const isBlocked = user?.isBlocked ?? false;
    const blockedByMe = user?.blockedByMe ?? false;

    const submenuItems: ActionIcon['submenu'] = [];
    if (!isFriend && !hasPendingFriendship) {
      submenuItems.push({
        icon: 'fas fa-user-plus',
        label: 'Add friend',
        onClick: async () => {
          try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/friends/request`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ addresseeId: id }),
            });
            if (res.ok) {
              const data = await res.json();
              socket?.emit('friend:notify', {
                type: 'request',
                addresseeId: id,
                friendshipId: data.friendship.id,
              });
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
    if (isFriend && friendshipId) {
      submenuItems.push({
        icon: 'fas fa-user-minus',
        label: 'Remove friend',
        onClick: async () => {
          const result = await showConfirmation({
            title: 'Remove Friend',
            message: `Are you sure you want to remove ${displayName} from your friends?`,
            urgency: 'warning',
            actions: [
              { label: 'Cancel', variant: 'secondary', value: false },
              { label: 'Remove', variant: 'destructive', value: true },
            ],
          });
          if (result !== true) return;
          try {
            await removeFriend(friendshipId, id);
            refresh();
          } catch (e) {
            console.error('Failed to remove friend:', e);
            showToast('Failed to remove friend', 'error');
          }
        },
      });
    }
    if (!isBlocked) {
      submenuItems.push({
        icon: 'fas fa-ban',
        label: 'Block',
        variant: 'danger',
        onClick: async () => {
          const result = await showConfirmation({
            title: 'Block User',
            message: 'Are you sure you want to block this user? This will also remove them from your friends and delete the conversation.',
            urgency: 'danger',
            actions: [
              { label: 'Cancel', variant: 'secondary', value: false },
              { label: 'Block', variant: 'destructive', value: true },
            ],
          });
          if (result !== true) return;
          try {
            await blockUser(id);
            if (convoId) {
              const token = localStorage.getItem('token');
              await fetch(`${API}/api/conversations/${convoId}/decline`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
            }
            if (currentUserId) await clearCachedConversation(currentUserId, id);
            refresh();
            closePanel(`chat-${id}`);
          } catch (e) {
            console.error('Failed to block user:', e);
            showToast('Failed to block user', 'error');
          }
        },
      });
    }

    const actionIcons: ActionIcon[] = submenuItems.length > 0 ? [{
      icon: 'fas fa-ellipsis-vertical',
      label: 'More options',
      onClick: () => {},
      submenu: submenuItems,
    }] : [];

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
      />,
      displayName,
      'left',
      undefined,
      profileImage ?? undefined,
      true,
      actionIcons.length > 0 ? actionIcons : undefined,
    );
  }, [conversations, clearUnread, openPanel, closePanel, isDark, refresh, socket, showToast, showConfirmation, blockUser, removeFriend, currentUserId]);

  const openNewChatPanel = useCallback(() => {
    openPanel(
      'new-chat',
      <NewChatPanel isDark={isDark} onSelectUser={handleSelectUser} />,
      'New Chat',
      'center',
      undefined,
      undefined,
      true,
    );
  }, [openPanel, isDark, handleSelectUser]);

  // Listen for compose events from the header button and the ConversationsList button
  useEffect(() => {
    const handler = () => openNewChatPanel();
    window.addEventListener('chatr:compose', handler);
    return () => window.removeEventListener('chatr:compose', handler);
  }, [openNewChatPanel]);

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
      />
    </div>
  );
}
