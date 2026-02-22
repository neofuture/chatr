'use client';

import ChatView from '@/components/messaging/ChatView';
import type { Message } from '@/components/MessageBubble';

interface Props {
  messages: Message[];
  messageQueue: Message[];
  isDark: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isRecipientTyping: boolean;
  isRecipientRecording: boolean;
  recipientGhostText: string;
  listeningMessageIds: Set<string>;
  onClear: () => void;
  onImageClick: (url: string, name: string) => void;
  onAudioPlayStatusChange: (messageId: string, senderId: string, isPlaying: boolean, isEnded?: boolean) => void;
}

export default function LabMessages({
  messages, messageQueue, isDark, messagesEndRef,
  isRecipientTyping, isRecipientRecording, recipientGhostText,
  listeningMessageIds, onClear, onImageClick, onAudioPlayStatusChange,
}: Props) {
  return (
    <div style={{ height: '50%', minHeight: '50%', maxHeight: '50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ChatView
        messages={messages}
        isDark={isDark}
        messagesEndRef={messagesEndRef}
        isRecipientTyping={isRecipientTyping}
        isRecipientRecording={isRecipientRecording}
        recipientGhostText={recipientGhostText}
        listeningMessageIds={listeningMessageIds}
        onImageClick={onImageClick}
        onAudioPlayStatusChange={onAudioPlayStatusChange}
        showClearButton
        onClear={onClear}
        queuedCount={messageQueue.length}
      />
    </div>
  );
}

