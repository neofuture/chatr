'use client';

import { useRef, useState } from 'react';
import ChatView from '@/components/messaging/ChatView';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import VoiceRecorder from '@/components/VoiceRecorder';
import EmojiPicker from '@/components/EmojiPicker/EmojiPicker';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const inputBg    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const sendBg     = effectivelyOnline ? '#f97316' : '#64748b';

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

      {/* Message thread — fills remaining space */}
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

      {/* Reply banner */}
      {replyingTo && (
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 16px',
          backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
          borderTop: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'}`,
          borderLeft: '3px solid #3b82f6',
        }}>
          <i className="fas fa-reply" style={{ color: '#3b82f6', fontSize: '13px', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', marginBottom: '2px' }}>
              {(() => {
                const name = replyingTo.senderDisplayName || (replyingTo.senderUsername || '').replace(/^@/, '');
                if (!name || name === 'You') return 'Replying to yourself';
                return `Replying to ${name}`;
              })()}
            </div>
            <div style={{
              fontSize: '12px',
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {replyingTo.content}
            </div>
          </div>
          <button onClick={clearReply} title="Cancel reply" style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
            fontSize: '14px', flexShrink: 0,
          }}>
            <i className="fas fa-times" />
          </button>
        </div>
      )}

      {/* Edit banner */}
      {editingMessage && (
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 16px',
          backgroundColor: isDark ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)',
          borderTop: `1px solid ${isDark ? 'rgba(249,115,22,0.3)' : 'rgba(249,115,22,0.2)'}`,
          borderLeft: '3px solid #f97316',
        }}>
          <i className="fas fa-pen" style={{ color: '#f97316', fontSize: '13px', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#f97316', marginBottom: '2px' }}>
              Editing message
            </div>
            <div style={{
              fontSize: '12px',
              color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {editingMessage.content}
            </div>
          </div>
          <button onClick={onCancelEdit} title="Cancel edit" style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
            fontSize: '14px', flexShrink: 0,
          }}>
            <i className="fas fa-times" />
          </button>
        </div>
      )}

      {/* File preview strip — multi-file */}
      {selectedFiles.length > 0 && (
        <div style={{
          flexShrink: 0, padding: '10px 16px',
          backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
          borderTop: '1px solid #3b82f6',
        }}>
          {/* Scrollable row of file chips */}
          <div style={{
            display: 'flex', gap: '8px',
            overflowX: 'auto', overflowY: 'visible',
            paddingBottom: '8px', paddingTop: '10px',
            scrollbarWidth: 'thin',
          }}>
            {selectedFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} style={{
                flexShrink: 0, position: 'relative',
                width: '72px',
                overflow: 'visible',
              }}>
                {/* Thumbnail / icon */}
                {filePreviews[idx] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={filePreviews[idx]!} alt={file.name}
                    style={{ width: '72px', height: '72px', borderRadius: '8px', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: '4px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                  }}>
                    {(() => {
                      const t = file.type;
                      const n = file.name.toLowerCase();
                      if (t.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|weba|webm)$/.test(n))
                        return <><i className="fad fa-waveform-lines" style={{ fontSize: '22px', color: '#a855f7' }} /><span style={{ fontSize: '9px', color: '#a855f7', fontWeight: 700, letterSpacing: '0.05em' }}>AUDIO</span></>;
                      if (t === 'application/pdf' || n.endsWith('.pdf'))
                        return <><i className="fas fa-file-pdf" style={{ fontSize: '22px', color: '#ef4444' }} /><span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 700 }}>PDF</span></>;
                      if (t.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/.test(n))
                        return <><i className="fas fa-file-video" style={{ fontSize: '22px', color: '#f59e0b' }} /><span style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 700 }}>VIDEO</span></>;
                      if (t.includes('zip') || t.includes('archive') || /\.(zip|rar|7z|tar|gz)$/.test(n))
                        return <><i className="fas fa-file-archive" style={{ fontSize: '22px', color: '#f97316' }} /><span style={{ fontSize: '9px', color: '#f97316', fontWeight: 700 }}>ZIP</span></>;
                      if (t.includes('word') || /\.(doc|docx)$/.test(n))
                        return <><i className="fas fa-file-word" style={{ fontSize: '22px', color: '#3b82f6' }} /><span style={{ fontSize: '9px', color: '#3b82f6', fontWeight: 700 }}>DOC</span></>;
                      if (t.includes('text') || n.endsWith('.txt'))
                        return <><i className="fas fa-file-alt" style={{ fontSize: '22px', color: '#94a3b8' }} /><span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700 }}>TXT</span></>;
                      return <><i className="fas fa-file" style={{ fontSize: '22px', color: '#3b82f6' }} /></>;
                    })()}
                  </div>
                )}
                {/* File name */}
                <div style={{
                  fontSize: '10px', marginTop: '3px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                  maxWidth: '72px',
                }} title={file.name}>
                  {file.name}
                </div>
                {/* Remove chip button */}
                <button
                  onClick={() => onFileCancelOne(idx)}
                  title={`Remove ${file.name}`}
                  style={{
                    position: 'absolute', top: '-8px', right: '-8px',
                    width: '22px', height: '22px', borderRadius: '50%',
                    backgroundColor: '#ef4444', color: '#fff', border: '2px solid',
                    borderColor: 'rgb(30,41,59)',
                    cursor: 'pointer', fontSize: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10,
                    lineHeight: 1,
                  }}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            ))}
          </div>

          {/* Actions row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', opacity: 0.6 }}>
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
              {' · '}{(selectedFiles.reduce((s, f) => s + f.size, 0) / 1024).toFixed(1)} KB total
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={onFileSend} disabled={uploadingFile || !effectivelyOnline} style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                backgroundColor: effectivelyOnline ? '#22c55e' : '#64748b', color: '#fff',
                fontSize: '12px', fontWeight: '600',
              }}>
                {uploadingFile
                  ? <i className="fas fa-spinner fa-spin" />
                  : <><i className="fas fa-paper-plane" style={{ marginRight: '5px' }} />Send {selectedFiles.length > 1 ? `${selectedFiles.length} files` : 'file'}</>
                }
              </button>
              <button onClick={onFileCancelSelection} style={{
                padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                backgroundColor: '#ef4444', color: '#fff', fontSize: '12px',
              }} title="Cancel all">
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat input bar ───────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '10px 12px',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
      }}>
        {!testRecipientId && (
          <div style={{
            textAlign: 'center', padding: '10px', borderRadius: '8px', fontSize: '13px',
            backgroundColor: isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.08)',
            color: isDark ? '#fbbf24' : '#d97706',
          }}>
            <i className="fas fa-arrow-left" style={{ marginRight: '6px' }} />
            Select a conversation to start messaging
          </div>
        )}

        {testRecipientId && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', position: 'relative' }}>
            {/* Voice recorder */}
            <VoiceRecorder
              compact
              onRecordingComplete={onVoiceRecording}
              disabled={!effectivelyOnline || uploadingFile}
              onRecordingStart={onVoiceRecordingStart}
              onRecordingStop={onVoiceRecordingStop}
            />

            {/* File attach */}
            <input ref={fileInputRef} type="file" multiple onChange={onFileSelect} style={{ display: 'none' }}
              accept="image/*,.pdf,.doc,.docx,.txt,.zip,.mp3,.wav,.ogg,.m4a,audio/*" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!effectivelyOnline || uploadingFile}
              title="Attach file"
              style={{
                flexShrink: 0, width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                cursor: effectivelyOnline ? 'pointer' : 'not-allowed',
                backgroundColor: inputBg,
                color: isDark ? '#94a3b8' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                transition: 'background-color 0.15s',
              }}
            >
              <i className="fas fa-paperclip" />
            </button>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={testMessage}
              onChange={onMessageChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onMessageSend(); }
                // Up arrow in empty input → edit last sent message
                if (e.key === 'ArrowUp' && !testMessage && !editingMessage) {
                  e.preventDefault();
                  onEditLastSent?.();
                }
                // Escape cancels edit
                if (e.key === 'Escape' && editingMessage) {
                  e.preventDefault();
                  onCancelEdit?.();
                }
              }}
              placeholder={editingMessage ? 'Edit your message…' : effectivelyOnline ? 'Message…' : 'Offline — reconnecting…'}
              disabled={!effectivelyOnline}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: '20px', fontSize: '14px',
                backgroundColor: editingMessage
                  ? (isDark ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)')
                  : inputBg,
                border: `1px solid ${editingMessage ? '#f97316' : inputBorder}`,
                color: isDark ? '#f1f5f9' : '#0f172a',
                outline: 'none',
                opacity: effectivelyOnline ? 1 : 0.5,
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
            />

            {/* Emoji button + picker */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setEmojiOpen(v => !v)}
                title="Emoji"
                style={{
                  width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                  cursor: 'pointer',
                  backgroundColor: emojiOpen
                    ? (isDark ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.12)')
                    : inputBg,
                  color: emojiOpen ? '#f97316' : (isDark ? '#94a3b8' : '#64748b'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  transition: 'background-color 0.15s, color 0.15s',
                }}
              >
                <i className="fas fa-smile" />
              </button>

              {emojiOpen && (
                <EmojiPicker
                  onSelect={(emoji) => {
                    onEmojiInsert(emoji);
                    inputRef.current?.focus();
                  }}
                  onClose={() => setEmojiOpen(false)}
                />
              )}
            </div>

            {/* Send / Save-edit button */}
            <button
              onClick={onMessageSend}
              disabled={!effectivelyOnline || !testMessage.trim()}
              title={editingMessage ? 'Save edit' : 'Send message'}
              style={{
                flexShrink: 0, width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                cursor: effectivelyOnline && testMessage.trim() ? 'pointer' : 'not-allowed',
                backgroundColor: effectivelyOnline && testMessage.trim()
                  ? (editingMessage ? '#f97316' : sendBg)
                  : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                color: effectivelyOnline && testMessage.trim() ? '#fff' : (isDark ? '#64748b' : '#94a3b8'),
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
                transition: 'background-color 0.15s',
              }}
            >
              <i className={editingMessage ? 'fas fa-check' : 'fas fa-paper-plane'} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
