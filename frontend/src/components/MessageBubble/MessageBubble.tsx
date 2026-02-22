'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/contexts/ThemeContext';
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
  replyTo?: {
    id: string;
    content: string;
    senderUsername: string;
    senderDisplayName?: string | null;
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
  /** The fixed-height scroll container — the overlay will portal into this */
  overlayContainerRef?: React.RefObject<HTMLDivElement | null>;
}

const REACTIONS = ['❤️', '😂', '😯', '😢', '😡', '👍'];

interface ContextMenuState {
  message: Message;
  /** bubble rect relative to the OVERLAY container (scroll div) */
  relTop: number;
  bubbleW: number;
  bubbleH: number;
  isSent: boolean;
  borderRadius: string;
  bgColor: string;
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
      className={styles.reactionBadge}
      style={{
        bottom: '-14px',
        left:  isSent ? '6px'  : 'unset',
        right: isSent ? 'unset' : '6px',
      }}
      onClick={e => { e.stopPropagation(); setShowTip(v => !v); }}
    >
      {groups.map(g => (
        <span key={g.emoji} className={styles.reactionEmoji}>
          {g.emoji}{g.count > 1 && <span className={styles.reactionCount}>{g.count}</span>}
        </span>
      ))}
      {showTip && (
        <div
          className={styles.reactionTooltip}
          style={{ [isSent ? 'left' : 'right']: 0 }}
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
  containerH,
  containerW,
  onReaction,
  onReply,
  onUnsend,
  onClose,
}: {
  state: ContextMenuState;
  containerH: number;
  containerW: number;
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onUnsend: () => void;
  onClose: () => void;
}) {
  const { message, relTop, bubbleW, bubbleH, isSent, borderRadius, bgColor } = state;
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
  }, [closing]);

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

  const PAD = 12;

  // Cloned bubble width: same as real bubble, capped to container
  const clonedW = Math.min(bubbleW, containerW - PAD * 2);

  // Menu: compact, never wider than 220px
  const menuW = Math.min(220, containerW - PAD * 2);

  // Slide animation delta — use relTop as approximation for entry animation
  // (exact value doesn't matter much, it's just the slide-in offset)
  const fromY = relTop - containerH / 2;

  return (
    <div
      data-ctx-menu
      className={`${styles.contextOverlay} ${closing ? styles.contextOverlayClosing : ''}`}
      onClick={handleClose}
    >
      {/* Flex column stack — CSS handles equal gaps, no height estimation */}
      <div
        className={styles.contextStack}
        style={{ justifyContent: 'center' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Reactions pill ── */}
        <div
          className={`${styles.reactionsRowOuter} ${closing ? styles.reactionsRowOuterClosing : ''}`}
          style={{ justifyContent: isSent ? 'flex-end' : 'flex-start' }}
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
          className={`${styles.clonedBubble} ${closing ? styles.clonedBubbleClosing : ''}`}
          style={{
            alignSelf: isSent ? 'flex-end' : 'flex-start',
            width: clonedW,
            borderRadius,
            backgroundColor: bgColor,
            ['--bubble-from-y' as string]: `${fromY}px`,
            ['--bubble-to-y'   as string]: `${fromY}px`,
          }}
          onAnimationEnd={handleAnimationEnd}
        >
          {isAudio ? (
            <div style={{ color: '#fff', padding: '8px 12px', fontSize: 13 }}>
              <i className="fas fa-microphone" style={{ marginRight: 6 }} /> Voice message
            </div>
          ) : message.type === 'image' && message.fileUrl ? (
            <img src={message.fileUrl} alt={message.fileName || 'Image'}
              style={{ width: '100%', borderRadius, display: 'block', pointerEvents: 'none' }} />
          ) : (
            <>
              <div style={{ color: '#fff', fontSize: 14, padding: '5px 11px 2px', wordBreak: 'break-word' }}>
                {message.content}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, padding: '0 11px 5px', textAlign: isSent ? 'right' : 'left' }}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </>
          )}
        </div>

        {/* ── Action menu ── */}
        <div
          className={`${styles.actionMenu} ${closing ? styles.actionMenuClosing : ''}`}
          style={{
            alignSelf: isSent ? 'flex-end' : 'flex-start',
            width: menuW,
          }}
        >
          <button className={styles.actionItem} onClick={() => { onReply(); handleClose(); }}>
            <i className="fas fa-reply" style={{ marginRight: 10, opacity: 0.7 }} /> Reply
          </button>
          {isSent && (
            <button className={`${styles.actionItem} ${styles.actionItemDanger}`}
              onClick={() => { onUnsend(); handleClose(); }}>
              <i className="fas fa-trash" style={{ marginRight: 10, opacity: 0.7 }} /> Unsend
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
  overlayContainerRef,
}: MessageBubbleProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const defaultRef = useRef<HTMLDivElement>(null);
  const endRef = messagesEndRef || defaultRef;
  const { speak, speakingId, supported: ttsSupported } = useTTS();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTarget = useRef<HTMLElement | null>(null);

  const getStatusInfo = (status: Message['status'], type?: Message['type']) => {
    let statusColor = '#94a3b8'; let statusText = 'Pending';
    if (status === 'queued')     { statusColor = '#f59e0b'; statusText = 'Queued'; }
    else if (status === 'sending')   { statusColor = '#3b82f6'; statusText = 'Sending'; }
    else if (status === 'sent')      { statusColor = '#10b981'; statusText = 'Sent'; }
    else if (status === 'delivered') { statusColor = '#10b981'; statusText = 'Delivered'; }
    else if (status === 'read') {
      statusColor = '#3b82f6';
      statusText = type === 'audio' ? 'Listened' : (type === 'image' || type === 'file') ? 'Viewed' : 'Read';
    } else if (status === 'failed')  { statusColor = '#ef4444'; statusText = 'Failed'; }
    return { statusColor, statusText };
  };

  const getBorderRadius = (isSent: boolean, gPrev: boolean, gNext: boolean): string => {
    if (isSent) {
      if (gPrev && gNext) return '12px 4px 4px 12px';
      if (gPrev) return '12px 4px 12px 12px';
      if (gNext) return '12px 12px 4px 12px';
      return '12px';
    } else {
      if (gPrev && gNext) return '4px 12px 12px 4px';
      if (gPrev) return '4px 12px 12px 12px';
      if (gNext) return '12px 12px 12px 4px';
      return '12px';
    }
  };

  const openMenu = useCallback((
    el: HTMLElement, msg: Message, isSent: boolean, borderRadius: string, bgColor: string,
  ) => {
    const container = overlayContainerRef?.current;
    if (!container) return;
    const bubbleRect    = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    // Visual position of bubble top relative to the overlay container top
    const relTop = bubbleRect.top - containerRect.top;
    setContextMenu({
      message: msg, relTop,
      bubbleW: bubbleRect.width, bubbleH: bubbleRect.height,
      isSent, borderRadius, bgColor,
    });
  }, [overlayContainerRef]);

  const startLongPress = useCallback((
    e: React.TouchEvent | React.MouseEvent,
    msg: Message, isSent: boolean, borderRadius: string, bgColor: string,
  ) => {
    longPressTarget.current = e.currentTarget as HTMLElement;
    longPressTimer.current = setTimeout(() => {
      if (longPressTarget.current) openMenu(longPressTarget.current, msg, isSent, borderRadius, bgColor);
    }, 500);
  }, [openMenu]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    longPressTarget.current = null;
  }, []);

  // Dimensions of the overlay container for layout maths
  // overlayRef is the zero-padding absolute div = full chat pane dimensions
  const overlayEl = overlayContainerRef?.current;
  const containerW = overlayEl?.clientWidth  ?? 400;
  const containerH = overlayEl?.clientHeight ?? 600;

  // Portal target: the overlay div (pointer-events:none wrapper, overlay re-enables them)
  const portalTarget = overlayEl ?? (typeof document !== 'undefined' ? document.body : null);

  return (
    <div className={styles.messagesContainer}>
      {messages.map((msg, index) => {
        const isSent = msg.direction === 'sent';
        const { statusColor, statusText } = getStatusInfo(msg.status, msg.type);
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
        const isGroupedWithPrev = !!(prevMsg && prevMsg.direction === msg.direction);
        const isGroupedWithNext = !!(nextMsg && nextMsg.direction === msg.direction);
        const borderRadius = getBorderRadius(isSent, isGroupedWithPrev, isGroupedWithNext);
        const bgColor = isSent ? (msg.status === 'queued' ? '#2563eb' : '#3b82f6') : '#f97316';

        // Prefer displayName, fall back to username without @
        const senderDisplayName = msg.senderDisplayName || (msg.senderUsername || '').replace(/^@/, '') || 'Unknown';
        // Initials for avatar fallback
        const initials = senderDisplayName.slice(0, 2).toUpperCase() || '??';

        const hasReactions = (msg.reactions?.length ?? 0) > 0;
        const bottomMargin = hasReactions
          ? '22px'                           // always enough room for the badge
          : isGroupedWithNext
          ? '1px'                            // tight grouping, no badge
          : '8px';                           // last in group / solo

        return (
          <div key={msg.id} className={styles.messageWrapper}
            style={{
              alignItems: isSent ? 'flex-end' : 'flex-start',
              marginBottom: bottomMargin,
              flexDirection: 'row',
              display: 'flex',
              justifyContent: isSent ? 'flex-end' : 'flex-start',
            }}>

            {/* Received: avatar column (left side) */}
            {!isSent && (
              <div style={{ width: 28, flexShrink: 0, alignSelf: 'flex-end', marginRight: 6, marginBottom: 2 }}>
                {/* Only show avatar on last bubble of a group (or solo) */}
                {!isGroupedWithNext && (
                  msg.senderProfileImage ? (
                    <img
                      src={msg.senderProfileImage}
                      alt={senderDisplayName}
                      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      backgroundColor: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700, color: '#fff',
                    }}>
                      {initials}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Bubble column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isSent ? 'flex-end' : 'flex-start', maxWidth: msg.type === 'audio' ? 'none' : msg.type === 'image' ? '300px' : '70%' }}>

              {/* Sender name — only on first bubble in a received group */}
              {!isSent && !isGroupedWithPrev && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '3px', paddingLeft: '4px' }}>
                  {senderDisplayName}
                </span>
              )}

              {/* ── Reply quote — above the bubble, outside it ── */}
              {msg.replyTo && (
                <div style={{
                  alignSelf: isSent ? 'flex-end' : 'flex-start',
                  maxWidth: '100%',
                  marginTop: '16px',
                  marginBottom: '2px',
                  paddingLeft: isSent ? '0' : '4px',
                  paddingRight: isSent ? '4px' : '0',
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'stretch',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                    maxWidth: '100%',
                  }}>
                    {/* Accent bar */}
                    <div style={{
                      width: '3px',
                      flexShrink: 0,
                      backgroundColor: isSent ? '#93c5fd' : '#fdba74',
                    }} />
                    <div style={{ padding: '5px 10px', minWidth: 0 }}>
                      <div style={{
                        fontSize: '11px', fontWeight: 700,
                        color: isSent ? '#93c5fd' : '#fdba74',
                        marginBottom: '2px', whiteSpace: 'nowrap',
                      }}>
                        {msg.replyTo.senderUsername === 'You'
                          ? 'You'
                          : msg.replyTo.senderDisplayName || msg.replyTo.senderUsername?.replace(/^@/, '') || 'Unknown'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: '240px',
                      }}>
                        {msg.replyTo.content}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bubble + reaction badge */}
              <div style={{ position: 'relative', display: 'inline-block', width: msg.type === 'audio' ? 'fit-content' : 'auto', maxWidth: '100%' }}>
            <div
              className={styles.messageBubble}
              style={{
                maxWidth: '100%',
                width: 'auto',
                padding: msg.type === 'audio' ? '2px' : (!msg.type || msg.type === 'text') ? '5px 11px' : '4px',
                borderRadius, backgroundColor: bgColor,
                userSelect: 'none', WebkitUserSelect: 'none',
              }}
              onContextMenu={e => { e.preventDefault(); openMenu(e.currentTarget, msg, isSent, borderRadius, bgColor); }}
              onTouchStart={e => startLongPress(e, msg, isSent, borderRadius, bgColor)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onMouseDown={e => { if (e.button === 0) startLongPress(e, msg, isSent, borderRadius, bgColor); }}
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
                <div style={{ position: 'relative' }}>
                  <div className={styles.messageText}
                    style={{ marginBottom: !isGroupedWithNext ? '4px' : '0', textAlign: isSent ? 'right' : 'left' }}>
                    {msg.content}
                  </div>
                  {false && ttsSupported && (
                    <button onClick={e => { e.stopPropagation(); speak(msg.id, msg.content); }}
                      style={{ position: 'absolute', top: '50%', right: isSent ? 'unset' : '-2px', left: isSent ? '-2px' : 'unset', transform: 'translateY(-60%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1, color: speakingId === msg.id ? '#ffffff' : 'rgba(255,255,255,0.45)', fontSize: '11px' }}>
                      <i className={speakingId === msg.id ? 'fas fa-volume-up' : 'fas fa-volume-off'} />
                    </button>
                  )}
                </div>
              )}
              {/* Timestamp */}
              {!isGroupedWithNext && msg.type !== 'audio' && !(msg.type === 'file' && msg.fileType?.startsWith('audio/')) && (
                <div className={styles.timestamp} style={{ padding: msg.type === 'image' || msg.type === 'file' ? '4px' : '0' }}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              )}
            </div>{/* end messageBubble */}

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
              <div className={styles.statusText} style={{ color: listeningMessageIds.has(msg.id) ? '#8b5cf6' : statusColor }}>
                {listeningMessageIds.has(msg.id)
                  ? <><i className="fas fa-headphones" style={{ marginRight: '3px' }} />Listening...</>
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
          <div className={styles.ghostTypingBubble} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: `1px dashed ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>
            <div className={styles.ghostTypingText}>{recipientGhostText}</div>
          </div>
        </div>
      )}
      {/* Typing */}
      {isRecipientTyping && !recipientGhostText && (
        <div className={styles.typingIndicatorWrapper}>
          <div className={styles.typingIndicatorBubble} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
            <span className={styles.typingDot} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)', animationName: styles.typingDot1 }} />
            <span className={styles.typingDot} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)', animationName: styles.typingDot2 }} />
            <span className={styles.typingDot} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)', animationName: styles.typingDot3 }} />
          </div>
        </div>
      )}
      {/* Recording */}
      {isRecipientRecording && !isRecipientTyping && !recipientGhostText && (
        <div className={styles.typingIndicatorWrapper}>
          <div className={styles.typingIndicatorBubble} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className={`fas fa-microphone ${styles.recordingMic}`} style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)' }} />
          </div>
        </div>
      )}

      <div ref={endRef} />

      {/* Context menu — portalled into the fixed-height scroll container */}
      {contextMenu && portalTarget && createPortal(
        <MessageContextMenu
          state={contextMenu}
          containerH={containerH}
          containerW={containerW}
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
