'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import { type Message, type MessageReaction } from '@/components/MessageBubble';
import { extractWaveformFromFile } from '@/utils/extractWaveform';
import type { LogEntry, AvailableUser, PresenceStatus, PresenceInfo, ConversationSummary } from '@/components/test/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useConversation() {
  const { socket, connected, connecting, disconnect, reconnect } = useWebSocket();
  const { showToast } = useToast();

  // ── State ────────────────────────────────────────────
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const [testRecipientId, setTestRecipientId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [currentDisplayName, setCurrentDisplayName] = useState('');
  const [manualOffline, setManualOffline] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [ghostTypingEnabled, setGhostTypingEnabled] = useState(false);
  const [recipientGhostText, setRecipientGhostText] = useState('');
  const [isRecipientRecording, setIsRecipientRecording] = useState(false);
  const [isRecipientListeningToMyAudio, setIsRecipientListeningToMyAudio] = useState<string | null>(null);
  const [listeningMessageIds, setListeningMessageIds] = useState<Set<string>>(new Set());
  const [activeAudioMessageId, setActiveAudioMessageId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [userPresence, setUserPresence] = useState<Record<string, PresenceInfo>>({});
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [conversations, setConversations] = useState<Record<string, ConversationSummary>>({});

  // ── Refs ─────────────────────────────────────────────
  const socketRef = useRef(socket);
  const testRecipientIdRef = useRef(testRecipientId);
  const effectivelyOnlineRef = useRef(connected && !manualOffline);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ghostTypingThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);

  const effectivelyOnline = connected && !manualOffline;

  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { testRecipientIdRef.current = testRecipientId; }, [testRecipientId]);
  useEffect(() => { effectivelyOnlineRef.current = effectivelyOnline; }, [effectivelyOnline]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Logging ──────────────────────────────────────────
  const addLog = useCallback((type: LogEntry['type'], event: string, data: any) => {
    setLogs(prev => [{ id: Date.now().toString() + Math.random(), type, event, data, timestamp: new Date() }, ...prev].slice(0, 500));
  }, []);

  // ── Load user ────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined') return;
    try {
      const user = JSON.parse(raw);
      setCurrentUserId(user.id);
      setCurrentUsername(user.username || '');
      setCurrentDisplayName(user.displayName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '') || (user.username || '').replace(/^@/, ''));
      addLog('info', 'user:loaded', { userId: user.id, username: user.username, displayName: user.displayName });
    } catch (e) { addLog('error', 'user:parse-failed', { error: e }); }
  }, [addLog]);

  // ── Fetch users ──────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;
    const run = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      setLoadingUsers(true);
      try {
        const res = await fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const others: AvailableUser[] = data.users
          .filter((u: any) => u.id !== currentUserId && u.emailVerified)
          .map((u: any) => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName ?? null,
            profileImage: u.profileImage ?? null,
            email: u.email || 'No email',
          }));
        setAvailableUsers(others);
        addLog('info', 'users:loaded', { count: others.length });
        if (others.length > 0) {
          setTestRecipientId(prev => prev || others[0].id);
          // Request initial presence for all users
          const s = socketRef.current;
          if (s) {
            const ids = others.map(u => u.id);
            addLog('sent', 'presence:request', { userIds: ids });
            s.emit('presence:request', ids);
          }
        }
      } catch (e) { addLog('error', 'users:fetch-error', { error: e }); }
      finally { setLoadingUsers(false); }
    };
    run();
  }, [currentUserId, addLog]);

  // ── Drain queue when back online ─────────────────────
  useEffect(() => {
    if (!effectivelyOnline || messageQueue.length === 0 || !socket) return;
    const toSend = [...messageQueue];
    setMessageQueue([]);
    (async () => {
      for (const msg of toSend) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sending' } : m));
        socket.emit('message:send', { recipientId: msg.recipientId, content: msg.content, type: 'text' },
          (res: any) => { if (res?.error) setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'failed' } : m)); });
        await new Promise(r => setTimeout(r, 100));
      }
    })();
  }, [effectivelyOnline, socket, messageQueue]);

  // ── Socket listeners ─────────────────────────────────
  useEffect(() => {
    if (!socket) { addLog('info', 'socket:not-initialized', {}); return; }
    addLog('info', 'socket:initialized', { connected, connecting });

    const onReceived = (data: any) => {
      addLog('received', 'message:received', data);
      const newMsg: Message = {
        id: data.id || Date.now().toString(), content: data.content,
        senderId: data.senderId,
        senderUsername: data.senderUsername,
        senderDisplayName: data.senderDisplayName ?? null,
        senderProfileImage: data.senderProfileImage ?? null,
        recipientId: currentUserId,
        direction: 'received', status: 'delivered',
        timestamp: new Date(data.timestamp || Date.now()),
        type: data.type || 'text', fileUrl: data.fileUrl, fileName: data.fileName,
        fileSize: data.fileSize, fileType: data.fileType,
        waveformData: data.waveform || data.waveformData, duration: data.duration,
        replyTo: data.replyTo ?? undefined,
      };

      // Update conversation summary
      const isCurrentConversation = testRecipientIdRef.current === data.senderId;
      setConversations(prev => ({
        ...prev,
        [data.senderId]: {
          userId: data.senderId,
          lastMessage: data.content || (data.type === 'audio' ? '🎤 Voice message' : data.type === 'image' ? '📷 Image' : '📎 File'),
          lastMessageAt: new Date(data.timestamp || Date.now()),
          unreadCount: isCurrentConversation ? 0 : ((prev[data.senderId]?.unreadCount ?? 0) + 1),
          lastSenderId: data.senderId,
        },
      }));

      // Only add to messages if this is the active conversation
      if (isCurrentConversation) {
        setMessages(prev => [...prev, newMsg]);
        if (data.type !== 'audio') socket.emit('message:read', data.id);
      } else if (!testRecipientIdRef.current) {
        // No conversation open — auto-select this sender
        setTestRecipientId(data.senderId);
        setMessages([newMsg]);
      }
    };

    const onSent = (data: any) => {
      addLog('received', 'message:sent', data);
      setMessages(prev => prev.map(m => {
        if (m.recipientId === data.recipientId && m.status === 'sending') return { ...m, id: data.id || m.id, status: data.status || 'sent' };
        if (m.id === data.id && m.status === 'sent') return { ...m, status: data.status || 'delivered' };
        return m;
      }));
    };

    const onStatus = (data: any) => {
      addLog('received', 'message:status', data);
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, status: data.status } : m));
    };

    const onTyping = (data: any) => {
      addLog('received', 'typing:status', data);
      if (data.userId !== testRecipientId) return;
      setIsRecipientTyping(data.isTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (data.isTyping) typingTimeoutRef.current = setTimeout(() => setIsRecipientTyping(false), 3000);
      else if (ghostTypingEnabled) setRecipientGhostText('');
    };

    const onGhost = (data: any) => {
      addLog('received', 'ghost:typing', data);
      if ((data.userId || data.senderId) === testRecipientId) setRecipientGhostText(data.text || '');
    };

    const onAudioRecording = (data: any) => {
      addLog('received', 'audio:recording', data);
      setIsRecipientRecording(data.isRecording === true);
      if (data.isRecording) setTimeout(() => setIsRecipientRecording(false), 10000);
    };

    const onAudioListening = (data: any) => {
      addLog('received', 'audio:listening', data);
      const id = data.messageId;
      if (data.isListening && id) {
        setListeningMessageIds(prev => new Set(prev).add(id));
        setIsRecipientListeningToMyAudio(id);
      } else if (id) {
        setListeningMessageIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        setIsRecipientListeningToMyAudio(null);
      }
    };

    const onAudioWaveform = (data: any) => {
      addLog('received', 'audio:waveform', data);
      if (data.messageId && data.waveform)
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, waveformData: data.waveform, duration: data.duration || m.duration } : m));
    };

    const onUserStatus = (data: any) => {
      addLog('received', 'user:status', data);
      if (data.userId && data.status) {
        setUserPresence(prev => ({
          ...prev,
          [data.userId]: {
            status: data.status as PresenceStatus,
            lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
          },
        }));
      }
    };

    const onPresenceResponse = (data: any) => {
      addLog('received', 'presence:response', data);
      // Backend returns an array: [{ userId, status, lastSeen }]
      if (Array.isArray(data)) {
        setUserPresence(prev => {
          const next = { ...prev };
          data.forEach((entry: any) => {
            if (entry.userId) {
              next[entry.userId] = {
                status: (entry.status ?? 'offline') as PresenceStatus,
                lastSeen: entry.lastSeen ? new Date(entry.lastSeen) : null,
              };
            }
          });
          return next;
        });
      }
    };

    const onReaction = (data: any) => {
      addLog('received', 'message:reaction', data);
      if (data.messageId) {
        setMessages(prev => prev.map(m =>
          m.id === data.messageId
            ? { ...m, reactions: (data.reactions as MessageReaction[]) ?? [] }
            : m
        ));
      }
    };

    const onUnsent = (data: any) => {
      addLog('received', 'message:unsent', data);
      if (data.messageId) {
        setMessages(prev => prev.map(m =>
          m.id === data.messageId ? { ...m, unsent: true, reactions: [] } : m
        ));
      }
    };

    const baseEvents = ['connect', 'disconnect', 'connect_error', 'error'];
    const baseHandlers: Record<string, (d: any) => void> = {};
    baseEvents.forEach(ev => { baseHandlers[ev] = (d: any) => addLog('received', ev, d); socket.on(ev, baseHandlers[ev]); });
    socket.on('message:received', onReceived);
    socket.on('message:sent', onSent);
    socket.on('message:status', onStatus);
    socket.on('typing:status', onTyping);
    socket.on('ghost:typing', onGhost);
    socket.on('audio:recording', onAudioRecording);
    socket.on('audio:listening', onAudioListening);
    socket.on('audio:waveform', onAudioWaveform);
    socket.on('user:status', onUserStatus);
    socket.on('presence:response', onPresenceResponse);
    socket.on('message:reaction', onReaction);
    socket.on('message:unsent', onUnsent);

    return () => {
      baseEvents.forEach(ev => socket.off(ev, baseHandlers[ev]));
      socket.off('message:received', onReceived);
      socket.off('message:sent', onSent);
      socket.off('message:status', onStatus);
      socket.off('typing:status', onTyping);
      socket.off('ghost:typing', onGhost);
      socket.off('audio:recording', onAudioRecording);
      socket.off('audio:listening', onAudioListening);
      socket.off('audio:waveform', onAudioWaveform);
      socket.off('user:status', onUserStatus);
      socket.off('presence:response', onPresenceResponse);
      socket.off('message:reaction', onReaction);
      socket.off('message:unsent', onUnsent);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (userTypingTimeoutRef.current) clearTimeout(userTypingTimeoutRef.current);
    };
  }, [socket, connected, connecting, currentUserId, testRecipientId, ghostTypingEnabled, addLog]);

  // Auto-scroll
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs.length]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  // ── Presence poll every 10s ──────────────────────────
  useEffect(() => {
    if (!socket || !effectivelyOnline || availableUsers.length === 0) return;
    const ids = availableUsers.map(u => u.id);
    const poll = () => {
      addLog('sent', 'presence:request', { userIds: ids, trigger: 'poll' });
      socket.emit('presence:request', ids);
    };
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [socket, effectivelyOnline, availableUsers, addLog]);

  // ── Send text message ────────────────────────────────
  const handleMessageSend = () => {
    if (!testRecipientId) { showToast('Select a recipient', 'error'); return; }
    if (!testMessage) return;
    if (isUserTyping && socket && effectivelyOnline) {
      addLog('sent', 'typing:stop', { recipientId: testRecipientId, trigger: 'message-send' });
      socket.emit('typing:stop', { recipientId: testRecipientId });
      setIsUserTyping(false);
      if (userTypingTimeoutRef.current) clearTimeout(userTypingTimeoutRef.current);
    }
    if (ghostTypingEnabled && socket && effectivelyOnline) {
      addLog('sent', 'ghost:typing', { recipientId: testRecipientId, text: '', trigger: 'message-send' });
      socket.emit('ghost:typing', { recipientId: testRecipientId, text: '' });
    }

    const replyToSnapshot = replyingTo ? {
      id: replyingTo.id,
      content: replyingTo.type === 'audio' ? 'Voice message' : replyingTo.type === 'image' ? 'Photo' : replyingTo.type === 'file' ? (replyingTo.fileName || 'File') : replyingTo.content,
      type: replyingTo.type || 'text',
      duration: replyingTo.duration,
      senderUsername: replyingTo.senderId === currentUserId ? 'You' : (replyingTo.senderUsername || ''),
      senderDisplayName: replyingTo.senderId === currentUserId
        ? currentDisplayName || 'You'
        : (replyingTo.senderDisplayName || (replyingTo.senderUsername || '').replace(/^@/, '') || 'Unknown'),
    } : undefined;

    const msg: Message = {
      id: Date.now().toString() + Math.random(), content: testMessage,
      senderId: currentUserId, senderUsername: currentUsername,
      senderDisplayName: currentDisplayName,
      recipientId: testRecipientId,
      direction: 'sent', status: effectivelyOnline ? 'sending' : 'queued', timestamp: new Date(),
      replyTo: replyToSnapshot,
    };
    setMessages(prev => [...prev, msg]);
    setReplyingTo(null);
    // Update conversation summary
    setConversations(prev => ({
      ...prev,
      [testRecipientId]: {
        userId: testRecipientId,
        lastMessage: testMessage,
        lastMessageAt: new Date(),
        unreadCount: 0,
        lastSenderId: currentUserId,
      },
    }));

    if (!socket || !effectivelyOnline) {
      setMessageQueue(prev => [...prev, msg]);
      showToast(`Queued (${manualOffline ? 'offline mode' : 'disconnected'})`, 'info');
      setTestMessage('');
      return;
    }
    addLog('sent', 'message:send', { recipientId: testRecipientId, content: testMessage, replyTo: replyToSnapshot });
    socket.emit('message:send', { recipientId: testRecipientId, content: testMessage, type: 'text', replyTo: replyToSnapshot },
      (res: any) => {
        if (res?.error) {
          addLog('error', 'message:send-failed', res);
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'failed' } : m));
        }
      });
    setTestMessage('');
  };

  // ── Typing input ─────────────────────────────────────
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTestMessage(val);
    if (!testRecipientId || !socket || !effectivelyOnline) return;
    if (val.length > 0 && !isUserTyping) {
      addLog('sent', 'typing:start', { recipientId: testRecipientId, trigger: 'auto' });
      socket.emit('typing:start', { recipientId: testRecipientId }); setIsUserTyping(true);
    }
    if (ghostTypingEnabled) {
      if (ghostTypingThrottleRef.current) clearTimeout(ghostTypingThrottleRef.current);
      ghostTypingThrottleRef.current = setTimeout(() => {
        if (socket && effectivelyOnline) {
          addLog('sent', 'ghost:typing', { recipientId: testRecipientId, text: val });
          socket.emit('ghost:typing', { recipientId: testRecipientId, text: val });
        }
      }, 100);
    }
    if (userTypingTimeoutRef.current) clearTimeout(userTypingTimeoutRef.current);
    if (val.length > 0) {
      userTypingTimeoutRef.current = setTimeout(() => {
        if (socket && effectivelyOnline) {
          addLog('sent', 'typing:start', { recipientId: testRecipientId, trigger: 'keepalive' });
          socket.emit('typing:start', { recipientId: testRecipientId });
          userTypingTimeoutRef.current = setTimeout(() => {
            if (socket && effectivelyOnline) {
              addLog('sent', 'typing:stop', { recipientId: testRecipientId, trigger: 'timeout' });
              socket.emit('typing:stop', { recipientId: testRecipientId }); setIsUserTyping(false);
            }
          }, 3000);
        }
      }, 2000);
    } else {
      if (isUserTyping) {
        addLog('sent', 'typing:stop', { recipientId: testRecipientId, trigger: 'cleared' });
        socket.emit('typing:stop', { recipientId: testRecipientId }); setIsUserTyping(false);
      }
      if (ghostTypingEnabled && socket && effectivelyOnline) {
        addLog('sent', 'ghost:typing', { recipientId: testRecipientId, text: '', trigger: 'cleared' });
        socket.emit('ghost:typing', { recipientId: testRecipientId, text: '' });
      }
    }
  };

  // ── File handling ────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('File too large (max 10MB)', 'error'); return; }
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else setFilePreviewUrl(null);
  };

  const cancelFileSelection = () => { setSelectedFile(null); setFilePreviewUrl(null); };

  const sendFile = async () => {
    if (!selectedFile || !testRecipientId || !socket || !effectivelyOnline) return;
    setUploadingFile(true);
    const token = localStorage.getItem('token');
    try {
      const isAudio = selectedFile.type.startsWith('audio/');
      const msgType = selectedFile.type.startsWith('image/') ? 'image' : isAudio ? 'audio' : 'file';
      const fd = new FormData();
      fd.append('file', selectedFile); fd.append('recipientId', testRecipientId); fd.append('type', msgType);
      const res = await fetch(`${API}/api/messages/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) { showToast('Upload failed', 'error'); return; }
      const data = await res.json();
      const msg: Message = {
        id: data.messageId || Date.now().toString(), content: isAudio ? 'Voice message' : selectedFile.name,
        senderId: currentUserId, recipientId: testRecipientId, direction: 'sent', status: 'sent',
        timestamp: new Date(), type: msgType, fileUrl: data.fileUrl,
        fileName: selectedFile.name, fileSize: selectedFile.size, fileType: selectedFile.type, waveformData: data.waveform,
      };
      setMessages(prev => [...prev, msg]);
      addLog('sent', 'file:upload', { type: msgType, fileName: selectedFile.name, fileSize: selectedFile.size, messageId: data.messageId });
      socket.emit('message:send', { recipientId: testRecipientId, content: msg.content, type: msgType, fileUrl: data.fileUrl, fileName: selectedFile.name, fileSize: selectedFile.size, fileType: selectedFile.type, waveform: data.waveform, messageId: data.messageId });
      showToast(`${msgType.charAt(0).toUpperCase() + msgType.slice(1)} sent`, 'success');
      if (isAudio && data.messageId) {
        const mid = data.messageId;
        extractWaveformFromFile(selectedFile).then(({ waveform, duration }) => {
          setMessages(prev => prev.map(m => m.id === mid ? { ...m, waveformData: waveform, duration } : m));
          fetch(`${API}/api/messages/${mid}/waveform`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ waveform, duration }) }).catch(console.error);
        }).catch(console.error);
      }
      cancelFileSelection();
    } catch (err) { console.error(err); showToast('Failed to send file', 'error'); }
    finally { setUploadingFile(false); }
  };

  // ── Voice recording ──────────────────────────────────
  const handleVoiceRecording = async (audioBlob: Blob, waveformData: number[]) => {
    if (!testRecipientId || !socket || !effectivelyOnline) { showToast('Cannot send voice message', 'error'); return; }
    setUploadingFile(true);
    const token = localStorage.getItem('token');
    try {
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: audioBlob.type });
      const fd = new FormData();
      fd.append('file', audioFile); fd.append('recipientId', testRecipientId);
      fd.append('type', 'audio'); fd.append('waveform', JSON.stringify(waveformData));
      const res = await fetch(`${API}/api/messages/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!res.ok) { showToast('Upload failed', 'error'); return; }
      const data = await res.json();
      const duration = waveformData.length / 10;
      const msg: Message = {
        id: data.messageId || Date.now().toString(), content: 'Voice message',
        senderId: currentUserId, recipientId: testRecipientId, direction: 'sent', status: 'sent',
        timestamp: new Date(), type: 'audio', fileUrl: data.fileUrl,
        fileName: audioFile.name, fileSize: audioFile.size, fileType: audioFile.type, waveformData, duration,
      };
      setMessages(prev => [...prev, msg]);
      addLog('sent', 'voice:upload', { fileName: audioFile.name, duration, messageId: data.messageId });
      socket.emit('message:send', { recipientId: testRecipientId, content: 'Voice message', type: 'audio', fileUrl: data.fileUrl, fileName: audioFile.name, fileSize: audioFile.size, fileType: audioFile.type, waveform: waveformData, duration, messageId: data.messageId });
      showToast('Voice message sent', 'success');
    } catch (err) { console.error(err); showToast('Failed to send voice message', 'error'); }
    finally { setUploadingFile(false); }
  };

  // ── Typing / Presence ────────────────────────────────
  const handleTypingStart = () => {
    if (!socket || !effectivelyOnline || !testRecipientId) { showToast('Not connected', 'error'); return; }
    addLog('sent', 'typing:start', { recipientId: testRecipientId });
    socket.emit('typing:start', { recipientId: testRecipientId }); showToast('Typing started', 'success');
  };
  const handleTypingStop = () => {
    if (!socket || !effectivelyOnline || !testRecipientId) { showToast('Not connected', 'error'); return; }
    addLog('sent', 'typing:stop', { recipientId: testRecipientId });
    socket.emit('typing:stop', { recipientId: testRecipientId }); showToast('Typing stopped', 'success');
  };
  const handlePresenceUpdate = (status: 'online' | 'away') => {
    if (!socket || !effectivelyOnline) { showToast('Not connected', 'error'); return; }
    addLog('sent', 'presence:update', { status });
    socket.emit('presence:update', status); showToast(`Presence: ${status}`, 'success');
  };
  const handlePresenceRequest = () => {
    if (!socket || !effectivelyOnline || !testRecipientId) { showToast('Not connected', 'error'); return; }
    addLog('sent', 'presence:request', { userIds: [testRecipientId] });
    socket.emit('presence:request', [testRecipientId]); showToast('Presence requested', 'success');
  };
  const handleGhostTypingToggle = (val: boolean) => {
    setGhostTypingEnabled(val);
    if (!val) {
      setRecipientGhostText('');
      if (socket && effectivelyOnline && testRecipientId) {
        addLog('sent', 'ghost:typing', { recipientId: testRecipientId, text: '' });
        socket.emit('ghost:typing', { recipientId: testRecipientId, text: '' });
      }
    }
    addLog('info', 'ghost:typing:toggle', { enabled: val });
    showToast(val ? 'Ghost typing on' : 'Ghost typing off', 'info');
  };

  const handleAudioRecordingStart = () => {
    const s = socketRef.current; const r = testRecipientIdRef.current; const o = effectivelyOnlineRef.current;
    if (s && o && r) { addLog('sent', 'audio:recording', { recipientId: r, isRecording: true }); s.emit('audio:recording', { recipientId: r, isRecording: true }); }
  };
  const handleAudioRecordingStop = () => {
    const s = socketRef.current; const r = testRecipientIdRef.current; const o = effectivelyOnlineRef.current;
    if (s && o && r) { addLog('sent', 'audio:recording', { recipientId: r, isRecording: false }); s.emit('audio:recording', { recipientId: r, isRecording: false }); }
  };
  const handleAudioPlayStatusChange = (messageId: string, senderId: string, isPlaying: boolean, isEnded?: boolean) => {
    const s = socketRef.current; const o = effectivelyOnlineRef.current;
    if (s && o) {
      addLog('sent', 'audio:listening', { senderId, messageId, isListening: isPlaying, isEnded: isEnded === true });
      s.emit('audio:listening', { senderId, messageId, isListening: isPlaying, isEnded: isEnded === true });
    }

    if (isPlaying) {
      // A new player started — make it the active one (stops all others via prop)
      setActiveAudioMessageId(messageId);
    } else if (isEnded) {
      // This message finished — check if the IMMEDIATELY next message in the
      // full thread is also an audio message. If yes, auto-play it.
      // Stop if the next message is text, image, file or there are no more messages.
      setActiveAudioMessageId(null);

      const msgs = messagesRef.current;
      const currentIdx = msgs.findIndex(m => m.id === messageId);

      if (currentIdx >= 0 && currentIdx < msgs.length - 1) {
        const next = msgs[currentIdx + 1];
        const isNextAudio =
          next.fileUrl &&
          (next.type === 'audio' || (next.type === 'file' && next.fileType?.startsWith('audio/')));

        if (isNextAudio) {
          // Small defer so the ended player's state resets before we activate the next
          setTimeout(() => setActiveAudioMessageId(next.id), 80);
        }
      }
      // Otherwise stop — text / image / file boundary, or end of thread
    } else {
      // Paused
      setActiveAudioMessageId(null);
    }
  };

  // ── Reactions ────────────────────────────────────────
  const handleReaction = useCallback((messageId: string, emoji: string) => {
    const s = socketRef.current;
    const o = effectivelyOnlineRef.current;
    if (!s || !o) { showToast('Not connected', 'error'); return; }
    addLog('sent', 'message:react', { messageId, emoji });
    s.emit('message:react', { messageId, emoji });
    // Optimistic update: toggle this user's reaction in the local array
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const existing = m.reactions ?? [];
      const myReaction = existing.find(r => r.userId === currentUserId);
      let next: MessageReaction[];
      if (myReaction?.emoji === emoji) {
        // Same emoji — remove
        next = existing.filter(r => r.userId !== currentUserId);
      } else if (myReaction) {
        // Different emoji — replace
        next = existing.map(r => r.userId === currentUserId ? { ...r, emoji } : r);
      } else {
        // New reaction
        next = [...existing, { userId: currentUserId, username: 'You', emoji }];
      }
      return { ...m, reactions: next };
    }));
  }, [addLog, showToast, currentUserId]);

  // ── Unsend ───────────────────────────────────────────
  const handleUnsend = useCallback((messageId: string) => {
    const s = socketRef.current;
    const o = effectivelyOnlineRef.current;
    if (!s || !o) { showToast('Not connected', 'error'); return; }
    addLog('sent', 'message:unsend', { messageId });
    s.emit('message:unsend', messageId);
    // Optimistic: mark as unsent locally immediately
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, unsent: true, reactions: [] } : m
    ));
  }, [addLog, showToast]);

  // ── Log helpers ──────────────────────────────────────
  const clearLogs = () => { setLogs([]); addLog('info', 'logs:cleared', {}); };
  const clearMessages = () => { setMessages([]); addLog('info', 'messages:cleared', {}); };
  const copyLogs = () => {
    navigator.clipboard.writeText(logs.map(l => `[${l.timestamp.toLocaleTimeString()}] [${l.type.toUpperCase()}] ${l.event}: ${JSON.stringify(l.data)}`).join('\n'));
    showToast('Logs copied', 'success');
  };
  const handleManualOfflineChange = (val: boolean) => {
    setManualOffline(val);
    if (val) {
      // Going offline — tell server we're offline then drop the connection
      if (socket && connected) {
        addLog('sent', 'presence:update', { status: 'offline', trigger: 'manual-offline' });
        socket.emit('presence:update', 'offline');
        // Small delay so the event reaches the server before disconnect
        setTimeout(() => disconnect(), 150);
      }
      addLog('info', 'manual-offline:enabled', {});
    } else {
      // Coming back online — reconnect
      addLog('info', 'manual-offline:disabled', {});
      reconnect();
    }
  };
  const handleRecipientChange = (id: string) => {
    setTestRecipientId(id);
    setMessages([]);
    // Clear unread for this conversation
    setConversations(prev => prev[id] ? { ...prev, [id]: { ...prev[id], unreadCount: 0 } } : prev);
    addLog('info', 'recipient:selected', { userId: id });
    // Load message history
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    fetch(`${API}/api/messages/history?otherUserId=${id}&limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const currentId = JSON.parse(localStorage.getItem('user') || '{}').id || '';
        const mapped: Message[] = (data.messages || []).map((m: any) => ({
          id: m.id,
          content: m.content,
          senderId: m.senderId,
          senderUsername: m.senderUsername,
          recipientId: m.recipientId,
          direction: m.senderId === currentId ? 'sent' : 'received',
          status: m.status || 'sent',
          timestamp: new Date(m.createdAt || m.timestamp),
          type: m.type || 'text',
          fileUrl: m.fileUrl,
          fileName: m.fileName,
          fileSize: m.fileSize,
          fileType: m.fileType,
          waveformData: m.waveform,
          duration: m.duration,
          reactions: m.reactions ?? [],
          replyTo: m.replyTo ?? undefined,
          senderProfileImage: m.senderProfileImage ?? null,
          senderDisplayName: m.senderDisplayName ?? null,
          unsent: !!m.unsent,
        }));
        setMessages(mapped);
        addLog('info', 'history:loaded', { count: mapped.length, userId: id });
      })
      .catch(err => addLog('error', 'history:load-failed', { error: err, userId: id }));
  };

  return {
    // State
    logs, messages, messageQueue,
    testRecipientId, testMessage, currentUserId,
    manualOffline, setManualOffline: handleManualOfflineChange,
    availableUsers, loadingUsers,
    conversations,
    isRecipientTyping, isUserTyping,
    ghostTypingEnabled,
    recipientGhostText,
    isRecipientRecording, isRecipientListeningToMyAudio,
    listeningMessageIds,
    activeAudioMessageId,
    selectedFile, filePreviewUrl, uploadingFile,
    effectivelyOnline,
    userPresence,
    // Refs for render
    logsEndRef, messagesEndRef,
    // Handlers
    handleMessageSend,
    handleMessageInputChange,
    handleFileSelect,
    cancelFileSelection,
    sendFile,
    handleVoiceRecording,
    handleAudioRecordingStart,
    handleAudioRecordingStop,
    handleAudioPlayStatusChange,
    handleReaction,
    handleUnsend,
    handleReply: (msg: Message) => setReplyingTo(msg),
    clearReply: () => setReplyingTo(null),
    replyingTo,
    handleTypingStart,
    handleTypingStop,
    handlePresenceUpdate,
    handlePresenceRequest,
    handleGhostTypingToggle,
    handleRecipientChange,
    clearLogs,
    clearMessages,
    copyLogs,
  };
}

