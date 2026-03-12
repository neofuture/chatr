'use client';

import { useRef, useEffect } from 'react';
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
  /** Called when a received message avatar is clicked */
  onAvatarClick?: (senderId: string, displayName: string, profileImage?: string | null) => void;
  /** When 'pending', hide sent/delivered status to anonymise receipts until accepted */
  conversationStatus?: 'pending' | 'accepted';
  /** True when the conversation partner is the AI bot — purple bubble + ring */
  isBot?: boolean;
  /** True when the conversation partner is a widget guest — green bubble + ring */
  isGuest?: boolean;
  /** True while messages are still loading from the server */
  loading?: boolean;
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
  onAvatarClick,
  conversationStatus,
  isBot = false,
  isGuest = false,
  loading = false,
}: ChatViewProps) {
  const scrollRef      = useRef<HTMLDivElement>(null);
  const overlayRef     = useRef<HTMLDivElement>(null);
  const wasActiveRef   = useRef(false);
  const userScrolledUp = useRef(false);
  const hasInitialSnap = useRef(false);
  const prevFirstMsgId = useRef<string | null>(null);

  // Reset scroll state when conversation changes (first message ID differs)
  useEffect(() => {
    const firstId = messages.length > 0 ? messages[0].id : null;
    if (firstId !== prevFirstMsgId.current) {
      prevFirstMsgId.current = firstId;
      userScrolledUp.current = false;
      hasInitialSnap.current = false;
    }
  }, [messages]);

  // Snap to bottom whenever messages change and user hasn't scrolled up.
  // Polls briefly to catch async content (images, code blocks) finishing layout.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledUp.current) return;

    let lastHeight = 0;
    let settled = 0;
    let frame: number;

    const snap = () => {
      el.scrollTop = el.scrollHeight;
      if (el.scrollHeight !== lastHeight) {
        lastHeight = el.scrollHeight;
        settled = 0;
      } else {
        settled++;
      }
      if (!hasInitialSnap.current && el.scrollHeight > el.clientHeight + 4) {
        hasInitialSnap.current = true;
      }
      if (settled < 10) {
        frame = requestAnimationFrame(snap);
      }
    };
    frame = requestAnimationFrame(snap);

    return () => cancelAnimationFrame(frame);
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

  // Anchor visible content on window resize — keeps the message the user
  // is looking at in the same visual position as bubble widths reflow.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let prevScrollHeight = el.scrollHeight;
    let rafId = 0;

    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const delta = el.scrollHeight - prevScrollHeight;
        if (Math.abs(delta) > 1) {
          el.scrollTop += delta;
        }
        prevScrollHeight = el.scrollHeight;
      });
    };

    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const isActive = isRecipientTyping || isRecipientRecording || !!recipientGhostText;

  // Only scroll for the indicator if we actually scrolled to show it
  const scrolledForIndicator = useRef(false);

  // Scroll to reveal indicator only if user is near the bottom already
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (isActive && !wasActiveRef.current) {
      wasActiveRef.current = true;
      // Only scroll if within 200px of the bottom — user is effectively at the bottom
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distFromBottom <= 20) {
        scrolledForIndicator.current = true;
        setTimeout(() => {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }, 32);
      } else {
        scrolledForIndicator.current = false;
      }
    } else if (!isActive && wasActiveRef.current) {
      wasActiveRef.current = false;
      // Only scroll back if we scrolled to show the indicator in the first place
      if (scrolledForIndicator.current) {
        scrolledForIndicator.current = false;
        setTimeout(() => {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }, 300);
      }
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
          loading ? (
            <div className={styles.emptyState} role="status" aria-label="Loading messages">
              <div className={styles.emptyStateInner}>
                <div className={styles.loadingSpinner} aria-hidden="true" />
                <div className={styles.emptyStateText}>Loading messages…</div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState} role="status" aria-label="No messages yet">
              <div className={styles.emptyStateInner}>
                <div className={styles.emptyStateIcon} aria-hidden="true">
                  <i className="fas fa-comments" />
                </div>
                <div className={styles.emptyStateText}>No messages yet</div>
              </div>
            </div>
          )
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
            onAvatarClick={onAvatarClick}
            conversationStatus={conversationStatus}
            isBot={isBot}
            isGuest={isGuest}
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
