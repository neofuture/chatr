'use client';

import ChatView from '@/components/messaging/ChatView';
import type { Message } from '@/components/MessageBubble';

interface Props {
  isDark: boolean;
  messages: Message[];
  messageQueue: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isRecipientTyping: boolean;
  isRecipientRecording: boolean;
  recipientGhostText: string;
  listeningMessageIds: Set<string>;
  logCount: number;
  onClear: () => void;
  onOpenLogs: () => void;
  onImageClick: (url: string, name: string) => void;
  onAudioPlayStatusChange: (messageId: string, senderId: string, isPlaying: boolean, isEnded?: boolean) => void;
}

export default function ConversationsColumn({
  isDark, messages, messageQueue, messagesEndRef,
  isRecipientTyping, isRecipientRecording, recipientGhostText,
  listeningMessageIds, logCount, onClear, onOpenLogs, onImageClick, onAudioPlayStatusChange,
}: Props) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, padding: '0 16px', minHeight: '49px',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-comments" style={{ color: '#3b82f6', fontSize: '14px' }} />
          <span style={{ fontWeight: '600', fontSize: '14px' }}>Conversation</span>
          <span style={{
            fontSize: '11px', padding: '1px 7px', borderRadius: '12px',
            backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
            color: '#3b82f6', fontWeight: '600',
          }}>{messages.length}</span>
          {messageQueue.length > 0 && (
            <span style={{
              fontSize: '11px', padding: '1px 7px', borderRadius: '12px',
              backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: '600',
            }}>{messageQueue.length} queued</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {/* System logs button */}
          <button onClick={onOpenLogs} title="System Logs" style={{
            padding: '5px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '12px',
            backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
            color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '5px', position: 'relative',
          }}>
            <i className="fas fa-list-alt" />
            {logCount > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: '#3b82f6', color: '#fff',
                fontSize: '9px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{logCount > 99 ? '99+' : logCount}</span>
            )}
          </button>
          {/* Clear */}
          <button onClick={onClear} title="Clear messages" style={{
            padding: '5px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer',
            backgroundColor: '#ef4444', color: '#fff', fontSize: '12px',
          }}><i className="fas fa-trash" /></button>
        </div>
      </div>

      {/* Message thread */}
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
      />
    </div>
  );
}
