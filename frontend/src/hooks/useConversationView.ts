'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { loadCachedMessages, cacheMessage, updateCachedMessage, replaceCachedMessageId, cacheMessages } from '@/lib/messageCache';
import type { Message, MessageReaction } from '@/components/MessageBubble';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface UseConversationViewOptions {
  recipientId: string;
  currentUserId: string;
}

export function useConversationView({ recipientId, currentUserId }: UseConversationViewOptions) {
  const { socket, connected } = useWebSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [activeAudioMessageId, setActiveAudioMessageId] = useState<string | null>(null);
  const [listeningMessageIds, setListeningMessageIds] = useState<Set<string>>(new Set());
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [isRecipientRecording, setIsRecipientRecording] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Load cached messages on recipient change ──
  useEffect(() => {
    if (!recipientId || !currentUserId) return;
    setMessages([]);
    loadCachedMessages(currentUserId, recipientId).then(cached => {
      if (cached.length) setMessages(cached);
    }).catch(console.error);
  }, [recipientId, currentUserId]);

  // ── Add a message (called by MessageInput via onMessageSent) ──
  const addMessage = useCallback((msg: Message) => {
    setMessages(prev => {
      if (prev.find(m => m.id === msg.id)) return prev;
      cacheMessage(msg, currentUserId).catch(console.error);
      return [...prev, msg];
    });
  }, [currentUserId]);

  // ── Handle edit saved ──
  const handleEditSaved = useCallback((messageId: string, newContent: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, content: newContent, edited: true } : m
    ));
    updateCachedMessage(messageId, { content: newContent, edited: true }).catch(console.error);
    setEditingMessage(null);
  }, []);

  // ── Edit last sent message (up-arrow shortcut) ──
  const editLastSentMessage = useCallback(() => {
    const last = [...messages].reverse().find(m => m.senderId === currentUserId && m.type === 'text');
    if (last) setEditingMessage(last);
  }, [messages, currentUserId]);

  // ── Audio playback ────────────────────────────────────
  const handleAudioPlayStatusChange = useCallback((
    messageId: string,
    senderId: string,
    isPlaying: boolean,
    isEnded?: boolean,
  ) => {
    if (isPlaying) {
      setActiveAudioMessageId(messageId);
      if (socket && senderId !== currentUserId) {
        socket.emit('audio:listening', { messageId, senderId });
        setListeningMessageIds(prev => new Set([...prev, messageId]));
      }
    } else {
      setActiveAudioMessageId(null);
      if (isEnded && socket && senderId !== currentUserId) {
        socket.emit('audio:listened', { messageId, senderId });
      }
    }
  }, [socket, currentUserId]);

  // ── Reactions ─────────────────────────────────────────
  const handleReaction = useCallback((messageId: string, emoji: string) => {
    if (!socket || !connected) return;
    socket.emit('message:reaction', { messageId, emoji, recipientId });
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const existing = m.reactions ?? [];
      const hasOwn = existing.find(r => r.emoji === emoji && r.userId === currentUserId);
      const reactions: MessageReaction[] = hasOwn
        ? existing.filter(r => !(r.emoji === emoji && r.userId === currentUserId))
        : [...existing, { emoji, userId: currentUserId, username: '' }];
      return { ...m, reactions };
    }));
  }, [socket, connected, recipientId, currentUserId]);

  // ── Unsend ────────────────────────────────────────────
  const handleUnsend = useCallback((messageId: string) => {
    if (!socket || !connected) return;
    socket.emit('message:unsend', { messageId, recipientId });
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, [socket, connected, recipientId]);

  // ── Lightbox ──────────────────────────────────────────
  const openLightbox = useCallback((url: string, name: string) => {
    setLightboxUrl(url);
    setLightboxName(name);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxUrl(null);
    setLightboxName('');
  }, []);

  // ── WebSocket event listeners ─────────────────────────
  useEffect(() => {
    if (!socket || !recipientId || !currentUserId) return;

    const onMessage = (data: Message & { tempId?: string }) => {
      const isForUs =
        (data.senderId === recipientId && data.recipientId === currentUserId) ||
        (data.senderId === currentUserId && data.recipientId === recipientId);
      if (!isForUs) return;

      setMessages(prev => {
        if (data.tempId) {
          const idx = prev.findIndex(m => m.id === data.tempId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = { ...data, direction: data.senderId === currentUserId ? 'sent' : 'received' };
            replaceCachedMessageId(data.tempId, data.id).catch(console.error);
            return updated;
          }
        }
        if (prev.find(m => m.id === data.id)) return prev;
        const msg = { ...data, direction: data.senderId === currentUserId ? 'sent' : 'received' } as Message;
        cacheMessage(msg, currentUserId).catch(console.error);
        return [...prev, msg];
      });
    };

    const onMessageStatus = ({ messageId, status }: { messageId: string; status: string }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: status as Message['status'] } : m));
      updateCachedMessage(messageId, { status: status as Message['status'] }).catch(console.error);
    };

    const onMessageEdited = ({ messageId, content }: { messageId: string; content: string }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, edited: true } : m));
      updateCachedMessage(messageId, { content, edited: true }).catch(console.error);
    };

    const onMessageUnsent = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    };

    const onReaction = ({ messageId, emoji, userId, username }: { messageId: string; emoji: string; userId: string; username: string }) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const existing = m.reactions ?? [];
        const has = existing.find(r => r.emoji === emoji && r.userId === userId);
        const reactions: MessageReaction[] = has
          ? existing.filter(r => !(r.emoji === emoji && r.userId === userId))
          : [...existing, { emoji, userId, username }];
        return { ...m, reactions };
      }));
    };

    const onTypingStart = ({ senderId }: { senderId: string }) => {
      if (senderId !== recipientId) return;
      setIsRecipientTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setIsRecipientTyping(false), 5000);
    };

    const onTypingStop = ({ senderId }: { senderId: string }) => {
      if (senderId !== recipientId) return;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setIsRecipientTyping(false);
    };

    const onRecordingStart = ({ senderId }: { senderId: string }) => {
      if (senderId !== recipientId) return;
      setIsRecipientRecording(true);
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = setTimeout(() => setIsRecipientRecording(false), 30000);
    };

    const onRecordingStop = ({ senderId }: { senderId: string }) => {
      if (senderId !== recipientId) return;
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      setIsRecipientRecording(false);
    };

    socket.on('message:received', onMessage);
    socket.on('message:sent', onMessage);
    socket.on('message:status', onMessageStatus);
    socket.on('message:edited', onMessageEdited);
    socket.on('message:unsent', onMessageUnsent);
    socket.on('message:reaction', onReaction);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('recording:start', onRecordingStart);
    socket.on('recording:stop', onRecordingStop);

    return () => {
      socket.off('message:received', onMessage);
      socket.off('message:sent', onMessage);
      socket.off('message:status', onMessageStatus);
      socket.off('message:edited', onMessageEdited);
      socket.off('message:unsent', onMessageUnsent);
      socket.off('message:reaction', onReaction);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('recording:start', onRecordingStart);
      socket.off('recording:stop', onRecordingStop);
    };
  }, [socket, recipientId, currentUserId]);

  // ── Fetch message history from API ────────────────────
  useEffect(() => {
    if (!recipientId || !currentUserId || !connected) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API}/api/messages/${recipientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: Message[] | null) => {
        if (!data) return;
        const mapped = data.map(m => ({
          ...m,
          direction: m.senderId === currentUserId ? 'sent' : 'received',
          timestamp: new Date(m.timestamp),
        })) as Message[];
        setMessages(mapped);
        cacheMessages(mapped, currentUserId).catch(console.error);
      })
      .catch(console.error);
  }, [recipientId, currentUserId, connected]);

  return {
    messages,
    messagesEndRef,
    activeAudioMessageId,
    listeningMessageIds,
    isRecipientTyping,
    isRecipientRecording,
    lightboxUrl,
    lightboxName,
    replyingTo,
    editingMessage,
    addMessage,
    handleEditSaved,
    editLastSentMessage,
    handleAudioPlayStatusChange,
    handleReaction,
    handleUnsend,
    openLightbox,
    closeLightbox,
    setReplyingTo,
    setEditingMessage,
    cancelReply: () => setReplyingTo(null),
    cancelEdit: () => setEditingMessage(null),
  };
}
