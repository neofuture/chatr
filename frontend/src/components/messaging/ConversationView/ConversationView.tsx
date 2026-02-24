'use client';

import { useRef, useState } from 'react';
import ChatView from '@/components/messaging/ChatView';
import MessageInput from '@/components/messaging/MessageInput/MessageInput';
import Lightbox from '@/components/Lightbox/Lightbox';
import { useConversationView } from '@/hooks/useConversationView';

export interface ConversationViewProps {
  recipientId: string;
  isDark: boolean;
}

function getCurrentUserId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u?.id ?? '';
  } catch {
    return '';
  }
}

export default function ConversationView({ recipientId, isDark }: ConversationViewProps) {
  // Read synchronously so the hook has a userId on the very first render
  const [currentUserId] = useState<string>(getCurrentUserId);

  const {
    messages,
    messagesEndRef,
    activeAudioMessageId,
    listeningMessageIds,
    isRecipientTyping,
    isRecipientRecording,
    lightboxUrl,
    lightboxName,
    replyingTo,
    editingMessage,
    addMessage,
    handleEditSaved,
    editLastSentMessage,
    handleAudioPlayStatusChange,
    handleReaction,
    handleUnsend,
    openLightbox,
    closeLightbox,
    cancelReply,
    cancelEdit,
    setReplyingTo,
    setEditingMessage,
  } = useConversationView({ recipientId, currentUserId });

  if (!recipientId) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isDark ? '#64748b' : '#94a3b8',
        fontSize: '14px',
      }}>
        Select a conversation to start messaging
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Message list */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ChatView
          messages={messages}
          isDark={isDark}
          messagesEndRef={messagesEndRef}
          isRecipientTyping={isRecipientTyping}
          isRecipientRecording={isRecipientRecording}
          recipientGhostText=""
          listeningMessageIds={listeningMessageIds}
          onImageClick={openLightbox}
          onAudioPlayStatusChange={handleAudioPlayStatusChange}
          activeAudioMessageId={activeAudioMessageId}
          onReaction={handleReaction}
          onUnsend={handleUnsend}
          onReply={setReplyingTo}
          onEdit={setEditingMessage}
          currentUserId={currentUserId}
        />
      </div>

      {/* Input */}
      <MessageInput
        isDark={isDark}
        recipientId={recipientId}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onMessageSent={addMessage}
        onEditSaved={handleEditSaved}
        onCancelReply={cancelReply}
        onCancelEdit={cancelEdit}
        onEditLastSent={editLastSentMessage}
      />

      {/* Lightbox */}
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

