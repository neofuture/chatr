'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Lightbox from '@/components/Lightbox/Lightbox';
import { useConversation } from '@/hooks/useConversation';
import LabControls from '@/components/test/LabControls';
import ConversationsList from '@/components/test/ConversationsList';
import ConversationsColumn from '@/components/test/ConversationsColumn';
import SystemLogsModal from '@/components/test/SystemLogsModal';
import DragHandle from '@/components/test/DragHandle';

const MIN_W = 220;
const MAX_W = 700;
const DEFAULT_W = 350;

function useDragHandle(initialWidth: number) {
  const [width, setWidth] = useState(initialWidth);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startW = useRef(initialWidth);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startW.current = width;
    setDragging(true);
    const move = (ev: MouseEvent) => {
      setWidth(Math.min(MAX_W, Math.max(MIN_W, startW.current + ev.clientX - startX.current)));
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [width]);

  return { width, dragging, onMouseDown };
}

type MobileTab = 'controls' | 'conversations' | 'messages';

export default function TestPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState('');
  const [lightboxImageName, setLightboxImageName] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('conversations');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const left = useDragHandle(DEFAULT_W);
  const mid = useDragHandle(DEFAULT_W);
  const anyDragging = left.dragging || mid.dragging;

  const lab = useConversation();

  const labControlsProps = {
    isDark,
    effectivelyOnline: lab.effectivelyOnline,
    manualOffline: lab.manualOffline,
    uploadingFile: lab.uploadingFile,
    testMessage: lab.testMessage,
    testRecipientId: lab.testRecipientId,
    ghostTypingEnabled: lab.ghostTypingEnabled,
    selectedFile: lab.selectedFile,
    filePreviewUrl: lab.filePreviewUrl,
    isUserTyping: lab.isUserTyping,
    isRecipientTyping: lab.isRecipientTyping,
    isRecipientRecording: lab.isRecipientRecording,
    isRecipientListeningToMyAudio: lab.isRecipientListeningToMyAudio,
    onManualOfflineChange: lab.setManualOffline,
    onMessageChange: lab.handleMessageInputChange,
    onMessageSend: lab.handleMessageSend,
    onGhostTypingToggle: lab.handleGhostTypingToggle,
    onTypingStart: lab.handleTypingStart,
    onTypingStop: lab.handleTypingStop,
    onPresenceUpdate: lab.handlePresenceUpdate,
    onPresenceRequest: lab.handlePresenceRequest,
    onFileSelect: lab.handleFileSelect,
    onFileSend: lab.sendFile,
    onFileCancelSelection: lab.cancelFileSelection,
    onVoiceRecording: lab.handleVoiceRecording,
    onVoiceRecordingStart: lab.handleAudioRecordingStart,
    onVoiceRecordingStop: lab.handleAudioRecordingStop,
  };

  const TAB_BAR_H = 56;

  const tabs: { id: MobileTab; icon: string; label: string; badge?: number }[] = [
    { id: 'controls',      icon: 'fas fa-sliders-h',  label: 'Controls' },
    { id: 'conversations', icon: 'fas fa-comments',    label: 'Conversations', badge: lab.availableUsers.length },
    { id: 'messages',      icon: 'fas fa-comment-dots', label: 'Messages', badge: lab.messages.length || undefined },
  ];

  // ── Mobile layout ────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        backgroundColor: isDark ? '#0f172a' : '#f8fafc', overflow: 'hidden',
      }}>
        {/* Title bar */}
        <div style={{
          flexShrink: 0, height: '48px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}>
          <span style={{ fontWeight: '700', fontSize: '15px', color: isDark ? '#f1f5f9' : '#0f172a' }}>
            <i className="fas fa-flask" style={{ marginRight: '8px', color: '#3b82f6' }} />Test Lab
          </span>
          <button onClick={() => setLogsOpen(true)} style={{
            position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer',
            color: isDark ? '#94a3b8' : '#64748b', fontSize: '18px', padding: '4px 8px',
          }}>
            <i className="fas fa-list-alt" />
            {lab.logs.length > 0 && (
              <span style={{
                position: 'absolute', top: '0', right: '0',
                backgroundColor: '#3b82f6', color: '#fff',
                fontSize: '9px', fontWeight: '700', borderRadius: '8px',
                padding: '1px 4px', lineHeight: '1.4',
              }}>{lab.logs.length > 99 ? '99+' : lab.logs.length}</span>
            )}
          </button>
        </div>

        {/* Top tab bar */}
        <div style={{
          flexShrink: 0, height: `${TAB_BAR_H}px`, display: 'flex',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}>
          {tabs.map(tab => {
            const active = mobileTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setMobileTab(tab.id)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: '3px', border: 'none', cursor: 'pointer',
                backgroundColor: 'transparent',
                borderBottom: `2px solid ${active ? '#3b82f6' : 'transparent'}`,
                color: active ? '#3b82f6' : (isDark ? '#64748b' : '#94a3b8'),
                transition: 'color 0.15s',
              }}>
                <div style={{ position: 'relative' }}>
                  <i className={tab.icon} style={{ fontSize: '18px' }} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-8px',
                      backgroundColor: '#3b82f6', color: '#fff',
                      fontSize: '9px', fontWeight: '700', borderRadius: '8px',
                      padding: '1px 4px', lineHeight: '1.4',
                    }}>{tab.badge > 99 ? '99+' : tab.badge}</span>
                  )}
                </div>
                <span style={{ fontSize: '10px', fontWeight: active ? '700' : '500' }}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {mobileTab === 'controls' && (
            <div style={{ height: '100%', overflowY: 'auto', padding: '16px', backgroundColor: isDark ? '#1e293b' : '#ffffff' }}>
              <LabControls {...labControlsProps} />
            </div>
          )}
          {mobileTab === 'conversations' && (
            <div style={{ height: '100%', overflow: 'hidden' }}>
              <ConversationsList
                isDark={isDark}
                availableUsers={lab.availableUsers}
                selectedUserId={lab.testRecipientId}
                userPresence={lab.userPresence}
                conversations={lab.conversations}
                currentUserId={lab.currentUserId}
                onSelectUser={(id) => { lab.handleRecipientChange(id); setMobileTab('messages'); }}
              />
            </div>
          )}
          {mobileTab === 'messages' && (
            <div style={{ height: '100%', overflow: 'hidden' }}>
              <ConversationsColumn
                isDark={isDark}
                messages={lab.messages}
                messageQueue={lab.messageQueue}
                messagesEndRef={lab.messagesEndRef}
                isRecipientTyping={lab.isRecipientTyping}
                isRecipientRecording={lab.isRecipientRecording}
                recipientGhostText={lab.recipientGhostText}
                listeningMessageIds={lab.listeningMessageIds}
                logCount={lab.logs.length}
                onClear={lab.clearMessages}
                onOpenLogs={() => setLogsOpen(true)}
                onImageClick={(url, name) => { setLightboxImageUrl(url); setLightboxImageName(name); setLightboxOpen(true); }}
                onAudioPlayStatusChange={lab.handleAudioPlayStatusChange}
                activeAudioMessageId={lab.activeAudioMessageId}
                onReaction={lab.handleReaction}
                onUnsend={lab.handleUnsend}
                onReply={lab.handleReply}
                replyingTo={lab.replyingTo}
                clearReply={lab.clearReply}
                currentUserId={lab.currentUserId}
              />
            </div>
          )}
        </div>

        {/* Lightbox */}
        <Lightbox imageUrl={lightboxImageUrl} imageName={lightboxImageName} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />

        {/* System Logs Modal */}
        {logsOpen && (
          <SystemLogsModal
            logs={lab.logs} isDark={isDark} logsEndRef={lab.logsEndRef}
            onCopy={lab.copyLogs} onClear={lab.clearLogs} onClose={() => setLogsOpen(false)}
          />
        )}
      </div>
    );
  }

  // ── Desktop layout ───────────────────────────────────
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      backgroundColor: isDark ? '#0f172a' : '#f8fafc', overflow: 'hidden',
      userSelect: anyDragging ? 'none' : 'auto',
    }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* ── Col 1: Test Controls ────────────────────── */}
        <div style={{
          width: `${left.width}px`, minWidth: `${left.width}px`, flexShrink: 0,
          height: '100%', padding: '20px',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          overflowY: 'auto', overflowX: 'hidden',
        }}>
          <LabControls {...labControlsProps} />
        </div>

        <DragHandle isDark={isDark} isDragging={left.dragging} onMouseDown={left.onMouseDown} />

        {/* ── Col 2: Conversations List ───────────────── */}
        <div style={{
          width: `${mid.width}px`, minWidth: `${mid.width}px`, flexShrink: 0,
          height: '100%', overflow: 'hidden',
          borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}>
          <ConversationsList
            isDark={isDark}
            availableUsers={lab.availableUsers}
            selectedUserId={lab.testRecipientId}
            userPresence={lab.userPresence}
            conversations={lab.conversations}
            currentUserId={lab.currentUserId}
            onSelectUser={lab.handleRecipientChange}
          />
        </div>

        <DragHandle isDark={isDark} isDragging={mid.dragging} onMouseDown={mid.onMouseDown} />

        {/* ── Col 3: Message Thread ───────────────────── */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
          <ConversationsColumn
            isDark={isDark}
            messages={lab.messages}
            messageQueue={lab.messageQueue}
            messagesEndRef={lab.messagesEndRef}
            isRecipientTyping={lab.isRecipientTyping}
            isRecipientRecording={lab.isRecipientRecording}
            recipientGhostText={lab.recipientGhostText}
            listeningMessageIds={lab.listeningMessageIds}
            logCount={lab.logs.length}
            onClear={lab.clearMessages}
            onOpenLogs={() => setLogsOpen(true)}
            onImageClick={(url, name) => { setLightboxImageUrl(url); setLightboxImageName(name); setLightboxOpen(true); }}
            onAudioPlayStatusChange={lab.handleAudioPlayStatusChange}
            activeAudioMessageId={lab.activeAudioMessageId}
            onReaction={lab.handleReaction}
            onUnsend={lab.handleUnsend}
            onReply={lab.handleReply}
            replyingTo={lab.replyingTo}
            clearReply={lab.clearReply}
            currentUserId={lab.currentUserId}
          />
        </div>

      </div>

      {/* Lightbox */}
      <Lightbox imageUrl={lightboxImageUrl} imageName={lightboxImageName} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />

      {/* System Logs Modal */}
      {logsOpen && (
        <SystemLogsModal
          logs={lab.logs} isDark={isDark} logsEndRef={lab.logsEndRef}
          onCopy={lab.copyLogs} onClear={lab.clearLogs} onClose={() => setLogsOpen(false)}
        />
      )}
    </div>
  );
}
