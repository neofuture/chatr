'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import VoiceRecorder from '@/components/VoiceRecorder';
import EmojiPicker from '@/components/EmojiPicker/EmojiPicker';
import LinkPreviewCard, { type LinkPreviewData } from '@/components/LinkPreviewCard/LinkPreviewCard';
import { useMessageInput } from '@/hooks/useMessageInput';
import { useGroupMessageInput } from '@/hooks/useGroupMessageInput';
import type { Message } from '@/components/MessageBubble';
import { getApiBase } from '@/lib/api';

const API = getApiBase();
const URL_RE = /https?:\/\/[^\s<>"']+/gi;

export interface MessageInputProps {
  isDark: boolean;
  /** DM mode — provide recipientId */
  recipientId?: string;
  /** Group mode — provide groupId instead of recipientId */
  groupId?: string;
  replyingTo?: Message | null;
  editingMessage?: Message | null;
  onMessageSent?: (msg: Message) => void;
  onEditSaved?: (messageId: string, newContent: string) => void;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  onEditLastSent?: () => void;
  conversationStatus?: 'pending' | 'accepted';
  disabled?: boolean;
}

// ── Internal wrapper hooks so we can call them unconditionally ─────────────

function useDMInput(props: Parameters<typeof useMessageInput>[0]) {
  return useMessageInput(props);
}

function useGroupInput(props: Parameters<typeof useGroupMessageInput>[0]) {
  return useGroupMessageInput(props);
}

export default function MessageInput({
  isDark,
  recipientId = '',
  groupId,
  replyingTo,
  editingMessage,
  onMessageSent,
  onEditSaved,
  onCancelReply,
  onCancelEdit,
  onEditLastSent,
  conversationStatus,
  disabled = false,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const [currentUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.id ?? '';
    } catch { return ''; }
  });

  // Always call both hooks — select results based on mode
  const dmInput = useDMInput({
    recipientId,
    currentUserId,
    replyingTo,
    editingMessage,
    onMessageSent,
    onEditSaved,
    onCancelReply,
    onCancelEdit,
  });

  const groupInput = useGroupInput({
    groupId: groupId ?? '',
    currentUserId,
    onMessageSent,
  });

  const activeInput = groupId ? groupInput : dmInput;
  const {
    message,
    selectedFiles,
    filePreviews,
    uploadingFile,
    effectivelyOnline,
    handleMessageChange,
    handleSend: rawHandleSend,
    handleEmojiInsert,
    handleFileSelect,
    cancelFileSelection,
    sendFiles,
    handleVoiceRecording,
    handleVoiceRecordingStart,
    handleVoiceRecordingStop,
    setLinkPreview,
  } = activeInput;

  // ── Link preview detection ──────────────────────────────────────────────
  const [linkPreview, setLinkPreviewState] = useState<LinkPreviewData | null>(null);
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchedForRef = useRef<string | null>(null);

  const fetchLinkPreview = useCallback(async (url: string) => {
    setLinkPreviewLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/link-preview?url=${encodeURIComponent(url)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data: LinkPreviewData = await res.json();
      if (data.title || data.description || data.image) {
        fetchedForRef.current = url;
        setLinkPreviewState(data);
        setLinkPreview(data);
      }
    } catch { /* network error */ } finally {
      setLinkPreviewLoading(false);
    }
  }, [setLinkPreview]);

  // Detect URLs and fetch preview (debounced)
  useEffect(() => {
    if (dismissed) return;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);

    const urls = message.match(URL_RE);
    if (!urls?.length) return;

    const url = urls[urls.length - 1];
    if (url === fetchedForRef.current) return;

    previewTimerRef.current = setTimeout(() => fetchLinkPreview(url), 500);

    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current); };
  }, [message, dismissed, fetchLinkPreview]);

  const dismissPreview = useCallback(() => {
    setDismissed(true);
    setLinkPreviewState(null);
    setLinkPreview(null);
    fetchedForRef.current = null;
  }, [setLinkPreview]);

  const handleSend = useCallback(() => {
    rawHandleSend();
    setLinkPreviewState(null);
    setDismissed(false);
    fetchedForRef.current = null;
  }, [rawHandleSend]);

  // Focus the textarea when entering edit mode
  useEffect(() => {
    if (editingMessage && inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editingMessage]);

  // Reset textarea height when message is cleared after send
  useEffect(() => {
    if (!message && inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [message]);

  const canSend = effectivelyOnline && !disabled;
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const sendBg = canSend ? '#f97316' : '#64748b';

  return (
    <div style={{ flexShrink: 0, width: '100%' }}>

      {/* Reply banner */}
      {replyingTo && (
        <div style={{
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
          <button onClick={onCancelReply} title="Cancel reply" style={{
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

      {/* File preview strip */}
      {selectedFiles.length > 0 && (
        <div data-testid="file-preview-strip" style={{
          padding: '10px 16px',
          backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
          borderTop: '1px solid #3b82f6',
        }}>
          <div style={{
            display: 'flex', gap: '8px',
            overflowX: 'auto', overflowY: 'visible',
            paddingBottom: '8px', paddingTop: '10px',
            scrollbarWidth: 'thin',
          }}>
            {selectedFiles.map((file, idx) => {
              const previewReady = filePreviews[idx] !== undefined;
              const isImage = file.type.startsWith('image/') && !file.type.startsWith('image/svg');
              const isImageLoading = isImage && !previewReady;
              return (
              <div key={`${file.name}-${idx}`} style={{
                flexShrink: 0, position: 'relative', width: '72px', overflow: 'visible',
              }}>
                {isImageLoading ? (
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: '4px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}>
                    <i className="fas fa-image" style={{ fontSize: '18px', color: '#3b82f6', opacity: 0.6 }} />
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '10px', color: '#3b82f6', opacity: 0.6 }} />
                  </div>
                ) : filePreviews[idx] ? (
                  file.type.startsWith('video/') ? (
                    <video src={filePreviews[idx]! + '#t=0.1'} muted playsInline preload="metadata"
                      style={{ width: '72px', height: '72px', borderRadius: '8px', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={filePreviews[idx]!} alt={file.name}
                      style={{ width: '72px', height: '72px', borderRadius: '8px', objectFit: 'cover', display: 'block' }} />
                  )
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
                <div style={{
                  fontSize: '10px', marginTop: '3px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                  maxWidth: '72px',
                }} title={file.name}>
                  {file.name}
                </div>
                <button
                  onClick={() => cancelFileSelection(idx)}
                  title={`Remove ${file.name}`}
                  style={{
                    position: 'absolute', top: '-8px', right: '-8px',
                    width: '22px', height: '22px', borderRadius: '50%',
                    backgroundColor: '#ef4444', color: '#fff', border: '2px solid',
                    borderColor: isDark ? 'rgb(30,41,59)' : 'rgb(248,250,252)',
                    cursor: 'pointer', fontSize: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10, lineHeight: 1,
                  }}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', opacity: 0.6 }}>
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
              {' · '}{(selectedFiles.reduce((s, f) => s + f.size, 0) / 1024).toFixed(1)} KB
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={sendFiles} disabled={uploadingFile || !canSend} style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                backgroundColor: canSend ? '#22c55e' : '#64748b', color: '#fff',
                fontSize: '12px', fontWeight: '600',
              }}>
                {uploadingFile
                  ? <i className="fas fa-spinner fa-spin" />
                  : <><i className="fas fa-paper-plane" style={{ marginRight: '5px' }} />Send {selectedFiles.length > 1 ? `${selectedFiles.length} files` : 'file'}</>
                }
              </button>
              <button onClick={() => cancelFileSelection()} style={{
                padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                backgroundColor: '#ef4444', color: '#fff', fontSize: '12px',
              }} title="Cancel all">
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link preview */}
      {(linkPreview || linkPreviewLoading) && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        }}>
          {linkPreviewLoading && !linkPreview ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '12px', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '11px' }} />
              Loading preview...
            </div>
          ) : linkPreview ? (
            <LinkPreviewCard preview={linkPreview} onDismiss={dismissPreview} compact />
          ) : null}
        </div>
      )}

      {/* Input bar */}
      <div style={{
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
      }}>
        {(!recipientId && !groupId) ? (
          <div style={{
            textAlign: 'center', padding: '10px', borderRadius: '8px', fontSize: '13px',
            backgroundColor: isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.08)',
            color: isDark ? '#fbbf24' : '#d97706', width: '100%',
          }}>
            <i className="fas fa-arrow-left" style={{ marginRight: '6px' }} />
            Select a conversation to start messaging
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', width: '100%' }}>

            {/* Voice recorder */}
            <VoiceRecorder
              compact
              onRecordingComplete={handleVoiceRecording}
              disabled={!canSend || uploadingFile}
              onRecordingStart={handleVoiceRecordingStart}
              onRecordingStop={handleVoiceRecordingStop}
            />

            {/* File attach */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.mp3,.wav,.ogg,.m4a,audio/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!canSend || uploadingFile}
              title="Attach file"
              style={{
                flexShrink: 0, width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                cursor: canSend ? 'pointer' : 'not-allowed',
                backgroundColor: inputBg,
                color: isDark ? '#94a3b8' : '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                transition: 'background-color 0.15s',
              }}
            >
              <i className="fas fa-paperclip" />
            </button>
            {/* Text input — textarea so multi-line code blocks work */}
            <textarea
              ref={inputRef}
              rows={1}
              value={message}
              onChange={(e) => {
                handleMessageChange(e);
                const el = e.target;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 160) + 'px';
              }}
              onKeyDown={(e) => {
                // Count open code fences to decide if Enter should insert newline
                const openFences = (message.match(/^```/gm) || []).length % 2 !== 0;
                if (e.key === 'Enter' && !e.shiftKey && !openFences) {
                  e.preventDefault();
                  handleSend();
                  // Reset height after send
                  const el = e.currentTarget;
                  setTimeout(() => { el.style.height = 'auto'; }, 0);
                }
                if (e.key === 'ArrowUp' && !message && !editingMessage) {
                  e.preventDefault();
                  onEditLastSent?.();
                }
                if (e.key === 'Escape' && editingMessage) {
                  e.preventDefault();
                  onCancelEdit?.();
                }
              }}
              placeholder={
                disabled ? "You can't reply to this conversation"
                : editingMessage ? 'Edit your message…'
                : selectedFiles.length > 0 ? 'Add a caption…'
                : effectivelyOnline ? (groupId ? 'Message group…' : 'Message…')
                : 'Offline — reconnecting…'
              }
              disabled={!canSend}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: '20px', fontSize: '14px',
                backgroundColor: editingMessage
                  ? (isDark ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)')
                  : inputBg,
                border: `1px solid ${editingMessage ? '#f97316' : inputBorder}`,
                color: isDark ? '#f1f5f9' : '#0f172a',
                outline: 'none',
                opacity: canSend ? 1 : 0.5,
                transition: 'border-color 0.15s, background-color 0.15s',
                resize: 'none',
                overflow: 'hidden',
                lineHeight: '1.4',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
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
                    handleEmojiInsert(emoji);
                    inputRef.current?.focus();
                  }}
                  onClose={() => setEmojiOpen(false)}
                />
              )}
            </div>

            {/* Send / Save-edit button */}
            <button
              onClick={handleSend}
              disabled={!canSend || !message.trim()}
              title={editingMessage ? 'Save edit' : 'Send message'}
              style={{
                flexShrink: 0, width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                cursor: canSend && message.trim() ? 'pointer' : 'not-allowed',
                backgroundColor: canSend && message.trim()
                  ? (editingMessage ? '#f97316' : sendBg)
                  : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                color: canSend && message.trim() ? '#fff' : (isDark ? '#64748b' : '#94a3b8'),
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

