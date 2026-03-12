'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { extractWaveformFromFile } from '@/utils/extractWaveform';
import { getAudioDurationFromBlob } from '@/utils/audio';
import { enqueue, loadAllQueued } from '@/lib/outboundQueue';
import type { Message } from '@/components/MessageBubble';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UseGroupMessageInputOptions {
  groupId: string;
  currentUserId: string;
  onMessageSent?: (msg: Message) => void;
}

export function useGroupMessageInput({
  groupId,
  currentUserId,
  onMessageSent,
}: UseGroupMessageInputOptions) {
  const { socket, connected } = useWebSocket();
  const { showToast } = useToast();

  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<(string | null)[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingKeepaliveRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const effectivelyOnline = connected;

  // ── Typing indicators ─────────────────────────────────────────────────────

  const emitTypingStop = useCallback(() => {
    if (!socket || !groupId || !isTypingRef.current) return;
    socket.emit('group:typing', { groupId, isTyping: false });
    isTypingRef.current = false;
    if (typingKeepaliveRef.current) { clearInterval(typingKeepaliveRef.current); typingKeepaliveRef.current = null; }
  }, [socket, groupId]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    if (!socket || !groupId || !effectivelyOnline) return;

    if (val && !isTypingRef.current) {
      socket.emit('group:typing', { groupId, isTyping: true });
      isTypingRef.current = true;
      // Keepalive: re-emit every 4s so the receiver's 5s timer never fires mid-session
      if (typingKeepaliveRef.current) clearInterval(typingKeepaliveRef.current);
      typingKeepaliveRef.current = setInterval(() => {
        if (isTypingRef.current && socket && groupId) {
          socket.emit('group:typing', { groupId, isTyping: true });
        }
      }, 4000);
    }
    if (!val && isTypingRef.current) {
      emitTypingStop();
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (val) {
      typingTimeoutRef.current = setTimeout(emitTypingStop, 8000);
    }
  }, [socket, groupId, effectivelyOnline, emitTypingStop]);

  // ── Flush queued group messages on reconnect ─────────────────────────────
  useEffect(() => {
    if (!socket || !connected || !currentUserId) return;

    loadAllQueued(currentUserId).then(queued => {
      const groupQueued = queued.filter(item => item.groupId === groupId);
      if (!groupQueued.length) return;
      for (const item of groupQueued) {
        socket.emit('group:message', {
          groupId: item.groupId,
          content: item.content,
          type: item.type,
          tempId: item.tempId,
        });
      }
    }).catch(console.error);
  }, [socket, connected, currentUserId, groupId]);

  // ── Send text ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const content = message.trim();
    if (!groupId || !content) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTypingStop();

    const isOnline = socket && effectivelyOnline;
    const tempId = `temp-${Date.now()}`;
    const msg: Message = {
      id: tempId,
      content,
      senderId: currentUserId,
      recipientId: groupId,
      direction: 'sent',
      status: isOnline ? 'sending' : 'queued',
      timestamp: new Date(),
      type: 'text',
    };

    enqueue(msg, groupId).catch(console.error);

    onMessageSent?.(msg);
    setMessage('');

    if (isOnline) {
      socket.emit('group:message', { groupId, content, type: 'text', tempId });
    } else {
      showToast('Message queued — will send when online', 'info');
    }
  }, [socket, effectivelyOnline, message, groupId, currentUserId, emitTypingStop, onMessageSent, showToast]);

  // ── Emoji ─────────────────────────────────────────────────────────────────

  const handleEmojiInsert = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
  }, []);

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    if (!newFiles.length) return;

    const maxSize = 50 * 1024 * 1024;
    const oversized = newFiles.filter(f => f.size > maxSize);
    if (oversized.length) {
      showToast(`${oversized.map(f => f.name).join(', ')} exceed 50 MB limit`, 'error');
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
        } else if (file.type.startsWith('video/')) {
          setFilePreviews(p => {
            const next = [...p];
            next[offset + idx] = URL.createObjectURL(file);
            return next;
          });
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
      setFilePreviews(prev => {
        prev.forEach(url => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); });
        return [];
      });
      setSelectedFiles([]);
    } else {
      setFilePreviews(prev => {
        if (prev[index]?.startsWith('blob:')) URL.revokeObjectURL(prev[index]!);
        return prev.filter((_, i) => i !== index);
      });
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }
  }, []);

  const sendFiles = useCallback(async () => {
    if (!selectedFiles.length || !groupId || !socket || !effectivelyOnline) return;
    setUploadingFile(true);
    const caption = message.trim();
    const token = localStorage.getItem('token');
    try {
      for (let fi = 0; fi < selectedFiles.length; fi++) {
        const file = selectedFiles[fi];
        const isAudio = file.type.startsWith('audio/');
        const isVideo = file.type.startsWith('video/');
        const msgType = file.type.startsWith('image/') ? 'image' : isAudio ? 'audio' : isVideo ? 'video' : 'file';
        const fileCaption = fi === 0 && !isAudio ? caption : '';

        let preExtractedWaveform: number[] | undefined;
        let preExtractedDuration: number | undefined;
        if (isAudio) {
          try {
            const extracted = await extractWaveformFromFile(file);
            preExtractedWaveform = extracted.waveform;
            preExtractedDuration = extracted.duration;
          } catch { /* non-fatal */ }
        }

        const fd = new FormData();
        fd.append('file', file);
        fd.append('groupId', groupId);
        fd.append('type', msgType);
        if (fileCaption) fd.append('caption', fileCaption);
        if (preExtractedWaveform) {
          fd.append('waveform', JSON.stringify(preExtractedWaveform));
        }
        if (preExtractedDuration) {
          fd.append('duration', String(preExtractedDuration));
        }
        const res = await fetch(`${API}/api/groups/${groupId}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) { showToast(`Upload failed for ${file.name}`, 'error'); continue; }
        const data = await res.json();

        const finalWaveform = preExtractedWaveform ?? data.waveform;
        const finalDuration = preExtractedDuration ?? data.duration;
        const contentText = isAudio ? 'Voice message' : (fileCaption || file.name);

        const msg: Message = {
          id: data.messageId || Date.now().toString(),
          content: contentText,
          senderId: currentUserId,
          recipientId: groupId,
          direction: 'sent',
          status: 'sent',
          timestamp: new Date(),
          type: msgType,
          fileUrl: data.fileUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          waveformData: finalWaveform,
          duration: finalDuration,
        };
        onMessageSent?.(msg);
        socket.emit('group:message', {
          groupId,
          content: msg.content,
          type: msgType,
          fileUrl: data.fileUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          waveform: finalWaveform,
          duration: finalDuration,
          messageId: data.messageId,
        });

        // Patch backend if it used a placeholder (shouldn't happen now but safety net)
        if (isAudio && data.messageId && preExtractedWaveform && data.needsWaveformGeneration) {
          const mid = data.messageId;
          fetch(`${API}/api/groups/${groupId}/messages/${mid}/waveform`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ waveform: preExtractedWaveform, duration: preExtractedDuration }),
          }).catch(console.error);
        }
      }
      showToast(selectedFiles.length === 1 ? 'File sent' : `${selectedFiles.length} files sent`, 'success');
      cancelFileSelection();
      if (caption) setMessage('');
    } catch (err) {
      console.error(err);
      showToast('Failed to send files', 'error');
    } finally {
      setUploadingFile(false);
    }
  }, [selectedFiles, groupId, socket, effectivelyOnline, currentUserId, message, showToast, cancelFileSelection, onMessageSent]);

  // ── Voice recording ───────────────────────────────────────────────────────

  const handleVoiceRecording = useCallback(async (audioBlob: Blob, waveformData: number[]) => {
    if (!groupId || !socket || !effectivelyOnline) {
      showToast('Cannot send voice message', 'error');
      return;
    }
    setUploadingFile(true);
    const token = localStorage.getItem('token');
    try {
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: audioBlob.type });
      const fd = new FormData();
      fd.append('file', audioFile);
      fd.append('groupId', groupId);
      fd.append('type', 'audio');
      fd.append('waveform', JSON.stringify(waveformData));
      // Decode actual duration from the blob — never use waveformData.length / 10
      // (waveform is resampled to a fixed bar count so that formula is always wrong)
      const actualDuration = audioBlob.size > 0
        ? await getAudioDurationFromBlob(audioBlob)
        : waveformData.length / 10;
      fd.append('duration', String(actualDuration));
      const res = await fetch(`${API}/api/groups/${groupId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) { showToast('Upload failed', 'error'); return; }
      const data = await res.json();
      const duration = data.duration || actualDuration;
      const msg: Message = {
        id: data.messageId || Date.now().toString(),
        content: 'Voice message',
        senderId: currentUserId,
        recipientId: groupId,
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
      socket.emit('group:message', {
        groupId,
        content: 'Voice message',
        type: 'audio',
        fileUrl: data.fileUrl,
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileType: audioFile.type,
        waveform: waveformData,
        duration,
        messageId: data.messageId,
      });
      showToast('Voice message sent', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to send voice message', 'error');
    } finally {
      setUploadingFile(false);
    }
  }, [groupId, socket, effectivelyOnline, currentUserId, showToast, onMessageSent]);

  const handleVoiceRecordingStart = useCallback(() => {
    if (socket && groupId && effectivelyOnline) {
      socket.emit('group:typing', { groupId, isTyping: false, isRecording: true });
    }
  }, [socket, groupId, effectivelyOnline]);

  const handleVoiceRecordingStop = useCallback(() => {
    if (socket && groupId) {
      socket.emit('group:typing', { groupId, isTyping: false, isRecording: false });
    }
  }, [socket, groupId]);

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

