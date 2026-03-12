'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { extractWaveformFromFile } from '@/utils/extractWaveform';
import { getAudioDurationFromBlob } from '@/utils/audio';
import { enqueue, loadAllQueued } from '@/lib/outboundQueue';
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
  const typingKeepaliveRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const linkPreviewRef = useRef<Record<string, any> | null>(null);

  const effectivelyOnline = connected;

  // Populate the input when editing starts, clear when cancelled
  const prevEditIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content ?? '');
      prevEditIdRef.current = editingMessage.id;
    } else if (prevEditIdRef.current) {
      setMessage('');
      prevEditIdRef.current = null;
    }
  }, [editingMessage]);

  // ── Typing indicators ────────────────────────────────

  const emitTypingStop = useCallback(() => {
    if (!socket || !recipientId || !isTypingRef.current) return;
    socket.emit('typing:stop', { recipientId });
    isTypingRef.current = false;
    if (typingKeepaliveRef.current) { clearInterval(typingKeepaliveRef.current); typingKeepaliveRef.current = null; }
    onTypingStop?.();
  }, [socket, recipientId, onTypingStop]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  // Flush queued DM messages on reconnect
  useEffect(() => {
    if (!socket || !connected || !currentUserId) return;

    loadAllQueued(currentUserId).then(queued => {
      const dmQueued = queued.filter(item => !item.groupId);
      if (!dmQueued.length) return;
      for (const item of dmQueued) {
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
          tempId: item.tempId,
        });
      }
    }).catch(console.error);
  }, [socket, connected, currentUserId]);

  const handleSend = useCallback(() => {
    if (!recipientId) { showToast('Select a recipient', 'error'); return; }

    const trimmed = message.trim();
    if (!trimmed) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTypingStop();

    // Edits require a live connection
    if (editingMessage) {
      if (!socket || !effectivelyOnline) { showToast('Not connected — can\'t edit', 'error'); return; }
      socket.emit('message:edit', { messageId: editingMessage.id, content: trimmed, recipientId });
      onEditSaved?.(editingMessage.id, trimmed);
      onCancelEdit?.();
      setMessage('');
      return;
    }

    const isOnline = socket && effectivelyOnline;
    const tempId = `temp-${Date.now()}`;
    const currentLinkPreview = linkPreviewRef.current;

    const msg: Message = {
      id: tempId,
      content: trimmed,
      senderId: currentUserId,
      recipientId,
      direction: 'sent',
      status: isOnline ? 'sending' : 'queued',
      timestamp: new Date(),
      type: 'text',
      linkPreview: currentLinkPreview as Message['linkPreview'],
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        senderUsername: replyingTo.senderUsername ?? '',
        senderDisplayName: replyingTo.senderDisplayName,
        type: replyingTo.type,
        duration: replyingTo.duration,
      } : undefined,
    };

    // Persist to outbound queue so it survives navigation and offline
    enqueue(msg).catch(console.error);

    onMessageSent?.(msg);
    onCancelReply?.();
    setMessage('');
    linkPreviewRef.current = null;

    if (isOnline) {
      socket.emit('message:send', {
        recipientId,
        content: trimmed,
        type: 'text',
        linkPreview: currentLinkPreview,
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
    } else {
      showToast('Message queued — will send when online', 'info');
    }
  }, [socket, effectivelyOnline, recipientId, message, editingMessage, currentUserId, replyingTo, showToast, emitTypingStop, onMessageSent, onEditSaved, onCancelEdit, onCancelReply]);

  // ── Emoji insert ─────────────────────────────────────

  const handleEmojiInsert = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
  }, []);

  // ── File handling ─────────────────────────────────────

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
    if (!selectedFiles.length || !recipientId || !socket || !effectivelyOnline) return;
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
          } catch {
            // non-fatal — backend placeholder will be used
          }
        }

        const fd = new FormData();
        fd.append('file', file);
        fd.append('recipientId', recipientId);
        fd.append('type', msgType);
        if (fileCaption) fd.append('caption', fileCaption);
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

        const finalWaveform = preExtractedWaveform ?? data.waveform;
        const finalDuration = preExtractedDuration ?? data.duration;
        const contentText = isAudio ? 'Voice message' : (fileCaption || file.name);

        const msg: Message = {
          id: data.messageId || Date.now().toString(),
          content: contentText,
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
      if (caption) setMessage('');
    } catch (err) {
      console.error(err);
      showToast('Failed to send files', 'error');
    } finally {
      setUploadingFile(false);
    }
  }, [selectedFiles, recipientId, socket, effectivelyOnline, currentUserId, message, showToast, cancelFileSelection, onMessageSent]);

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

  const setLinkPreview = useCallback((preview: Record<string, any> | null) => {
    linkPreviewRef.current = preview;
  }, []);

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
    setLinkPreview,
  };
}

