'use client';

import { useRef, useEffect, useLayoutEffect } from 'react';
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
  onEdit?: (message: import('@/components/MessageBubble').Message) => void;
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
  onEdit,
  currentUserId,
}: ChatViewProps) {
  const scrollRef      = useRef<HTMLDivElement>(null);
  const overlayRef     = useRef<HTMLDivElement>(null);
  const wasActiveRef   = useRef(false);
  const userScrolledUp = useRef(false);
  // true once we've successfully snapped to a bottom that has real content
  const hasSnapped     = useRef(false);

  // Every time messages change, scroll to bottom before the browser paints
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledUp.current) return;

    if (!hasSnapped.current) {
      // Snap instantly — no animation — until we've landed at the real bottom
      el.scrollTop = el.scrollHeight;
      // Only mark as snapped once there's actually content to scroll to
      if (el.scrollHeight > el.clientHeight + 4) {
        hasSnapped.current = true;
      }
    } else {
      // Already seen the bottom — smooth scroll for new incoming messages
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Track manual scroll up/down
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUp.current = dist > 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = isRecipientTyping || isRecipientRecording || !!recipientGhostText;

  // Scroll to reveal indicator when it appears; scroll back when it disappears
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (isActive && !wasActiveRef.current) {
      wasActiveRef.current = true;
      setTimeout(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }, 32);
    } else if (!isActive && wasActiveRef.current) {
      wasActiveRef.current = false;
      setTimeout(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }, 300);
    }
  }, [isActive]);

  // Derive a live-region status for screen readers
  const liveStatus = isRecipientRecording
    ? 'Recipient is recording a voice message'
    : isRecipientTyping
    ? 'Recipient is typing'
    : recipientGhostText
    ? `Recipient is typing: ${recipientGhostText}`
    : '';

  return (
    <div className={styles.container}>

      {/* Header */}
      {(showClearButton || queuedCount > 0) && (
        <div
          role="toolbar"
          aria-label="Conversation controls"
          className={`${styles.header} ${isDark ? styles['header--dark'] : styles['header--light']}`}
        >
          <div>
            <span className={styles.headerTitle}>
              <i className="fas fa-comments" aria-hidden="true" /> Messages
            </span>
            <span className={styles.headerCount} aria-label={`${messages.length} messages`}>
              ({messages.length})
            </span>
            {queuedCount > 0 && (
              <span className={styles.queuedBadge} aria-label={`${queuedCount} messages queued`}>
                {queuedCount} queued
              </span>
            )}
          </div>
          {showClearButton && onClear && (
            <button
              onClick={onClear}
              className={styles.clearButton}
              aria-label="Clear all messages"
            >
              <i className="fas fa-trash" aria-hidden="true" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Polite live region — announces typing/recording to screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      >
        {liveStatus}
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        data-chat-scroll
        data-messages-scroll
        role="log"
        aria-label="Messages"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={isRecipientTyping || isRecipientRecording}
        className={styles.messageList}
      >
        {messages.length === 0 ? (
          <div className={styles.emptyState} role="status" aria-label="No messages yet">
            <div className={styles.emptyStateInner}>
              <div className={styles.emptyStateIcon} aria-hidden="true">
                <i className="fas fa-comments" />
              </div>
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
            onEdit={onEdit}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {/* Overlay — portal target for context menu, must be position:absolute over scroll div */}
      <div
        ref={overlayRef}
        className={styles.overlay}
        aria-hidden="true"
      />
    </div>
  );
}
