'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MessageAudioPlayer from '@/components/MessageAudioPlayer/MessageAudioPlayer';
import { useTTS } from '@/hooks/useTTS';
import styles from './MessageBubble.module.css';

/** Mounts children, animates in on show, animates height+opacity out before unmounting */
function AnimatedIndicator({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const [rendered, setRendered] = useState(false);
  const [entering, setEntering] = useState(false);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const innerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (visible) {
      // Mount first with opacity 0
      setHeight('auto');
      setEntering(false);
      setRendered(true);
      // Next frame: measure then trigger enter
      timerRef.current = setTimeout(() => {
        setEntering(true);
      }, 16);
    } else {
      if (!rendered) return;
      // Capture current height so we can animate it to 0
      if (innerRef.current) {
        setHeight(innerRef.current.offsetHeight);
      }
      setEntering(false);
      // After a frame with explicit height set, animate to 0
      timerRef.current = setTimeout(() => {
        setHeight(0);
        // Unmount after transition completes
        timerRef.current = setTimeout(() => {
          setRendered(false);
          setHeight('auto');
        }, 300);
      }, 16);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rendered) return null;

  const isCollapsing = typeof height === 'number';

  return (
    <div
      style={{
        height: isCollapsing ? height : 'auto',
        overflow: 'hidden',
        transition: isCollapsing ? 'height 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.28s ease' : undefined,
        opacity: isCollapsing ? (height === 0 ? 0 : 1) : undefined,
      }}
    >
      <div
        ref={innerRef}
        style={{
          transform: entering ? 'translateY(0)' : 'translateY(12px)',
          opacity: entering ? 1 : 0,
          transition: entering
            ? 'transform 0.28s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.2s ease'
            : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export interface MessageReaction {
  userId: string;
  username: string;
  emoji: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderUsername?: string;
  senderDisplayName?: string | null;
  senderProfileImage?: string | null;
  recipientId: string;
  direction: 'sent' | 'received';
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  type?: 'text' | 'image' | 'file' | 'audio';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  waveformData?: number[];
  duration?: number;
  reactions?: MessageReaction[];
  unsent?: boolean;
  edited?: boolean;
  editedAt?: Date;
  replyTo?: {
    id: string;
    content: string;
    senderUsername: string;
    senderDisplayName?: string | null;
    type?: string;
    duration?: number;
  };
}

interface MessageBubbleProps {
  messages: Message[];
  currentUserId?: string;
  isRecipientTyping?: boolean;
  isRecipientRecording?: boolean;
  recipientGhostText?: string;
  onImageClick?: (imageUrl: string, imageName: string) => void;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
  onAudioPlayStatusChange?: (messageId: string, senderId: string, isPlaying: boolean, isEnded?: boolean) => void;
  listeningMessageIds?: Set<string>;
  activeAudioMessageId?: string | null;
  onReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onUnsend?: (messageId: string) => void;
  onReplyQuoteClick?: (messageId: string) => void;
  /** The fixed-height scroll container — the overlay will portal into this */
  overlayContainerRef?: React.RefObject<HTMLDivElement | null>;
}

const REACTIONS = ['❤️', '😂', '😯', '😢', '😡', '👍'];

// ─── Emoji-only detection ─────────────────────────────────────────────────────
// Returns the number of emojis if the string contains ONLY 1–3 emojis (and nothing else).
// Returns 0 otherwise.
// Covers: basic emoji, ZWJ sequences, skin-tone modifiers, variation selectors, flags (regional indicators)
// Each alternative matches ONE emoji glyph (possibly with skin-tone/ZWJ/variation-selector suffixes).
// The key: no outer `+` — each emoji is a separate match so we can count them.
// eslint-disable-next-line no-misleading-character-class
const EMOJI_REGEX = /(?:[\u{1F1E0}-\u{1F1FF}]{2}|[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}][\uFE0F]?|[\u{2700}-\u{27BF}][\uFE0F]?)(?:[\u{1F3FB}-\u{1F3FF}])?(?:\u200D(?:[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{2600}-\u{26FF}][\uFE0F]?)(?:[\u{1F3FB}-\u{1F3FF}])?)*[\uFE0F]?/gu;

function getEmojiOnlyCount(text: string): 0 | 1 | 2 | 3 {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Match all emoji sequences
  // and check the remainder is empty
  const matches = Array.from(trimmed.matchAll(EMOJI_REGEX));
  if (matches.length === 0 || matches.length > 3) return 0;
  // Strip all matched emoji sequences — nothing non-emoji should remain
  const stripped = trimmed.replace(EMOJI_REGEX, '').trim();
  if (stripped.length > 0) return 0;
  return matches.length as 1 | 2 | 3;
}

const EMOJI_FONT_SIZE: Record<1 | 2 | 3, string> = {
  1: '4em',
  2: '3em',
  3: '2em',
};

interface ContextMenuState {
  message: Message;
  isSent: boolean;
  radiusClass: string;
  bubbleToneClass: string;
}

// ─── Reaction Badge ───────────────────────────────────────────────────────────

function ReactionBadge({ reactions, isSent, currentUserId }: {
  reactions: MessageReaction[];
  isSent: boolean;
  currentUserId?: string;
}) {
  const [showTip, setShowTip] = useState(false);

  // Group by emoji → { emoji: string, count: number, names: string[] }
  const groups = Object.values(
    reactions.reduce<Record<string, { emoji: string; count: number; names: string[] }>>((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, names: [] };
      acc[r.emoji].count++;
      acc[r.emoji].names.push(r.userId === currentUserId ? 'You' : r.username);
      return acc;
    }, {})
  );

  if (groups.length === 0) return null;

  // Tooltip: "You, Alice reacted ❤️" etc
  const tipLines = groups.map(g => `${g.names.join(', ')} reacted ${g.emoji}`).join('; ');

  return (
    <div
      className={`${styles.reactionBadge} ${isSent ? styles.reactionBadgeSent : styles.reactionBadgeReceived}`}
      role="button"
      tabIndex={0}
      aria-label={`Reactions: ${tipLines}. Press to toggle details.`}
      onClick={e => { e.stopPropagation(); setShowTip(v => !v); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setShowTip(v => !v); } }}
    >
      {groups.map(g => (
        <span key={g.emoji} className={styles.reactionEmoji} aria-hidden="true">
          {g.emoji}{g.count > 1 && <span className={styles.reactionCount}>{g.count}</span>}
        </span>
      ))}
      {showTip && (
        <div
          role="tooltip"
          className={`${styles.reactionTooltip} ${isSent ? styles.reactionTooltipSent : styles.reactionTooltipReceived}`}
        >
          {tipLines}
        </div>
      )}
    </div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function MessageContextMenu({
  state,
  onReaction,
  onReply,
  onEdit,
  onUnsend,
  onClose,
}: {
  state: ContextMenuState;
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onUnsend: () => void;
  onClose: () => void;
}) {
  const { message, isSent } = state;
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 260);
  }, [closing, onClose]);

  const handleAnimationEnd = useCallback((e: React.AnimationEvent) => {
    if (closing && e.animationName.includes('bubbleSlideOut')) onClose();
  }, [closing, onClose]);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    const clickHandler = (e: MouseEvent | TouchEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('[data-ctx-menu]')) return;
      // Small delay so the open-trigger click doesn't immediately re-close
      setTimeout(handleClose, 60);
    };
    document.addEventListener('keydown', keyHandler);
    const id = setTimeout(() => {
      document.addEventListener('mousedown', clickHandler);
      document.addEventListener('touchstart', clickHandler);
    }, 60);
    return () => {
      clearTimeout(id);
      document.removeEventListener('keydown', keyHandler);
      document.removeEventListener('mousedown', clickHandler);
      document.removeEventListener('touchstart', clickHandler);
    };
  }, [handleClose]);

  const isAudio = message.type === 'audio' || (message.type === 'file' && message.fileType?.startsWith('audio/'));

  return (
    <div
      data-ctx-menu
      role="dialog"
      aria-modal="true"
      aria-label="Message actions"
      className={`${styles.contextOverlay} ${closing ? styles.contextOverlayClosing : ''}`}
      onClick={handleClose}
      onWheel={handleClose}
      onTouchMove={handleClose}
    >
      {/* Flex column stack — CSS handles equal gaps, no height estimation */}
      <div
        className={`${styles.contextStack} ${styles.contextStackCentered}`}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Reactions pill ── */}
        <div
          className={`${styles.reactionsRowOuter} ${isSent ? styles.reactionsRowOuterSent : styles.reactionsRowOuterReceived} ${closing ? styles.reactionsRowOuterClosing : ''}`}
        >
          <div className={styles.reactionsRow}>
            {REACTIONS.map(emoji => (
              <button key={emoji} className={styles.reactionBtn}
                aria-label={`React with ${emoji}`}
                onClick={() => { onReaction(emoji); handleClose(); }}>
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* ── Cloned bubble ── */}
        <div
          className={`${styles.clonedBubble} ${state.radiusClass} ${state.bubbleToneClass} ${isSent ? styles.clonedBubbleSent : styles.clonedBubbleReceived} ${closing ? styles.clonedBubbleClosing : ''}`}
          onAnimationEnd={handleAnimationEnd}
        >
          {isAudio ? (
            <div className={styles.clonedVoice}>
              <i className={`fas fa-microphone ${styles.clonedVoiceIcon}`} /> Voice message
            </div>
          ) : message.type === 'image' && message.fileUrl ? (
            <img src={message.fileUrl} alt={message.fileName || 'Image'}
              className={styles.clonedImage} />
          ) : (
            <>
              <div className={styles.clonedText}>
                {message.content}
              </div>
              <div className={`${styles.clonedTimestamp} ${isSent ? styles.clonedTimestampSent : styles.clonedTimestampReceived}`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </>
          )}
        </div>

        {/* ── Action menu ── */}
        <div
          className={`${styles.actionMenu} ${isSent ? styles.actionMenuSent : styles.actionMenuReceived} ${closing ? styles.actionMenuClosing : ''}`}
        >
          <button className={styles.actionItem} onClick={() => { onReply(); handleClose(); }}
            aria-label="Reply to this message">
            <i className={`fas fa-reply ${styles.actionIcon}`} aria-hidden="true" /> Reply
          </button>
          {isSent && !message.unsent && (!message.type || message.type === 'text') && (
            <button className={styles.actionItem}
              onClick={() => { onEdit(); handleClose(); }}
              aria-label="Edit this message">
              <i className={`fas fa-pen ${styles.actionIcon}`} aria-hidden="true" /> Edit
            </button>
          )}
          {isSent && (
            <button className={`${styles.actionItem} ${styles.actionItemDanger}`}
              onClick={() => { onUnsend(); handleClose(); }}
              aria-label="Unsend this message">
              <i className={`fas fa-trash ${styles.actionIcon}`} aria-hidden="true" /> Unsend
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MessageBubble({
  messages,
  currentUserId,
  isRecipientTyping = false,
  isRecipientRecording = false,
  recipientGhostText = '',
  onImageClick,
  messagesEndRef,
  onAudioPlayStatusChange,
  listeningMessageIds = new Set(),
  activeAudioMessageId,
  onReaction,
  onReply,
  onEdit,
  onUnsend,
  onReplyQuoteClick,
  overlayContainerRef,
}: MessageBubbleProps) {
  const defaultRef = useRef<HTMLDivElement>(null);
  const endRef = messagesEndRef || defaultRef;
  const { speak, speakingId, supported: ttsSupported } = useTTS();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const scrollToMessage = (messageId: string) => {
    // Find the message element within the scroll container (or document)
    const container = overlayContainerRef?.current ?? endRef.current?.closest('[data-messages-scroll]') ?? document.body;
    const el = (container as HTMLElement).querySelector?.(`[data-message-id="${messageId}"]`) as HTMLElement | null
      ?? document.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 1800);
    // Also call parent callback if provided
    if (onReplyQuoteClick) onReplyQuoteClick(messageId);
  };
  const longPressTarget = useRef<HTMLElement | null>(null);

  const getStatusInfo = (status: Message['status'], type?: Message['type']) => {
    let statusClass = styles.statusPending; let statusText = 'Pending';
    if (status === 'queued')     { statusClass = styles.statusQueued; statusText = 'Queued'; }
    else if (status === 'sending')   { statusClass = styles.statusSending; statusText = 'Sending'; }
    else if (status === 'sent')      { statusClass = styles.statusSent; statusText = 'Sent'; }
    else if (status === 'delivered') { statusClass = styles.statusDelivered; statusText = 'Delivered'; }
    else if (status === 'read') {
      statusClass = styles.statusRead;
      statusText = type === 'audio' ? 'Listened' : (type === 'image' || type === 'file') ? 'Viewed' : 'Read';
    } else if (status === 'failed')  { statusClass = styles.statusFailed; statusText = 'Failed'; }
    return { statusClass, statusText };
  };

  const getBubbleToneClass = (isSent: boolean, status: Message['status']) => {
    if (!isSent) return styles.bubbleReceived;
    return status === 'queued' ? styles.bubbleSentQueued : styles.bubbleSent;
  };

  const getBubbleRadiusClass = (isSent: boolean, gPrev: boolean, gNext: boolean) => {
    if (isSent) {
      if (gPrev && gNext) return styles.bubbleRadiusSentBoth;
      if (gPrev) return styles.bubbleRadiusSentPrev;
      if (gNext) return styles.bubbleRadiusSentNext;
      return styles.bubbleRadiusSentSolo;
    }
    if (gPrev && gNext) return styles.bubbleRadiusReceivedBoth;
    if (gPrev) return styles.bubbleRadiusReceivedPrev;
    if (gNext) return styles.bubbleRadiusReceivedNext;
    return styles.bubbleRadiusReceivedSolo;
  };

  const openMenu = useCallback((
    msg: Message, isSent: boolean, radiusClass: string, bubbleToneClass: string,
  ) => {
    const portalReady = overlayContainerRef?.current || (typeof document !== 'undefined' ? document.body : null);
    if (!portalReady) return;
    setContextMenu({
      message: msg,
      isSent,
      radiusClass,
      bubbleToneClass,
    });
  }, [overlayContainerRef]);

  const startLongPress = useCallback((
    e: React.TouchEvent | React.MouseEvent,
    msg: Message, isSent: boolean, borderRadius: string, bgColor: string,
  ) => {
    longPressTarget.current = e.currentTarget as HTMLElement;
    if ('touches' in e && e.touches.length > 0) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    longPressTimer.current = setTimeout(() => {
      if (longPressTarget.current) openMenu(msg, isSent, borderRadius, bgColor);
    }, 500);
  }, [openMenu]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    longPressTarget.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current || e.touches.length === 0) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 6 || dy > 6) cancelLongPress();
  }, [cancelLongPress]);

  const handleTouchEnd = useCallback(() => {
    touchStartPos.current = null;
    cancelLongPress();
  }, [cancelLongPress]);

  // Portal target: the overlay div (pointer-events:none wrapper, overlay re-enables them)
  const overlayEl = overlayContainerRef?.current;
  const portalTarget = overlayEl ?? (typeof document !== 'undefined' ? document.body : null);

  return (
    <div className={styles.messagesContainer}>
      {messages.map((msg, index) => {
        const isSent = msg.direction === 'sent';
        const { statusClass, statusText } = getStatusInfo(msg.status, msg.type);
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
        const isGroupedWithPrev = !!(prevMsg && prevMsg.direction === msg.direction);
        const isGroupedWithNext = !!(nextMsg && nextMsg.direction === msg.direction);
        const radiusClass = getBubbleRadiusClass(isSent, isGroupedWithPrev, isGroupedWithNext);
        const bubbleToneClass = getBubbleToneClass(isSent, msg.status);

        // Prefer displayName, fall back to username without @
        const senderDisplayName = msg.senderDisplayName || (msg.senderUsername || '').replace(/^@/, '') || 'Unknown';
        // Initials for avatar fallback — first letter of first + last word (e.g. "Carl Fearby" → "CF")
        const nameParts = senderDisplayName.trim().split(/\s+/);
        const initials = nameParts.length >= 2
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : senderDisplayName.slice(0, 2).toUpperCase() || '??';

        const hasReactions = (msg.reactions?.length ?? 0) > 0;
        const wrapperMarginClass = hasReactions
          ? styles.messageWrapperWithReactions
          : isGroupedWithNext
          ? styles.messageWrapperGrouped
          : styles.messageWrapperDefault;

        const wrapperHighlightClass = highlightedMessageId === msg.id
          ? styles.messageWrapperHighlighted
          : '';

        const bubbleColumnWidthClass = msg.type === 'audio'
          ? styles.bubbleColumnAudio
          : msg.type === 'image'
          ? styles.bubbleColumnImage
          : styles.bubbleColumnText;

        const messageTextSpacingClass = !isGroupedWithNext
          ? styles.messageTextLoose
          : styles.messageTextTight;

        return (
          <div key={msg.id}
            data-message-id={msg.id}
            role="article"
            aria-label={`${isSent ? 'You' : senderDisplayName}: ${msg.unsent ? 'message unsent' : msg.type === 'audio' ? 'voice message' : msg.type === 'image' ? `image: ${msg.fileName || 'photo'}` : msg.type === 'file' ? `file: ${msg.fileName || 'file'}` : msg.content}. ${msg.timestamp.toLocaleTimeString()}${isSent ? `. Status: ${statusText}` : ''}`}
            className={`${styles.messageWrapper} ${isSent ? styles.messageWrapperSent : styles.messageWrapperReceived} ${wrapperMarginClass} ${wrapperHighlightClass}`}>

            {/* Received: avatar column (left side) */}
            {!isSent && (
              <div className={styles.avatarColumn} aria-hidden="true">
                {/* Only show avatar on last bubble of a group (or solo) */}
                {!isGroupedWithNext && (
                  msg.senderProfileImage ? (
                    <div className={styles.avatarImageRing}>
                      <img
                        src={msg.senderProfileImage}
                        alt=""
                        className={styles.avatarImage}
                      />
                    </div>
                  ) : (
                    <div className={styles.avatarImageRing}>
                      <div className={styles.avatarInitials}>
                        {initials}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Bubble column */}
            <div className={`${styles.bubbleColumn} ${isSent ? styles.bubbleColumnSent : styles.bubbleColumnReceived} ${bubbleColumnWidthClass}`}>

              {/* Sender name — only on first bubble in a received group */}
              {!isSent && !isGroupedWithPrev && (
                <span className={styles.senderName}>
                  {senderDisplayName}
                </span>
              )}

              {/* ── Reply quote — above the bubble, outside it ── */}
              {msg.replyTo && (
                <div
                  className={`${styles.replyQuoteWrapper} ${isSent ? styles.replyQuoteWrapperSent : styles.replyQuoteWrapperReceived}`}
                  onClick={() => scrollToMessage(msg.replyTo!.id)}
                >
                  <div className={styles.replyQuoteCard}>
                    {/* Accent bar */}
                    <div className={`${styles.replyQuoteAccent} ${isSent ? styles.replyQuoteAccentSent : styles.replyQuoteAccentReceived}`} />
                    <div className={styles.replyQuoteContent}>
                      <div className={`${styles.replyQuoteSender} ${isSent ? styles.replyQuoteSenderSent : styles.replyQuoteSenderReceived}`}>
                        {msg.replyTo.senderUsername === 'You'
                          ? 'You'
                          : msg.replyTo.senderDisplayName || msg.replyTo.senderUsername?.replace(/^@/, '') || 'Unknown'}
                      </div>
                      {msg.replyTo.type === 'audio' ? (
                        <div className={styles.replyQuoteMetaRow}>
                          <i className={`fas fa-microphone ${styles.replyQuoteMetaIcon}`} />
                          <span>Voice message</span>
                          {msg.replyTo.duration != null && msg.replyTo.duration > 0 && (
                            <span className={styles.replyQuoteDuration}>
                              {Math.floor(msg.replyTo.duration / 60)}:{String(Math.round(msg.replyTo.duration % 60)).padStart(2, '0')}
                            </span>
                          )}
                          <i className={`fas fa-play-circle ${styles.replyQuoteMetaIconSecondary}`} />
                        </div>
                      ) : msg.replyTo.type === 'image' ? (
                        <div className={styles.replyQuoteMetaRow}>
                          <i className={`fas fa-image ${styles.replyQuoteMetaIcon}`} />
                          <span>Photo</span>
                        </div>
                      ) : msg.replyTo.type === 'file' ? (
                        <div className={styles.replyQuoteMetaRow}>
                          <i className={`fas fa-file ${styles.replyQuoteMetaIcon}`} />
                          <span>{msg.replyTo.content || 'File'}</span>
                        </div>
                      ) : (
                        <div className={styles.replyQuoteText}>
                          {msg.replyTo.content}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bubble + reaction badge */}
              <div className={`${styles.bubbleWrap} ${msg.type === 'audio' ? styles.bubbleWrapAudio : ''}`}>

                {/* ── Unsent placeholder ── */}
                {msg.unsent ? (
                  <div className={`${styles.unsentBubble} ${radiusClass}`}>
                    <i className={`fas fa-ban ${styles.unsentIcon}`} />
                    <span className={styles.unsentText}>
                      {isSent ? 'You unsent this message' : `${senderDisplayName} unsent this message`}
                    </span>
                  </div>
                ) : (() => {
                  // ── Emoji-only naked display (1–3 emojis, text type only) ──
                  const emojiCount = (!msg.type || msg.type === 'text') && !msg.replyTo
                    ? getEmojiOnlyCount(msg.content)
                    : 0;

                  if (emojiCount > 0) {
                    return (
                      <div
                        className={`${styles.emojiOnlyBubble} ${isSent ? styles.emojiOnlySent : styles.emojiOnlyReceived}`}
                        tabIndex={0}
                        role="group"
                        aria-label="Message options: hold or press Enter"
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMenu(msg, isSent, radiusClass, bubbleToneClass); } }}
                        onContextMenu={e => { e.preventDefault(); openMenu(msg, isSent, radiusClass, bubbleToneClass); }}
                        onTouchStart={e => startLongPress(e, msg, isSent, radiusClass, bubbleToneClass)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                        onMouseDown={e => { if (e.button === 0) startLongPress(e, msg, isSent, radiusClass, bubbleToneClass); }}
                        onMouseUp={cancelLongPress}
                        onMouseLeave={cancelLongPress}
                      >
                        <span
                          className={styles.emojiOnlyText}
                          style={{ fontSize: EMOJI_FONT_SIZE[emojiCount as 1 | 2 | 3] }}
                          aria-label={msg.content}
                        >
                          {msg.content}
                        </span>
                        {!isGroupedWithNext && (
                          <div className={`${styles.timestamp} ${styles.emojiOnlyTimestamp}`}>
                            {msg.timestamp.toLocaleTimeString()}
                            {msg.edited && !msg.unsent && (
                              <span className={styles.editedMarker} aria-label="edited">
                                {' '}<i className="fas fa-pen" aria-hidden="true" /> edited
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // ── Normal bubble ──
                  return (
                  <div
                    className={`${styles.messageBubble} ${radiusClass} ${bubbleToneClass} ${msg.type === 'audio' ? styles.bubblePaddingAudio : (!msg.type || msg.type === 'text') ? styles.bubblePaddingText : styles.bubblePaddingMedia}`}
                    tabIndex={0}
                    role="group"
                    aria-label="Message options: hold or press Enter"
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMenu(msg, isSent, radiusClass, bubbleToneClass); } }}
                    onContextMenu={e => { e.preventDefault(); openMenu(msg, isSent, radiusClass, bubbleToneClass); }}
                    onTouchStart={e => startLongPress(e, msg, isSent, radiusClass, bubbleToneClass)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onMouseDown={e => { if (e.button === 0) startLongPress(e, msg, isSent, radiusClass, bubbleToneClass); }}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                  >
                    {/* Image */}
                    {msg.type === 'image' && msg.fileUrl && (
                      <div>
                        <img src={msg.fileUrl} alt={msg.fileName || 'Shared image'} className={styles.messageImage}
                          onClick={() => { if (onImageClick) onImageClick(msg.fileUrl!, msg.fileName || ''); }} />
                        {msg.fileName && <div className={styles.imageFileName}><i className="fas fa-camera" aria-hidden="true" /> {msg.fileName}</div>}
                      </div>
                    )}
                    {/* Audio */}
                    {(msg.type === 'audio' || (msg.type === 'file' && msg.fileType?.startsWith('audio/'))) && msg.fileUrl && (
                      <MessageAudioPlayer
                        audioUrl={msg.fileUrl} duration={msg.duration || 0} waveformData={msg.waveformData || []}
                        timestamp={msg.timestamp} isSent={isSent} messageId={msg.id} senderId={msg.senderId}
                        onPlayStatusChange={onAudioPlayStatusChange} status={msg.status}
                        isListening={listeningMessageIds.has(msg.id)}
                        isActivePlayer={activeAudioMessageId !== undefined ? activeAudioMessageId === msg.id : undefined}
                      />
                    )}
                    {/* File */}
                    {msg.type === 'file' && !msg.fileType?.startsWith('audio/') && msg.fileUrl && (() => {
                      const ft = msg.fileType ?? '';
                      const fn = (msg.fileName ?? '').toLowerCase();

                      // Determine icon + accent colour
                      type FileKind = 'pdf' | 'video' | 'zip' | 'word' | 'excel' | 'ppt' | 'txt' | 'audio' | 'generic';
                      let kind: FileKind = 'generic';
                      if (ft === 'application/pdf' || fn.endsWith('.pdf'))                      kind = 'pdf';
                      else if (ft.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/.test(fn)) kind = 'video';
                      else if (ft.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(fn)) kind = 'audio';
                      else if (ft.includes('zip') || ft.includes('archive') || /\.(zip|rar|7z|tar|gz)$/.test(fn)) kind = 'zip';
                      else if (ft.includes('word') || /\.(doc|docx)$/.test(fn))                kind = 'word';
                      else if (ft.includes('excel') || ft.includes('spreadsheet') || /\.(xls|xlsx|csv)$/.test(fn)) kind = 'excel';
                      else if (ft.includes('powerpoint') || ft.includes('presentation') || /\.(ppt|pptx)$/.test(fn)) kind = 'ppt';
                      else if (ft.includes('text') || fn.endsWith('.txt'))                     kind = 'txt';

                      const iconMap: Record<FileKind, { icon: string; colour: string; label: string }> = {
                        pdf:     { icon: 'fas fa-file-pdf',     colour: '#ef4444', label: 'PDF'   },
                        video:   { icon: 'fas fa-file-video',   colour: '#f59e0b', label: 'VIDEO' },
                        audio:   { icon: 'fad fa-waveform-lines', colour: '#a855f7', label: 'AUDIO' },
                        zip:     { icon: 'fas fa-file-archive', colour: '#f97316', label: 'ZIP'   },
                        word:    { icon: 'fas fa-file-word',    colour: '#3b82f6', label: 'DOC'   },
                        excel:   { icon: 'fas fa-file-excel',   colour: '#22c55e', label: 'XLS'   },
                        ppt:     { icon: 'fas fa-file-powerpoint', colour: '#f97316', label: 'PPT' },
                        txt:     { icon: 'fas fa-file-alt',     colour: '#94a3b8', label: 'TXT'   },
                        generic: { icon: 'fas fa-file',         colour: '#3b82f6', label: 'FILE'  },
                      };
                      const { icon, colour, label } = iconMap[kind];

                      // Previewable in browser — open in new tab without forcing download
                      const canPreview = kind === 'pdf' || kind === 'video' || kind === 'audio';
                      const sizeKb = msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : null;

                      return (
                        <a
                          href={msg.fileUrl}
                          {...(!canPreview ? { download: msg.fileName } : {})}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.fileLink}
                          aria-label={`${canPreview ? 'Open' : 'Download'} ${msg.fileName || 'file'}${sizeKb ? `, ${sizeKb}` : ''}`}
                        >
                          {/* Icon badge */}
                          <span className={styles.fileIcon} aria-hidden="true" style={{ color: colour }}>
                            <i className={icon} />
                            <span className={styles.fileIconBadge} style={{ backgroundColor: colour }}>{label}</span>
                          </span>

                          {/* File info */}
                          <div className={styles.fileInfo}>
                            <div className={styles.fileName}>{msg.fileName || 'File'}</div>
                            {sizeKb && <div className={styles.fileSize}>{sizeKb}</div>}
                          </div>

                          {/* Action icon */}
                          <span className={styles.downloadIcon} aria-hidden="true">
                            <i className={canPreview ? 'fas fa-eye' : 'fas fa-download'} />
                          </span>
                        </a>
                      );
                    })()}
                    {/* Text */}
                    {(!msg.type || msg.type === 'text') && (
                      <div className={styles.messageTextWrapper}>
                        <div className={`${styles.messageText} ${isSent ? styles.messageTextSent : styles.messageTextReceived} ${messageTextSpacingClass}`}>
                          {msg.content}
                        </div>
                        {msg.edited && !msg.unsent && (
                          <span className={styles.editedMarker} aria-label="edited">
                            <i className="fas fa-pen" aria-hidden="true" /> edited
                          </span>
                        )}
                        {false && ttsSupported && (
                          <button onClick={e => { e.stopPropagation(); speak(msg.id, msg.content); }}
                            className={`${styles.ttsButton} ${isSent ? styles.ttsButtonSent : styles.ttsButtonReceived} ${speakingId === msg.id ? styles.ttsButtonActive : styles.ttsButtonInactive}`}>
                            <i className={speakingId === msg.id ? 'fas fa-volume-up' : 'fas fa-volume-off'} />
                          </button>
                        )}
                      </div>
                    )}
                    {/* Timestamp */}
                    {!isGroupedWithNext && msg.type !== 'audio' && !(msg.type === 'file' && msg.fileType?.startsWith('audio/')) && (
                      <div className={`${styles.timestamp} ${msg.type === 'image' || msg.type === 'file' ? styles.timestampWithMedia : ''}`}>
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  ); // end normal bubble
                })()} {/* end unsent/emoji/normal IIFE */}

                {/* Reaction badge — absolute, overlapping bottom corner */}
                {(msg.reactions?.length ?? 0) > 0 && (
                  <ReactionBadge
                    reactions={msg.reactions!}
                    isSent={isSent}
                    currentUserId={currentUserId}
                  />
                )}
              </div>{/* end relative wrapper */}

            {/* Status */}
            {isSent && !isGroupedWithNext && (
              <div className={`${styles.statusText} ${statusClass} ${listeningMessageIds.has(msg.id) ? styles.statusListening : ''}`}
                aria-label={listeningMessageIds.has(msg.id) ? 'Recipient is listening' : `Message ${statusText.toLowerCase()}`}>
                {listeningMessageIds.has(msg.id)
                  ? <><i className={`fas fa-headphones ${styles.statusIcon}`} aria-hidden="true" />Listening...</>
                  : statusText}
              </div>
            )}

            </div>{/* end bubble column */}

          </div>
        );
      })}

      {/* Ghost Typing */}
      <AnimatedIndicator visible={!!recipientGhostText && !isRecipientTyping && !isRecipientRecording}>
        <div className={styles.ghostTypingWrapper} aria-hidden="true">
          <div className={styles.ghostTypingBubble}>
            <div className={styles.ghostTypingText}>{recipientGhostText}</div>
          </div>
        </div>
      </AnimatedIndicator>

      {/* Typing */}
      <AnimatedIndicator visible={isRecipientTyping && !recipientGhostText}>
        <div className={styles.typingIndicatorWrapper} aria-hidden="true">
          <div className={styles.typingIndicatorBubble}>
            <span className={`${styles.typingDot} ${styles.typingDot1}`} />
            <span className={`${styles.typingDot} ${styles.typingDot2}`} />
            <span className={`${styles.typingDot} ${styles.typingDot3}`} />
          </div>
        </div>
      </AnimatedIndicator>

      {/* Recording */}
      <AnimatedIndicator visible={isRecipientRecording && !isRecipientTyping && !recipientGhostText}>
        <div className={styles.typingIndicatorWrapper} aria-hidden="true">
          <div className={`${styles.typingIndicatorBubble} ${styles.typingIndicatorRecording}`}>
            <i className={`fas fa-microphone ${styles.recordingMic} ${styles.recordingMicIcon}`} aria-hidden="true" />
          </div>
        </div>
      </AnimatedIndicator>

      <div ref={endRef} />

      {/* Context menu — portalled into the fixed-height scroll container */}
      {contextMenu && portalTarget && createPortal(
        <MessageContextMenu
          state={contextMenu}
          onReaction={emoji => onReaction?.(contextMenu.message.id, emoji)}
          onReply={() => onReply?.(contextMenu.message)}
          onEdit={() => onEdit?.(contextMenu.message)}
          onUnsend={() => onUnsend?.(contextMenu.message.id)}
          onClose={() => setContextMenu(null)}
        />,
        portalTarget
      )}
    </div>
  );
}
