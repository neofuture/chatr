'use client';

import { useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import MessageAudioPlayer from '@/components/MessageAudioPlayer/MessageAudioPlayer';
import styles from './MessageBubble.module.css';

export interface Message {
  id: string;
  content: string;
  senderId: string;
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
}

interface MessageBubbleProps {
  messages: Message[];
  isRecipientTyping?: boolean;
  isRecipientRecording?: boolean;
  recipientGhostText?: string;
  onImageClick?: (imageUrl: string, imageName: string) => void;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
  onAudioPlayStatusChange?: (messageId: string, senderId: string, isPlaying: boolean, isEnded?: boolean) => void;
  listeningMessageIds?: Set<string>; // messageIds currently being listened to by recipient
  /** The single audio message ID that is currently active (playing). All others will be paused. */
  activeAudioMessageId?: string | null;
}

export default function MessageBubble({
  messages,
  isRecipientTyping = false,
  isRecipientRecording = false,
  recipientGhostText = '',
  onImageClick,
  messagesEndRef,
  onAudioPlayStatusChange,
  listeningMessageIds = new Set(),
  activeAudioMessageId,
}: MessageBubbleProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const defaultRef = useRef<HTMLDivElement>(null);
  const endRef = messagesEndRef || defaultRef;

  const getStatusInfo = (status: Message['status'], type?: Message['type']) => {
    let statusColor = '#94a3b8';
    let statusText = 'Pending';

    if (status === 'queued') {
      statusColor = '#f59e0b';
      statusText = 'Queued';
    } else if (status === 'sending') {
      statusColor = '#3b82f6';
      statusText = 'Sending';
    } else if (status === 'sent') {
      statusColor = '#10b981';
      statusText = 'Sent';
    } else if (status === 'delivered') {
      statusColor = '#10b981';
      statusText = 'Delivered';
    } else if (status === 'read') {
      statusColor = '#3b82f6';
      // Show "Listened" for audio, "Viewed" for images/files, "Read" for text
      if (type === 'audio') {
        statusText = 'Listened';
      } else if (type === 'image' || type === 'file') {
        statusText = 'Viewed';
      } else {
        statusText = 'Read';
      }
    } else if (status === 'failed') {
      statusColor = '#ef4444';
      statusText = 'Failed';
    }

    return { statusColor, statusText };
  };

  const getBorderRadius = (
    isSent: boolean,
    isGroupedWithPrev: boolean,
    isGroupedWithNext: boolean
  ): string => {
    if (isSent) {
      // Sent messages (right side)
      if (isGroupedWithPrev && isGroupedWithNext) {
        return '12px 4px 4px 12px'; // Middle message
      } else if (isGroupedWithPrev) {
        return '12px 4px 12px 12px'; // Last in group
      } else if (isGroupedWithNext) {
        return '12px 12px 4px 12px'; // First in group
      } else {
        return '12px'; // Single message
      }
    } else {
      // Received messages (left side)
      if (isGroupedWithPrev && isGroupedWithNext) {
        return '4px 12px 12px 4px'; // Middle message
      } else if (isGroupedWithPrev) {
        return '4px 12px 12px 12px'; // Last in group
      } else if (isGroupedWithNext) {
        return '12px 12px 12px 4px'; // First in group
      } else {
        return '12px'; // Single message
      }
    }
  };

  return (
    <div className={styles.messagesContainer}>
      {messages.map((msg, index) => {
        const isSent = msg.direction === 'sent';
        const { statusColor, statusText } = getStatusInfo(msg.status, msg.type);

        // Check if previous/next message is from same sender for grouping
        const prevMsg = index > 0 ? messages[index - 1] : null;
        const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
        const isGroupedWithPrev = !!(prevMsg && prevMsg.direction === msg.direction);
        const isGroupedWithNext = !!(nextMsg && nextMsg.direction === msg.direction);

        const borderRadius = getBorderRadius(isSent, isGroupedWithPrev, isGroupedWithNext);

        return (
          <div
            key={msg.id}
            className={styles.messageWrapper}
            style={{
              alignItems: isSent ? 'flex-end' : 'flex-start',
              marginBottom: isGroupedWithNext ? '1px' : '8px',
            }}
          >
            <div
              className={styles.messageBubble}
              style={{
                maxWidth: msg.type === 'audio' ? 'none' : msg.type === 'image' ? '300px' : '70%',
                width: msg.type === 'audio' ? 'fit-content' : 'auto',
                padding: msg.type === 'audio' ? '2px' : msg.type === 'text' || !msg.type ? '5px 11px' : '4px',
                borderRadius,
                backgroundColor: isSent
                  ? (msg.status === 'queued' ? '#2563eb' : '#3b82f6')
                  : '#f97316',
              }}
            >
              {/* Image Message */}
              {msg.type === 'image' && msg.fileUrl && (
                <div>
                  <img
                    src={msg.fileUrl}
                    alt={msg.fileName || 'Image'}
                    className={styles.messageImage}
                    onClick={() => {
                      if (onImageClick) {
                        onImageClick(msg.fileUrl!, msg.fileName || '');
                      }
                    }}
                  />
                  {msg.fileName && (
                    <div className={styles.imageFileName}>
                      <i className="fas fa-camera"></i> {msg.fileName}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Message - Voice Note Player */}
              {(msg.type === 'audio' || (msg.type === 'file' && msg.fileType?.startsWith('audio/'))) && msg.fileUrl && (
                <MessageAudioPlayer
                  audioUrl={msg.fileUrl}
                  duration={msg.duration || 0}
                  waveformData={msg.waveformData || []}
                  timestamp={msg.timestamp}
                  isSent={isSent}
                  messageId={msg.id}
                  senderId={msg.senderId}
                  onPlayStatusChange={onAudioPlayStatusChange}
                  status={msg.status}
                  isListening={listeningMessageIds.has(msg.id)}
                  isActivePlayer={activeAudioMessageId !== undefined ? activeAudioMessageId === msg.id : undefined}
                />
              )}

              {/* File Message - Only for non-audio files */}
              {msg.type === 'file' && !msg.fileType?.startsWith('audio/') && msg.fileUrl && (
                <a
                  href={msg.fileUrl}
                  download={msg.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.fileLink}
                >
                  <span className={styles.fileIcon}><i className="fas fa-file"></i></span>
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName}>
                      {msg.fileName || 'File'}
                    </div>
                    {msg.fileSize && (
                      <div className={styles.fileSize}>
                        {(msg.fileSize / 1024).toFixed(2)} KB
                      </div>
                    )}
                  </div>
                  <span className={styles.downloadIcon}><i className="fas fa-download"></i></span>
                </a>
              )}

              {/* Text Message */}
              {(!msg.type || msg.type === 'text') && (
                <div
                  className={styles.messageText}
                  style={{
                    marginBottom: (!isGroupedWithNext) ? '4px' : '0',
                    textAlign: isSent ? 'right' : 'left',
                  }}
                >
                  {msg.content}
                </div>
              )}

              {/* Only show timestamp on last message in group - except for audio which has its own time display */}
              {!isGroupedWithNext && msg.type !== 'audio' && !(msg.type === 'file' && msg.fileType?.startsWith('audio/')) && (
                <div
                  className={styles.timestamp}
                  style={{
                    padding: msg.type === 'image' || msg.type === 'file' ? '4px' : '0',
                  }}
                >
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Status text under message - only on last message in group */}
            {isSent && !isGroupedWithNext && (
              <div
                className={styles.statusText}
                style={{
                  color: listeningMessageIds.has(msg.id)
                    ? '#8b5cf6'
                    : statusColor,
                }}
              >
                {listeningMessageIds.has(msg.id) ? (
                  <><i className="fas fa-headphones" style={{ marginRight: '3px' }}></i>Listening...</>
                ) : (
                  statusText
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Ghost Typing Bubble - shows what recipient is typing */}
      {recipientGhostText && (
        <div className={styles.ghostTypingWrapper}>
          <div
            className={styles.ghostTypingBubble}
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              border: `1px dashed ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
              color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
            }}
          >
            <div className={styles.ghostTypingText}>
              {recipientGhostText}
            </div>
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {isRecipientTyping && !recipientGhostText && (
        <div className={styles.typingIndicatorWrapper}>
          <div
            className={styles.typingIndicatorBubble}
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            }}
          >
            <span
              className={styles.typingDot}
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)',
                animationName: styles.typingDot1,
              }}
            />
            <span
              className={styles.typingDot}
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)',
                animationName: styles.typingDot2,
              }}
            />
            <span
              className={styles.typingDot}
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)',
                animationName: styles.typingDot3,
              }}
            />
          </div>
        </div>
      )}

      {/* Recording Indicator - shown when recipient is recording a voice note */}
      {isRecipientRecording && !isRecipientTyping && !recipientGhostText && (
        <div className={styles.typingIndicatorWrapper}>
          <div
            className={styles.typingIndicatorBubble}
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i
              className={`fas fa-microphone ${styles.recordingMic}`}
              style={{
                color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)',
              }}
            />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}

