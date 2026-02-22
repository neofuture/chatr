'use client';

import { useState, useRef, useCallback } from 'react';
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

export default function TestPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState('');
  const [lightboxImageName, setLightboxImageName] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);

  const left = useDragHandle(DEFAULT_W);
  const mid = useDragHandle(DEFAULT_W);
  const anyDragging = left.dragging || mid.dragging;

  const lab = useConversation();

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
          <LabControls
            isDark={isDark}
            effectivelyOnline={lab.effectivelyOnline}
            manualOffline={lab.manualOffline}
            uploadingFile={lab.uploadingFile}
            testMessage={lab.testMessage}
            testRecipientId={lab.testRecipientId}
            ghostTypingEnabled={lab.ghostTypingEnabled}
            availableUsers={lab.availableUsers}
            loadingUsers={lab.loadingUsers}
            selectedFile={lab.selectedFile}
            filePreviewUrl={lab.filePreviewUrl}
            isUserTyping={lab.isUserTyping}
            isRecipientTyping={lab.isRecipientTyping}
            isRecipientRecording={lab.isRecipientRecording}
            isRecipientListeningToMyAudio={lab.isRecipientListeningToMyAudio}
            onManualOfflineChange={lab.setManualOffline}
            onMessageChange={lab.handleMessageInputChange}
            onMessageSend={lab.handleMessageSend}
            onRecipientChange={lab.handleRecipientChange}
            onGhostTypingToggle={lab.handleGhostTypingToggle}
            onTypingStart={lab.handleTypingStart}
            onTypingStop={lab.handleTypingStop}
            onPresenceUpdate={lab.handlePresenceUpdate}
            onPresenceRequest={lab.handlePresenceRequest}
            onFileSelect={lab.handleFileSelect}
            onFileSend={lab.sendFile}
            onFileCancelSelection={lab.cancelFileSelection}
            onVoiceRecording={lab.handleVoiceRecording}
            onVoiceRecordingStart={lab.handleAudioRecordingStart}
            onVoiceRecordingStop={lab.handleAudioRecordingStop}
          />
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
          />
        </div>

      </div>

      {/* Lightbox */}
      <Lightbox imageUrl={lightboxImageUrl} imageName={lightboxImageName} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />

      {/* System Logs Modal */}
      {logsOpen && (
        <SystemLogsModal
          logs={lab.logs}
          isDark={isDark}
          logsEndRef={lab.logsEndRef}
          onCopy={lab.copyLogs}
          onClear={lab.clearLogs}
          onClose={() => setLogsOpen(false)}
        />
      )}
    </div>
  );
}
