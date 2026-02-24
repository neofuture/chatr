"use client";

import ConversationsList from "@/components/messaging/ConversationsList";
import PanelFooter from "@/components/PanelFooter/PanelFooter";
import { useConversation } from "@/hooks/useConversation";
import { useTheme } from "@/contexts/ThemeContext";
import { usePanels } from "@/contexts/PanelContext";
import type { AvailableUser, PresenceInfo, PresenceStatus } from "@/components/test/types";

const PRESENCE_COLOUR: Record<PresenceStatus, string> = {
  online:  '#10b981',
  away:    '#f97316',
  offline: '#64748b',
};

function formatLastSeen(date: Date | null): string {
  if (!date) return 'Offline';
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60)    return `Last seen ${diff}s ago`;
  if (diff < 300)   return `Last seen ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Last seen at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return `Last seen ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function ChatPanel() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* message area — empty for now */}
      <div style={{ flex: 1 }} />
    </div>
  );
}

export default function AppPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const lab = useConversation();
  const { openPanel } = usePanels();

  const handleSelectUser = (id: string) => {
    const user: AvailableUser | undefined = lab.availableUsers.find(u => u.id === id);
    if (!user) return;

    lab.handleRecipientChange(id);

    const displayName = user.displayName || user.username;
    const presence: PresenceInfo = lab.userPresence[id] ?? { status: 'offline', lastSeen: null };

    const subtitle = presence.status === 'online' ? 'Online'
      : presence.status === 'away' ? 'Away'
      : formatLastSeen(presence.lastSeen);

    openPanel(
      `chat-${id}`,
      <ChatPanel />,
      displayName,
      'left',
      subtitle,
      user.profileImage ?? undefined,
      true,
      undefined,
      <PanelFooter />,
    );
  };

  if (!lab.currentUserId) return null;

  const H = "calc(100dvh - 56px - 80px)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const surface = isDark ? "#1e293b" : "#ffffff";
  const textPrimary = isDark ? "#f1f5f9" : "#0f172a";
  const textMuted = isDark ? "#94a3b8" : "#64748b";

  // ── Conversation list ──────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ConversationsList
        isDark={isDark}
        availableUsers={lab.availableUsers}
        selectedUserId={lab.testRecipientId}
        userPresence={lab.userPresence}
        conversations={lab.conversations}
        currentUserId={lab.currentUserId}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}
