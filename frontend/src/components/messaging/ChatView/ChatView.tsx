'use client';

/**
 * ChatView — reusable message thread component.
 * Used on the /test page today; will be the main chat window when messaging is built out.
 */

import MessageBubble, { type Message } from '@/components/MessageBubble';

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
  /** Optional: show a clear button in the header */
  showClearButton?: boolean;
  onClear?: () => void;
  /** Optional queue badge count */
  queuedCount?: number;
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
  showClearButton,
  onClear,
  queuedCount = 0,
}: ChatViewProps) {
  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      {(showClearButton || queuedCount > 0) && (
        <div style={{
          minHeight: '48px', flexShrink: 0, padding: '8px 20px',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ fontWeight: '600' }}><i className="fas fa-comments" /> Messages</span>
            <span style={{ marginLeft: '8px', fontSize: '14px', opacity: 0.7 }}>({messages.length})</span>
            {queuedCount > 0 && (
              <span style={{
                marginLeft: '8px', fontSize: '12px', padding: '2px 8px',
                backgroundColor: '#f59e0b', color: '#fff', borderRadius: '12px', fontWeight: '600',
              }}>{queuedCount} queued</span>
            )}
          </div>
          {showClearButton && onClear && (
            <button onClick={onClear} style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              backgroundColor: '#ef4444', color: '#fff', fontSize: '14px',
            }}><i className="fas fa-trash" /> Clear</button>
          )}
        </div>
      )}

      {/* Message list */}
      <div style={{
        flex: '1 1 0', height: 0, overflowY: 'auto', overflowX: 'hidden',
        padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', opacity: 0.6 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}><i className="fas fa-comments" /></div>
              <div style={{ fontSize: '14px' }}>No messages yet</div>
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
          />
        )}
      </div>
    </div>
  );
}

