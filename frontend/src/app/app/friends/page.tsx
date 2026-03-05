"use client";

import FriendsPanel from "@/components/friends/FriendsPanel/FriendsPanel";
import ConversationView from "@/components/messaging/ConversationView/ConversationView";
import { useTheme } from "@/contexts/ThemeContext";
import { usePanels, type ActionIcon } from "@/contexts/PanelContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import { useFriends } from "@/hooks/useFriends";

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function FriendsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { openPanel, closePanel } = usePanels();
  const { socket } = useWebSocket();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();
  const { blockUser, removeFriend } = useFriends();

  const handleStartChat = (userId: string, displayName: string, profileImage?: string | null, isFriend?: boolean, friendshipId?: string | null) => {
    const submenuItems: ActionIcon['submenu'] = [];

    if (!isFriend) {
      submenuItems.push({
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
              socket?.emit('friend:notify', {
                type: 'request',
                addresseeId: userId,
                friendshipId: data.friendship.id,
              });
              showToast('Friend request sent', 'success');
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
            await removeFriend(friendshipId, userId);
            closePanel(`chat-${userId}`);
          } catch (e) {
            console.error('Failed to remove friend:', e);
            showToast('Failed to remove friend', 'error');
          }
        },
      });
    }
    submenuItems.push({
      icon: 'fas fa-ban',
      label: 'Block',
      variant: 'danger',
      onClick: async () => {
        const result = await showConfirmation({
          title: 'Block User',
          message: `Are you sure you want to block ${displayName}? This will also remove them from your friends.`,
          urgency: 'danger',
          actions: [
            { label: 'Cancel', variant: 'secondary', value: false },
            { label: 'Block', variant: 'destructive', value: true },
          ],
        });
        if (result !== true) return;
        try {
          await blockUser(userId);
          closePanel(`chat-${userId}`);
        } catch (e) {
          console.error('Failed to block user:', e);
          showToast('Failed to block user', 'error');
        }
      },
    });

    const actionIcons: ActionIcon[] = [{
      icon: 'fas fa-ellipsis-vertical',
      label: 'More options',
      onClick: () => {},
      submenu: submenuItems,
    }];

    openPanel(
      `chat-${userId}`,
      <ConversationView recipientId={userId} isDark={isDark} />,
      displayName,
      'left',
      undefined,
      profileImage ?? undefined,
      true,
      actionIcons,
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <FriendsPanel onStartChat={handleStartChat} />
    </div>
  );
}

