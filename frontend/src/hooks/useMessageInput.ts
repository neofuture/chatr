'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { extractWaveformFromFile } from '@/utils/extractWaveform';
import { enqueue, loadAllQueued } from '@/lib/outboundQueue';
import type { Message } from '@/components/MessageBubble';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Decode an audio blob using the Web Audio API to get its exact duration.
 * Much more reliable than waveformData.length / 10 for long recordings.
 */
async function getAudioDurationFromBlob(blob: Blob): Promise<number> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer.duration;
    } finally {
      audioContext.close();
    }
  } catch {
    return 0;
  }
}

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
  const typingKeepaliveRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const effectivelyOnline = connected;

  // ── Typing indicators ────────────────────────────────

  const emitTypingStop = useCallback(() => {
    if (!socket || !recipientId || !isTypingRef.current) return;
    socket.emit('typing:stop', { recipientId });
    isTypingRef.current = false;
    if (typingKeepaliveRef.current) { clearInterval(typingKeepaliveRef.current); typingKeepaliveRef.current = null; }
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
      // Keepalive: re-emit typing:start every 4s so the receiver's 6s timer never fires mid-session
      if (typingKeepaliveRef.current) clearInterval(typingKeepaliveRef.current);
      typingKeepaliveRef.current = setInterval(() => {
        if (isTypingRef.current && socket && recipientId) {
          socket.emit('typing:start', { recipientId });
        }
      }, 4000);
    }

    if (!val && isTypingRef.current) {
      emitTypingStop();
    }

    // Reset the idle stop timer on every keystroke — stop after 8s of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (val) {
      typingTimeoutRef.current = setTimeout(emitTypingStop, 8000);
    }
  }, [socket, recipientId, effectivelyOnline, onTypingStart, emitTypingStop]);

  // ── Message send ─────────────────────────────────────

  // Flush queued messages on reconnect
  useEffect(() => {
    if (!socket || !connected || !currentUserId) return;

    loadAllQueued(currentUserId).then(queued => {
      if (!queued.length) return;
      for (const item of queued) {
        socket.emit('message:send', {
          recipientId: item.recipientId,
          content: item.content,
          type: item.type,
          replyTo: item.replyTo ?? undefined,
          fileUrl: item.fileUrl ?? undefined,
          fileName: item.fileName ?? undefined,
          fileSize: item.fileSize ?? undefined,
          fileType: item.fileType ?? undefined,
          waveform: item.waveformData ?? undefined,
          duration: item.duration ?? undefined,
          // Pass tempId so the server/client can match confirmation back
          tempId: item.tempId,
        });
      }
    }).catch(console.error);
  }, [socket, connected, currentUserId]);

  const handleSend = useCallback(() => {
    if (!socket || !effectivelyOnline || !recipientId) {
      showToast('Not connected', 'error');
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTypingStop();

    if (editingMessage) {
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

    // Persist to outbound queue BEFORE emitting so it survives navigation
    enqueue(msg).catch(console.error);

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
      tempId,
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

        // For audio files, extract the real waveform BEFORE uploading so the
        // sender sees the correct waveform + duration immediately on send.
        let preExtractedWaveform: number[] | undefined;
        let preExtractedDuration: number | undefined;
        if (isAudio) {
          try {
            const extracted = await extractWaveformFromFile(file);
            preExtractedWaveform = extracted.waveform;
            preExtractedDuration = extracted.duration;
          } catch {
            // non-fatal — backend placeholder will be used
          }
        }

        const fd = new FormData();
        fd.append('file', file);
        fd.append('recipientId', recipientId);
        fd.append('type', msgType);
        // Send the real waveform to the upload endpoint so it saves audioDuration too
        if (preExtractedWaveform) {
          fd.append('waveform', JSON.stringify(preExtractedWaveform));
        }
        if (preExtractedDuration) {
          fd.append('duration', String(preExtractedDuration));
        }
        const res = await fetch(`${API}/api/messages/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) { showToast(`Upload failed for ${file.name}`, 'error'); continue; }
        const data = await res.json();

        // Use pre-extracted values if available, else fall back to server response
        const finalWaveform = preExtractedWaveform ?? data.waveform;
        const finalDuration = preExtractedDuration ?? data.duration;

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
          waveformData: finalWaveform,
          duration: finalDuration,
        };
        onMessageSent?.(msg);
        socket.emit('message:send', {
          recipientId, content: msg.content, type: msgType,
          fileUrl: data.fileUrl, fileName: file.name,
          fileSize: file.size, fileType: file.type,
          waveform: finalWaveform, duration: finalDuration,
          messageId: data.messageId,
        });

        // If we pre-extracted, patch the backend with the real waveform now
        // (upload endpoint may have saved a placeholder if waveform wasn't sent)
        if (isAudio && data.messageId && preExtractedWaveform && data.needsWaveformGeneration) {
          const mid = data.messageId;
          fetch(`${API}/api/messages/${mid}/waveform`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ waveform: preExtractedWaveform, duration: preExtractedDuration }),
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
      // Send actual duration — waveformData.length / 10 is wrong for long recordings
      // because waveformData is resampled to a fixed bar count, not raw samples
      const actualDuration = audioBlob.size > 0
        ? await getAudioDurationFromBlob(audioBlob)
        : waveformData.length / 10;
      fd.append('duration', String(actualDuration));
      const res = await fetch(`${API}/api/messages/upload`, {
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

