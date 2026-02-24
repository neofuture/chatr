"use client";

import { useEffect } from "react";
import ConversationsList from "@/components/messaging/ConversationsList";
import ConversationView from "@/components/messaging/ConversationView/ConversationView";
import { useConversation } from "@/hooks/useConversation";
import { useTheme } from "@/contexts/ThemeContext";
import { usePanels } from "@/contexts/PanelContext";
import { usePresence } from "@/contexts/PresenceContext";
import type { AvailableUser } from "@/components/test/types";

export default function AppPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const lab = useConversation();
  const { openPanel } = usePanels();
  const { userPresence, requestPresence } = usePresence();

  // Request presence for all available users once they are loaded
  useEffect(() => {
    if (lab.availableUsers.length > 0) {
      requestPresence(lab.availableUsers.map(u => u.id));
    }
  }, [lab.availableUsers, requestPresence]);

  const handleSelectUser = (id: string) => {
    const user: AvailableUser | undefined = lab.availableUsers.find(u => u.id === id);
    if (!user) return;

    lab.handleRecipientChange(id);

    const displayName = user.displayName || user.username;

    openPanel(
      `chat-${id}`,
      <ConversationView recipientId={id} isDark={isDark} />,
      displayName,
      'left',
      undefined, // subtitle handled live by LiveSubTitle in PanelContainer
      user.profileImage ?? undefined,
      true,
    );
  };

  if (!lab.currentUserId) return null;

  return (
    <div style={{ height: '100%', display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ConversationsList
        isDark={isDark}
        availableUsers={lab.availableUsers}
        selectedUserId={lab.testRecipientId}
        userPresence={userPresence}
        conversations={lab.conversations}
        currentUserId={lab.currentUserId}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}


