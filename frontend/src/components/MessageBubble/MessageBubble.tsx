'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MessageAudioPlayer from '@/components/MessageAudioPlayer/MessageAudioPlayer';
import { useTTS } from '@/hooks/useTTS';
import styles from './MessageBubble.module.css';

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
  onUnsend?: (messageId: string) => void;
  onReplyQuoteClick?: (messageId: string) => void;
  /** The fixed-height scroll container — the overlay will portal into this */
  overlayContainerRef?: React.RefObject<HTMLDivElement | null>;
}

const REACTIONS = ['❤️', '😂', '😯', '😢', '😡', '👍'];

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
  const tipLines = groups.map(g => `${g.names.join(', ')} ${g.emoji}`).join(' · ');

  return (
    <div
      className={`${styles.reactionBadge} ${isSent ? styles.reactionBadgeSent : styles.reactionBadgeReceived}`}
      onClick={e => { e.stopPropagation(); setShowTip(v => !v); }}
    >
      {groups.map(g => (
        <span key={g.emoji} className={styles.reactionEmoji}>
          {g.emoji}{g.count > 1 && <span className={styles.reactionCount}>{g.count}</span>}
        </span>
      ))}
      {showTip && (
        <div
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
  onUnsend,
  onClose,
}: {
  state: ContextMenuState;
  onReaction: (emoji: string) => void;
  onReply: () => void;
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
    const id = setTimeout(() => {
      const handler = (e: MouseEvent | TouchEvent) => {
        const el = e.target as HTMLElement;
        if (el.closest('[data-ctx-menu]')) return;
        handleClose();
      };
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
      return () => {
        document.removeEventListener('mousedown', handler);
        document.removeEventListener('touchstart', handler);
      };
    }, 60);
    return () => clearTimeout(id);
  }, [handleClose]);

  const isAudio = message.type === 'audio' || (message.type === 'file' && message.fileType?.startsWith('audio/'));

  return (
    <div
      data-ctx-menu
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
          <button className={styles.actionItem} onClick={() => { onReply(); handleClose(); }}>
            <i className={`fas fa-reply ${styles.actionIcon}`} /> Reply
          </button>
          {isSent && (
            <button className={`${styles.actionItem} ${styles.actionItemDanger}`}
              onClick={() => { onUnsend(); handleClose(); }}>
              <i className={`fas fa-trash ${styles.actionIcon}`} /> Unsend
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
        // Initials for avatar fallback
        const initials = senderDisplayName.slice(0, 2).toUpperCase() || '??';

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
            className={`${styles.messageWrapper} ${isSent ? styles.messageWrapperSent : styles.messageWrapperReceived} ${wrapperMarginClass} ${wrapperHighlightClass}`}>

            {/* Received: avatar column (left side) */}
            {!isSent && (
              <div className={styles.avatarColumn}>
                {/* Only show avatar on last bubble of a group (or solo) */}
                {!isGroupedWithNext && (
                  msg.senderProfileImage ? (
                    <img
                      src={msg.senderProfileImage}
                      alt={senderDisplayName}
                      className={styles.avatarImage}
                    />
                  ) : (
                    <div className={styles.avatarInitials}>
                      {initials}
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
                ) : (
                  <div
                    className={`${styles.messageBubble} ${radiusClass} ${bubbleToneClass} ${msg.type === 'audio' ? styles.bubblePaddingAudio : (!msg.type || msg.type === 'text') ? styles.bubblePaddingText : styles.bubblePaddingMedia}`}
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
                        <img src={msg.fileUrl} alt={msg.fileName || 'Image'} className={styles.messageImage}
                          onClick={() => { if (onImageClick) onImageClick(msg.fileUrl!, msg.fileName || ''); }} />
                        {msg.fileName && <div className={styles.imageFileName}><i className="fas fa-camera" /> {msg.fileName}</div>}
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
                    {msg.type === 'file' && !msg.fileType?.startsWith('audio/') && msg.fileUrl && (
                      <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                        <span className={styles.fileIcon}><i className="fas fa-file" /></span>
                        <div className={styles.fileInfo}>
                          <div className={styles.fileName}>{msg.fileName || 'File'}</div>
                          {msg.fileSize && <div className={styles.fileSize}>{(msg.fileSize / 1024).toFixed(2)} KB</div>}
                        </div>
                        <span className={styles.downloadIcon}><i className="fas fa-download" /></span>
                      </a>
                    )}
                    {/* Text */}
                    {(!msg.type || msg.type === 'text') && (
                      <div className={styles.messageTextWrapper}>
                        <div className={`${styles.messageText} ${isSent ? styles.messageTextSent : styles.messageTextReceived} ${messageTextSpacingClass}`}>
                          {msg.content}
                        </div>
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
                )}{/* end unsent ternary */}

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
              <div className={`${styles.statusText} ${statusClass} ${listeningMessageIds.has(msg.id) ? styles.statusListening : ''}`}>
                {listeningMessageIds.has(msg.id)
                  ? <><i className={`fas fa-headphones ${styles.statusIcon}`} />Listening...</>
                  : statusText}
              </div>
            )}

            </div>{/* end bubble column */}

          </div>
        );
      })}

      {/* Ghost Typing */}
      {recipientGhostText && (
        <div className={styles.ghostTypingWrapper}>
          <div className={styles.ghostTypingBubble}>
            <div className={styles.ghostTypingText}>{recipientGhostText}</div>
          </div>
        </div>
      )}
      {/* Typing */}
      {isRecipientTyping && !recipientGhostText && (
        <div className={styles.typingIndicatorWrapper}>
          <div className={styles.typingIndicatorBubble}>
            <span className={`${styles.typingDot} ${styles.typingDot1}`} />
            <span className={`${styles.typingDot} ${styles.typingDot2}`} />
            <span className={`${styles.typingDot} ${styles.typingDot3}`} />
          </div>
        </div>
      )}
      {/* Recording */}
      {isRecipientRecording && !isRecipientTyping && !recipientGhostText && (
        <div className={styles.typingIndicatorWrapper}>
          <div className={`${styles.typingIndicatorBubble} ${styles.typingIndicatorRecording}`}>
            <i className={`fas fa-microphone ${styles.recordingMic} ${styles.recordingMicIcon}`} />
          </div>
        </div>
      )}

      <div ref={endRef} />

      {/* Context menu — portalled into the fixed-height scroll container */}
      {contextMenu && portalTarget && createPortal(
        <MessageContextMenu
          state={contextMenu}
          onReaction={emoji => onReaction?.(contextMenu.message.id, emoji)}
          onReply={() => onReply?.(contextMenu.message)}
          onUnsend={() => onUnsend?.(contextMenu.message.id)}
          onClose={() => setContextMenu(null)}
        />,
        portalTarget
      )}
    </div>
  );
}
