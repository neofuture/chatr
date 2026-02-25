'use client';

import { useState, useRef, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { extractWaveformFromFile } from '@/utils/extractWaveform';
import type { Message } from '@/components/MessageBubble';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UseMessageInputOptions {
  recipientId: string;
  currentUserId: string;
  replyingTo?: Message | null;
  editingMessage?: Message | null;
  onMessageSent?: (msg: Message) => void;
  onEditSaved?: (messageId: string, newContent: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
}

export function useMessageInput({
  recipientId,
  currentUserId,
  replyingTo,
  editingMessage,
  onMessageSent,
  onEditSaved,
  onTypingStart,
  onTypingStop,
  onCancelReply,
  onCancelEdit,
}: UseMessageInputOptions) {
  const { socket, connected } = useWebSocket();
  const { showToast } = useToast();

  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<(string | null)[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const effectivelyOnline = connected;

  // ── Typing indicators ────────────────────────────────

  const emitTypingStop = useCallback(() => {
    if (!socket || !recipientId || !isTypingRef.current) return;
    socket.emit('typing:stop', { recipientId });
    isTypingRef.current = false;
    onTypingStop?.();
  }, [socket, recipientId, onTypingStop]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessage(val);

    if (!socket || !recipientId || !effectivelyOnline) return;

    if (val && !isTypingRef.current) {
      socket.emit('typing:start', { recipientId });
      isTypingRef.current = true;
      onTypingStart?.();
    }

    if (!val && isTypingRef.current) {
      emitTypingStop();
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (val) {
      typingTimeoutRef.current = setTimeout(emitTypingStop, 3000);
    }
  }, [socket, recipientId, effectivelyOnline, onTypingStart, emitTypingStop]);

  // ── Message send ─────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!socket || !effectivelyOnline || !recipientId) {
      showToast('Not connected', 'error');
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) return;

    // Cancel typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTypingStop();

    if (editingMessage) {
      // Edit existing message
      socket.emit('message:edit', { messageId: editingMessage.id, content: trimmed, recipientId });
      onEditSaved?.(editingMessage.id, trimmed);
      onCancelEdit?.();
      setMessage('');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const msg: Message = {
      id: tempId,
      content: trimmed,
      senderId: currentUserId,
      recipientId,
      direction: 'sent',
      status: 'sending',
      timestamp: new Date(),
      type: 'text',
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        senderUsername: replyingTo.senderUsername ?? '',
        senderDisplayName: replyingTo.senderDisplayName,
        type: replyingTo.type,
        duration: replyingTo.duration,
      } : undefined,
    };

    // Add optimistic message FIRST, then emit — prevents race condition
    // where message:sent arrives before the temp message is in state
    onMessageSent?.(msg);
    onCancelReply?.();
    setMessage('');

    socket.emit('message:send', {
      recipientId,
      content: trimmed,
      type: 'text',
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        senderDisplayName: replyingTo.senderDisplayName,
        senderUsername: replyingTo.senderUsername,
        type: replyingTo.type,
        duration: replyingTo.duration,
      } : undefined,
      // No messageId — backend creates the record
    });
  }, [socket, effectivelyOnline, recipientId, message, editingMessage, currentUserId, replyingTo, showToast, emitTypingStop, onMessageSent, onEditSaved, onCancelEdit, onCancelReply]);

  // ── Emoji insert ─────────────────────────────────────

  const handleEmojiInsert = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
  }, []);

  // ── File handling ─────────────────────────────────────

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    if (!newFiles.length) return;

    const oversized = newFiles.filter(f => f.size > 10 * 1024 * 1024);
    if (oversized.length) {
      showToast(`${oversized.map(f => f.name).join(', ')} exceed 10 MB limit`, 'error');
      return;
    }

    setSelectedFiles(prev => {
      const offset = prev.length;
      newFiles.forEach((file, idx) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            setFilePreviews(p => {
              const next = [...p];
              next[offset + idx] = ev.target?.result as string;
              return next;
            });
          };
          reader.readAsDataURL(file);
        } else {
          setFilePreviews(p => {
            const next = [...p];
            next[offset + idx] = null;
            return next;
          });
        }
      });
      return [...prev, ...newFiles];
    });

    e.target.value = '';
  }, [showToast]);

  const cancelFileSelection = useCallback((index?: number) => {
    if (index === undefined) {
      setSelectedFiles([]);
      setFilePreviews([]);
    } else {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
      setFilePreviews(prev => prev.filter((_, i) => i !== index));
    }
  }, []);

  const sendFiles = useCallback(async () => {
    if (!selectedFiles.length || !recipientId || !socket || !effectivelyOnline) return;
    setUploadingFile(true);
    const token = localStorage.getItem('token');
    try {
      for (const file of selectedFiles) {
        const isAudio = file.type.startsWith('audio/');
        const msgType = file.type.startsWith('image/') ? 'image' : isAudio ? 'audio' : 'file';
        const fd = new FormData();
        fd.append('file', file);
        fd.append('recipientId', recipientId);
        fd.append('type', msgType);
        const res = await fetch(`${API}/api/messages/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) { showToast(`Upload failed for ${file.name}`, 'error'); continue; }
        const data = await res.json();
        const msg: Message = {
          id: data.messageId || Date.now().toString(),
          content: isAudio ? 'Voice message' : file.name,
          senderId: currentUserId,
          recipientId,
          direction: 'sent',
          status: 'sent',
          timestamp: new Date(),
          type: msgType,
          fileUrl: data.fileUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          waveformData: data.waveform,
        };
        onMessageSent?.(msg);
        socket.emit('message:send', {
          recipientId, content: msg.content, type: msgType,
          fileUrl: data.fileUrl, fileName: file.name,
          fileSize: file.size, fileType: file.type,
          waveform: data.waveform, messageId: data.messageId,
        });
        if (isAudio && data.messageId) {
          const mid = data.messageId;
          extractWaveformFromFile(file).then(({ waveform, duration }) => {
            fetch(`${API}/api/messages/${mid}/waveform`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ waveform, duration }),
            }).catch(console.error);
          }).catch(console.error);
        }
      }
      showToast(selectedFiles.length === 1 ? 'File sent' : `${selectedFiles.length} files sent`, 'success');
      cancelFileSelection();
    } catch (err) {
      console.error(err);
      showToast('Failed to send files', 'error');
    } finally {
      setUploadingFile(false);
    }
  }, [selectedFiles, recipientId, socket, effectivelyOnline, currentUserId, showToast, cancelFileSelection, onMessageSent]);

  // ── Voice recording ───────────────────────────────────

  const handleVoiceRecording = useCallback(async (audioBlob: Blob, waveformData: number[]) => {
    if (!recipientId || !socket || !effectivelyOnline) {
      showToast('Cannot send voice message', 'error');
      return;
    }
    setUploadingFile(true);
    const token = localStorage.getItem('token');
    try {
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: audioBlob.type });
      const fd = new FormData();
      fd.append('file', audioFile);
      fd.append('recipientId', recipientId);
      fd.append('type', 'audio');
      fd.append('waveform', JSON.stringify(waveformData));
      const res = await fetch(`${API}/api/messages/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) { showToast('Upload failed', 'error'); return; }
      const data = await res.json();
      const duration = waveformData.length / 10;
      const msg: Message = {
        id: data.messageId || Date.now().toString(),
        content: 'Voice message',
        senderId: currentUserId,
        recipientId,
        direction: 'sent',
        status: 'sent',
        timestamp: new Date(),
        type: 'audio',
        fileUrl: data.fileUrl,
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileType: audioFile.type,
        waveformData,
        duration,
      };
      onMessageSent?.(msg);
      socket.emit('message:send', {
        recipientId, content: 'Voice message', type: 'audio',
        fileUrl: data.fileUrl, fileName: audioFile.name,
        fileSize: audioFile.size, fileType: audioFile.type,
        waveform: waveformData, duration, messageId: data.messageId,
      });
      showToast('Voice message sent', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to send voice message', 'error');
    } finally {
      setUploadingFile(false);
    }
  }, [recipientId, socket, effectivelyOnline, currentUserId, showToast, onMessageSent]);

  const handleVoiceRecordingStart = useCallback(() => {
    if (socket && recipientId && effectivelyOnline) {
      socket.emit('audio:recording', { recipientId, isRecording: true });
    }
  }, [socket, recipientId, effectivelyOnline]);

  const handleVoiceRecordingStop = useCallback(() => {
    if (socket && recipientId) {
      socket.emit('audio:recording', { recipientId, isRecording: false });
    }
  }, [socket, recipientId]);

  return {
    message,
    selectedFiles,
    filePreviews,
    uploadingFile,
    effectivelyOnline,
    handleMessageChange,
    handleSend,
    handleEmojiInsert,
    handleFileSelect,
    cancelFileSelection,
    sendFiles,
    handleVoiceRecording,
    handleVoiceRecordingStart,
    handleVoiceRecordingStop,
  };
}

