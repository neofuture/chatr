'use client';

import { useRef, useState } from 'react';
import ChatView from '@/components/messaging/ChatView';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import MessageInput from '@/components/messaging/MessageInput/MessageInput';
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
  activeAudioMessageId?: string | null;
  onReaction?: (messageId: string, emoji: string) => void;
  onUnsend?: (messageId: string) => void;
  currentUserId?: string;
  onReply?: (message: Message) => void;
  replyingTo?: Message | null;
  clearReply?: () => void;
  editingMessage?: Message | null;
  onStartEdit?: (message: Message) => void;
  onCancelEdit?: () => void;
  onEditLastSent?: () => void;
  // Message send props
  effectivelyOnline: boolean;
  uploadingFile: boolean;
  testMessage: string;
  testRecipientId: string;
  selectedFile: File | null;              // kept for back-compat (unused)
  selectedFiles: File[];
  filePreviewUrl: string | null;           // kept for back-compat (unused)
  filePreviews: (string | null)[];
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMessageSend: () => void;
  /** Called with the emoji string to insert at cursor */
  onEmojiInsert: (emoji: string) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileSend: () => void;
  onFileCancelSelection: () => void;
  onFileCancelOne: (index: number) => void;
  onVoiceRecording: (blob: Blob, waveform: number[]) => void;
  onVoiceRecordingStart: () => void;
  onVoiceRecordingStop: () => void;
  ghostTypingEnabled: boolean;
  onGhostTypingToggle: (val: boolean) => void;
}

export default function ConversationsColumn({
  isDark, messages, messageQueue, messagesEndRef,
  isRecipientTyping, isRecipientRecording, recipientGhostText,
  listeningMessageIds, logCount, onClear, onOpenLogs, onImageClick, onAudioPlayStatusChange,
  activeAudioMessageId, onReaction, onUnsend, currentUserId,
  onReply, replyingTo, clearReply,
  editingMessage, onStartEdit, onCancelEdit, onEditLastSent,
  effectivelyOnline, uploadingFile, testMessage, testRecipientId,
  selectedFiles, filePreviews,
  onMessageChange, onMessageSend, onEmojiInsert, onFileSelect, onFileSend, onFileCancelSelection, onFileCancelOne,
  onVoiceRecording, onVoiceRecordingStart, onVoiceRecordingStop,
  ghostTypingEnabled, onGhostTypingToggle,
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
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Ghost Typing toggle */}
          <label title="Ghost Typing" style={{
            display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
            fontSize: '12px', opacity: ghostTypingEnabled ? 1 : 0.5,
            color: ghostTypingEnabled ? '#8b5cf6' : 'inherit',
          }}>
            <i className="fas fa-ghost" />
            <span style={{ fontSize: '11px', fontWeight: '600' }}>Ghost</span>
            <div style={{ position: 'relative', display: 'inline-block', width: '32px', height: '18px' }}>
              <input type="checkbox" checked={ghostTypingEnabled} onChange={(e) => onGhostTypingToggle(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: 'pointer',
                backgroundColor: ghostTypingEnabled ? '#8b5cf6' : '#94a3b8',
                transition: '0.2s', borderRadius: '18px',
              }}>
                <span style={{ position: 'absolute', height: '13px', width: '13px', left: ghostTypingEnabled ? '16px' : '2px', bottom: '2px', backgroundColor: 'white', transition: '0.2s', borderRadius: '50%' }} />
              </span>
            </div>
          </label>
          {/* Theme toggle (no label) */}
          <ThemeToggle showLabel={false} />
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
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
          activeAudioMessageId={activeAudioMessageId}
          onReaction={onReaction}
          onUnsend={onUnsend}
          onReply={onReply}
          onEdit={onStartEdit}
          currentUserId={currentUserId}
        />
      </div>

      {/* Message Input (reply banner + edit banner + file preview + input bar) */}
      <MessageInput
        isDark={isDark}
        recipientId={testRecipientId}
        message={testMessage}
        effectivelyOnline={effectivelyOnline}
        uploadingFile={uploadingFile}
        selectedFiles={selectedFiles}
        filePreviews={filePreviews}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onMessageChange={onMessageChange}
        onMessageSend={onMessageSend}
        onEmojiInsert={onEmojiInsert}
        onFileSelect={onFileSelect}
        onFileSend={onFileSend}
        onFileCancelSelection={onFileCancelSelection}
        onFileCancelOne={onFileCancelOne}
        onVoiceRecording={onVoiceRecording}
        onVoiceRecordingStart={onVoiceRecordingStart}
        onVoiceRecordingStop={onVoiceRecordingStop}
        onCancelReply={clearReply}
        onCancelEdit={onCancelEdit}
        onEditLastSent={onEditLastSent}
      />
    </div>
  );
}
