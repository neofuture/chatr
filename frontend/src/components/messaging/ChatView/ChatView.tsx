'use client';

import { useRef } from 'react';
import MessageBubble, { type Message } from '@/components/MessageBubble';
import styles from './ChatView.module.css';

export interface ChatViewProps {
  /** Messages to display */
  messages: Message[];
  /** Dark-mode flag */
  isDark: boolean;
  /** Ref to auto-scroll anchor */
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  /** True while the remote user is typing */
  isRecipientTyping: boolean;
  /** True while the remote user is recording audio */
  isRecipientRecording: boolean;
  /** Live "ghost" text the remote user is composing */
  recipientGhostText: string;
  /** Set of message IDs that are currently being listened to */
  listeningMessageIds: Set<string>;
  /** Called when user clicks an image bubble */
  onImageClick: (url: string, name: string) => void;
  /** Called when an audio bubble play-state changes */
  onAudioPlayStatusChange: (messageId: string, senderId: string, isPlaying: boolean, isEnded?: boolean) => void;
  /** The single audio message ID that is currently playing (undefined = unmanaged) */
  activeAudioMessageId?: string | null;
  /** Optional: show a clear button in the header */
  showClearButton?: boolean;
  onClear?: () => void;
  /** Optional queue badge count */
  queuedCount?: number;
  onReaction?: (messageId: string, emoji: string) => void;
  onUnsend?: (messageId: string) => void;
  onReply?: (message: import('@/components/MessageBubble').Message) => void;
  currentUserId?: string;
}

export default function ChatView({
  messages,
  isDark,
  messagesEndRef,
  isRecipientTyping,
  isRecipientRecording,
  recipientGhostText,
  listeningMessageIds,
  onImageClick,
  onAudioPlayStatusChange,
  activeAudioMessageId,
  showClearButton,
  onClear,
  queuedCount = 0,
  onReaction,
  onUnsend,
  onReply,
  currentUserId,
}: ChatViewProps) {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.container}>

      {/* Header */}
      {(showClearButton || queuedCount > 0) && (
        <div
          className={`${styles.header} ${isDark ? styles['header--dark'] : styles['header--light']}`}
        >
          <div>
            <span className={styles.headerTitle}><i className="fas fa-comments" /> Messages</span>
            <span className={styles.headerCount}>({messages.length})</span>
            {queuedCount > 0 && (
              <span className={styles.queuedBadge}>
                {queuedCount} queued
              </span>
            )}
          </div>
          {showClearButton && onClear && (
            <button onClick={onClear} className={styles.clearButton}>
              <i className="fas fa-trash" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Message list */}
      <div
        ref={scrollRef}
        data-chat-scroll
        data-messages-scroll
        className={styles.messageList}
      >
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateInner}>
              <div className={styles.emptyStateIcon}><i className="fas fa-comments" /></div>
              <div className={styles.emptyStateText}>No messages yet</div>
            </div>
          </div>
        ) : (
          <MessageBubble
            messages={messages}
            isRecipientTyping={isRecipientTyping}
            isRecipientRecording={isRecipientRecording}
            recipientGhostText={recipientGhostText}
            listeningMessageIds={listeningMessageIds}
            onImageClick={onImageClick}
            messagesEndRef={messagesEndRef}
            onAudioPlayStatusChange={onAudioPlayStatusChange}
            activeAudioMessageId={activeAudioMessageId}
            overlayContainerRef={overlayRef}
            onReaction={onReaction}
            onUnsend={onUnsend}
            onReply={onReply}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {/* Overlay — portal target for context menu, must be position:absolute over scroll div */}
      <div
        ref={overlayRef}
        className={styles.overlay}
      />
    </div>
  );
}
