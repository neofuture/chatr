'use client';

import { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import Select from '@/components/form-controls/Select/Select';
import Input from '@/components/form-controls/Input/Input';
import Button from '@/components/form-controls/Button/Button';
import Lightbox from '@/components/Lightbox/Lightbox';
import MessageBubble, { type Message } from '@/components/MessageBubble';
import VoiceRecorder from '@/components/VoiceRecorder';
import { extractWaveformFromFile } from '@/utils/extractWaveform';

interface LogEntry {
  id: string;
  type: 'sent' | 'received' | 'info' | 'error';
  event: string;
  data: any;
  timestamp: Date;
}

export default function TestPage() {
  const { socket, connected, connecting } = useWebSocket();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const [testRecipientId, setTestRecipientId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [manualOffline, setManualOffline] = useState(false); // Manual override
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isRecipientTyping, setIsRecipientTyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [ghostTypingEnabled, setGhostTypingEnabled] = useState(false);
  const [recipientGhostText, setRecipientGhostText] = useState('');
  const [isRecipientRecording, setIsRecipientRecording] = useState(false);
  const [isRecipientListeningToMyAudio, setIsRecipientListeningToMyAudio] = useState<string | null>(null);
  const [listeningMessageIds, setListeningMessageIds] = useState<Set<string>>(new Set()); // messages being listened to right now
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // File to upload
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null); // Preview URL for images
  const [uploadingFile, setUploadingFile] = useState(false); // Upload in progress
  const [lightboxOpen, setLightboxOpen] = useState(false); // Lightbox state
  const [lightboxImageUrl, setLightboxImageUrl] = useState(''); // Image URL for lightbox
  const [lightboxImageName, setLightboxImageName] = useState(''); // Image name for lightbox
  const fileInputRef = useRef<HTMLInputElement>(null); // File input ref
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Auto-stop typing after 3s
  const ghostTypingThrottleRef = useRef<NodeJS.Timeout | null>(null); // Throttle ghost typing updates
  const logsEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Refs for stale-closure-safe access in callbacks
  const socketRef = useRef(socket);
  const testRecipientIdRef = useRef(testRecipientId);
  const effectivelyOnlineRef = useRef(connected && !manualOffline);
  const isDark = theme === 'dark';

  // Effective connection status (real connection AND manual override)
  const effectivelyOnline = connected && !manualOffline;

  // Keep refs in sync with latest values (for stale-closure-safe callbacks)
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { testRecipientIdRef.current = testRecipientId; }, [testRecipientId]);
  useEffect(() => { effectivelyOnlineRef.current = effectivelyOnline; }, [effectivelyOnline]);

  // Get current user
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData && userData !== 'undefined') {
      try {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
        addLog('info', 'user:loaded', { userId: user.id, username: user.username });
      } catch (e) {
        addLog('error', 'user:parse-failed', { error: e });
      }
    }
  }, []);

  // Fetch available users for recipient dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      if (!token || !currentUserId) return;

      setLoadingUsers(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Filter out current user and only show verified users
          const otherUsers = data.users
            .filter((u: any) => u.id !== currentUserId && u.emailVerified)
            .map((u: any) => ({
              id: u.id,
              username: u.username,
              email: u.email || 'No email',
            }));

          setAvailableUsers(otherUsers);
          addLog('info', 'users:loaded', { count: otherUsers.length });

          // Auto-select the first user if available
          if (otherUsers.length > 0 && !testRecipientId) {
            setTestRecipientId(otherUsers[0].id);
            addLog('info', 'recipient:auto-selected', { userId: otherUsers[0].id, username: otherUsers[0].username });
          }
        } else {
          addLog('error', 'users:load-failed', { status: response.status });
        }
      } catch (error) {
        addLog('error', 'users:fetch-error', { error });
      } finally {
        setLoadingUsers(false);
      }
    };

    if (currentUserId) {
      fetchUsers();
    }
  }, [currentUserId]);

  // Process message queue when going online
  useEffect(() => {
    if (effectivelyOnline && messageQueue.length > 0 && socket) {
      addLog('info', 'queue:processing', { count: messageQueue.length });

      // Process each queued message
      const processQueue = async () => {
        for (const queuedMsg of messageQueue) {
          // Update status to sending
          setMessages(prev => prev.map(m =>
            m.id === queuedMsg.id ? { ...m, status: 'sending' } : m
          ));

          // Send the message
          socket.emit('message:send', {
            recipientId: queuedMsg.recipientId,
            content: queuedMsg.content,
            type: 'text',
          }, (response: any) => {
            if (response?.error) {
              addLog('error', 'queue:send-failed', { messageId: queuedMsg.id, error: response.error });
              setMessages(prev => prev.map(m =>
                m.id === queuedMsg.id ? { ...m, status: 'failed' } : m
              ));
            } else {
              addLog('info', 'queue:sent', { messageId: queuedMsg.id });
            }
          });

          // Small delay between messages
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      };

      processQueue().then(() => {
        // Clear the queue after all messages are sent
        setMessageQueue([]);
        addLog('info', 'queue:cleared', { processedCount: messageQueue.length });
      });
    }
  }, [effectivelyOnline, socket]); // Removed messageQueue from dependencies to avoid infinite loop

  // Add log entry (filtered - only important activities)
  const addLog = (type: LogEntry['type'], event: string, data: any) => {
    // Filter out non-essential events - only keep message-related logs
    const ignoredEvents = [
      // Removed typing events - now shown for debugging
      // 'typing:start',
      // 'typing:stop',
      // 'typing:status',
      'user:status',
      'presence:update',
      'presence:request',
      'presence:response',
    ];

    // Skip if event is in ignored list
    if (ignoredEvents.includes(event)) {
      return;
    }

    const logEntry: LogEntry = {
      id: Date.now().toString() + Math.random(),
      type,
      event,
      data,
      timestamp: new Date(),
    };
    setLogs(prev => [logEntry, ...prev].slice(0, 100)); // Keep last 100
    console.log(`[${type.toUpperCase()}] ${event}:`, data);
  };

  // Listen to all WebSocket events
  useEffect(() => {
    if (!socket) {
      addLog('info', 'socket:not-initialized', {});
      return;
    }

    addLog('info', 'socket:initialized', { connected, connecting });

    // Listen for message events
    const handleMessageReceived = (data: any) => {
      addLog('received', 'message:received', data);

      // Add to messages list
      const newMessage: Message = {
        id: data.id || Date.now().toString(),
        content: data.content,
        senderId: data.senderId,
        recipientId: currentUserId,
        direction: 'received',
        status: 'delivered',
        timestamp: new Date(data.timestamp || Date.now()),
        type: data.type || 'text',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        waveformData: data.waveform || data.waveformData,
        duration: data.duration,
      };

      console.log('📥 Received message:', newMessage);

      setMessages(prev => [...prev, newMessage]);

      // Send delivery receipt - but NOT for audio (those are marked read only when listened)
      if (socket && data.type !== 'audio') {
        socket.emit('message:read', data.id);
        addLog('sent', 'message:read', { messageId: data.id });
      }
    };

    const handleMessageSent = (data: any) => {
      addLog('received', 'message:sent', data);

      // Update message status - match by temp ID (text) or real DB ID (voice/file)
      setMessages(prev => prev.map(m => {
        // Text messages: match by recipientId + 'sending' status, update ID to real DB ID
        if (m.recipientId === data.recipientId && m.status === 'sending') {
          return { ...m, id: data.id || m.id, status: data.status || 'sent' };
        }
        // Voice/file messages: already have real DB ID, just update status
        if (m.id === data.id && m.status === 'sent') {
          return { ...m, status: data.status || 'delivered' };
        }
        return m;
      }));
    };

    const handleMessageStatus = (data: any) => {
      addLog('received', 'message:status', data);

      // Update message status
      setMessages(prev => prev.map(m =>
        m.id === data.messageId
          ? { ...m, status: data.status }
          : m
      ));
    };

    const handleTypingStatus = (data: any) => {
      console.log('🔵 Typing status received:', data);
      console.log('🔵 Current recipient ID:', testRecipientId);

      // Log to system logs for debugging
      addLog('received', 'typing:status', data);

      // Backend sends: { userId, username, isTyping, type }
      const senderId = data.userId;
      const isTyping = data.isTyping;

      // Only show typing indicator if it's from the selected recipient
      if (senderId === testRecipientId) {
        console.log(`✅ ${isTyping ? 'Showing' : 'Hiding'} typing indicator for:`, senderId);
        setIsRecipientTyping(isTyping);

        if (isTyping) {
          // Clear any existing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          // Auto-hide typing indicator after 3 seconds
          typingTimeoutRef.current = setTimeout(() => {
            console.log('⏱️ Typing indicator timeout - hiding');
            setIsRecipientTyping(false);
          }, 3000);
        } else {
          // Clear timeout when stop is received
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          // Clear ghost text when typing stops
          if (ghostTypingEnabled) {
            setRecipientGhostText('');
          }
        }
      } else {
        console.log('❌ Ignoring typing from:', senderId, '(not selected recipient)');
      }
    };

    // Handle ghost typing updates
    const handleGhostTyping = (data: any) => {
      const senderId = data.userId || data.senderId;
      const text = data.text || '';

      // Show ghost text if it's from the selected recipient (receiver doesn't need ghost mode enabled)
      if (senderId === testRecipientId) {
        setRecipientGhostText(text);
        console.log('👻 Ghost typing update:', text.substring(0, 20) + (text.length > 20 ? '...' : ''));
      }
    };

    // Listen to important WebSocket events only (messages and connection)
    const events = [
      'connect',
      'disconnect',
      'connect_error',
      'error',
      // Typing and presence events are handled but not logged (filtered in addLog)
    ];

    const handlers: Record<string, (data: any) => void> = {};

    events.forEach(event => {
      handlers[event] = (data: any) => {
        addLog('received', event, data);
      };
      socket.on(event, handlers[event]);
    });

    // Add message-specific handlers (these ARE logged)
    socket.on('message:received', handleMessageReceived);
    socket.on('message:sent', handleMessageSent);
    socket.on('message:status', handleMessageStatus);

    // Add typing handler (NOT logged but displayed in messages view)
    socket.on('typing:status', handleTypingStatus);

    // Add ghost typing handler (real-time typing preview)
    socket.on('ghost:typing', handleGhostTyping);

    // Handle audio:recording - someone is recording a voice note for us
    const handleAudioRecording = (data: any) => {
      console.log('🎙️ [audio:recording received]', data, '| current testRecipientId:', testRecipientId);
      setIsRecipientRecording(data.isRecording === true);
      addLog('received', 'audio:recording', data);
      // Auto-clear after 10 seconds as failsafe
      if (data.isRecording) {
        setTimeout(() => setIsRecipientRecording(false), 10000);
      }
    };
    socket.on('audio:recording', handleAudioRecording);

    // Handle audio:listening - someone is listening to our audio message
    const handleAudioListening = (data: any) => {
      console.log('🎧 [audio:listening received]', data);
      addLog('received', 'audio:listening', data);
      const msgId = data.messageId;
      if (data.isListening === true && msgId) {
        // Add to actively-listening set → shows "Listening..." under the bubble
        setListeningMessageIds(prev => new Set(prev).add(msgId));
        setIsRecipientListeningToMyAudio(msgId);
      } else if (msgId) {
        // Remove from set → "Listening..." disappears; status update from BE will set "Listened"
        setListeningMessageIds(prev => { const s = new Set(prev); s.delete(msgId); return s; });
        setIsRecipientListeningToMyAudio(null);
      }
    };
    socket.on('audio:listening', handleAudioListening);

    // Handle audio:waveform - real waveform data ready after server-side analysis
    const handleAudioWaveform = (data: any) => {
      console.log('🎵 [audio:waveform received]', { messageId: data.messageId, bars: data.waveform?.length, duration: data.duration });
      if (data.messageId && data.waveform) {
        setMessages(prev => prev.map(m =>
          m.id === data.messageId
            ? { ...m, waveformData: data.waveform, duration: data.duration || m.duration }
            : m
        ));
      }
    };
    socket.on('audio:waveform', handleAudioWaveform);

    return () => {
      events.forEach(event => {
        if (handlers[event]) {
          socket.off(event, handlers[event]);
        }
      });
      socket.off('message:received', handleMessageReceived);
      socket.off('message:sent', handleMessageSent);
      socket.off('message:status', handleMessageStatus);
      socket.off('typing:status', handleTypingStatus);
      socket.off('ghost:typing', handleGhostTyping);
      socket.off('audio:recording', handleAudioRecording);
      socket.off('audio:listening', handleAudioListening);
      socket.off('audio:waveform', handleAudioWaveform);

      // Clean up timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (userTypingTimeoutRef.current) {
        clearTimeout(userTypingTimeoutRef.current);
      }
    };
  }, [socket, connected, connecting, currentUserId, testRecipientId]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Test: Send message
  const testSendMessage = () => {
    if (!testRecipientId) {
      showToast('Enter recipient ID', 'error');
      return;
    }
    if (!testMessage) {
      showToast('Enter test message', 'error');
      return;
    }

    // Stop typing indicator when sending
    if (isUserTyping && socket && effectivelyOnline) {
      socket.emit('typing:stop', { recipientId: testRecipientId });
      setIsUserTyping(false);
      if (userTypingTimeoutRef.current) {
        clearTimeout(userTypingTimeoutRef.current);
      }
    }

    // Clear ghost typing when sending message
    if (ghostTypingEnabled && socket && effectivelyOnline && testRecipientId) {
      socket.emit('ghost:typing', {
        recipientId: testRecipientId,
        text: '' // Clear the ghost text
      });
      console.log('👻 Cleared ghost typing (message sent)');
    }

    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      content: testMessage,
      senderId: currentUserId,
      recipientId: testRecipientId,
      direction: 'sent',
      status: effectivelyOnline ? 'sending' : 'queued',
      timestamp: new Date(),
    };

    // Add to messages list
    setMessages(prev => [...prev, newMessage]);

    if (!socket || !effectivelyOnline) {
      // Add to queue for later
      setMessageQueue(prev => [...prev, newMessage]);
      addLog('info', 'message:queued', { messageId: newMessage.id, queueLength: messageQueue.length + 1 });
      showToast(`Message queued (${manualOffline ? 'manually offline' : 'disconnected'})`, 'info');
      setTestMessage('');
      return;
    }

    // Send immediately
    addLog('sent', 'message:send', { recipientId: testRecipientId, content: testMessage });

    socket.emit('message:send', {
      recipientId: testRecipientId,
      content: testMessage,
      type: 'text',
    }, (response: any) => {
      if (response?.error) {
        addLog('error', 'message:send-failed', { error: response.error });
        setMessages(prev => prev.map(m =>
          m.id === newMessage.id ? { ...m, status: 'failed' } : m
        ));
      }
    });

    setTestMessage('');
    showToast('Message sent', 'success');
  };

  // Handle message input changes with automatic typing indicators
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTestMessage(value);

    // Only send typing indicators if recipient is selected and online
    if (!testRecipientId || !socket || !effectivelyOnline) {
      return;
    }

    // If user starts typing and wasn't already typing, send typing:start
    if (value.length > 0 && !isUserTyping) {
      socket.emit('typing:start', { recipientId: testRecipientId });
      setIsUserTyping(true);
      console.log('🔵 Sent typing:start (initial)');
    }

    // Send ghost typing update (throttled) if enabled
    if (ghostTypingEnabled) {
      // Clear existing throttle
      if (ghostTypingThrottleRef.current) {
        clearTimeout(ghostTypingThrottleRef.current);
      }

      // Throttle ghost typing updates to every 100ms (faster for real-time feel)
      ghostTypingThrottleRef.current = setTimeout(() => {
        if (socket && effectivelyOnline && testRecipientId) {
          socket.emit('ghost:typing', {
            recipientId: testRecipientId,
            text: value
          });
          console.log('👻 Sent ghost typing update:', value.substring(0, 20) + (value.length > 20 ? '...' : ''));
        }
      }, 100);
    }

    // Clear existing timeout
    if (userTypingTimeoutRef.current) {
      clearTimeout(userTypingTimeoutRef.current);
    }

    // If there's text, keep sending typing:start every 2 seconds
    if (value.length > 0) {
      userTypingTimeoutRef.current = setTimeout(() => {
        if (socket && effectivelyOnline && testRecipientId) {
          // Send another typing:start to keep indicator alive
          socket.emit('typing:start', { recipientId: testRecipientId });
          console.log('🔵 Re-sent typing:start (keep-alive)');

          // Set timeout to stop after 3 seconds of no new input
          userTypingTimeoutRef.current = setTimeout(() => {
            if (socket && effectivelyOnline) {
              socket.emit('typing:stop', { recipientId: testRecipientId });
              setIsUserTyping(false);
              console.log('🔵 Auto-sent typing:stop (inactivity timeout)');
            }
          }, 3000);
        }
      }, 2000); // Send keep-alive every 2 seconds
    } else {
      // If input is cleared, immediately stop typing
      if (isUserTyping) {
        socket.emit('typing:stop', { recipientId: testRecipientId });
        setIsUserTyping(false);
        console.log('🔵 Sent typing:stop (input cleared)');
      }

      // Clear ghost text when input is cleared
      if (ghostTypingEnabled && socket && effectivelyOnline && testRecipientId) {
        socket.emit('ghost:typing', {
          recipientId: testRecipientId,
          text: ''
        });
      }
    }
  };

  // Test: Typing indicator
  const testTypingStart = () => {
    if (!socket || !effectivelyOnline) {
      showToast('WebSocket not connected', 'error');
      return;
    }
    if (!testRecipientId) {
      showToast('Enter recipient ID', 'error');
      return;
    }

    socket.emit('typing:start', { recipientId: testRecipientId });
    showToast('Typing indicator sent', 'success');
  };

  const testTypingStop = () => {
    if (!socket || !effectivelyOnline) {
      showToast('WebSocket not connected', 'error');
      return;
    }
    if (!testRecipientId) {
      showToast('Enter recipient ID', 'error');
      return;
    }

    socket.emit('typing:stop', { recipientId: testRecipientId });
    showToast('Typing stop sent', 'success');
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showToast('File too large (max 10MB)', 'error');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }

    console.log('📎 File selected:', file.name, file.type, file.size);
  };

  // Cancel file selection
  const cancelFileSelection = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Send file
  const sendFile = async () => {
    if (!selectedFile || !testRecipientId) return;
    if (!socket || !effectivelyOnline) {
      showToast('Cannot send file while offline', 'error');
      return;
    }

    setUploadingFile(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('recipientId', testRecipientId);
      const isAudioFile = selectedFile.type.startsWith('audio/');
      formData.append('type', selectedFile.type.startsWith('image/') ? 'image' : isAudioFile ? 'audio' : 'file');

      // Upload to backend
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/messages/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      console.log('📎 File upload response:', data);

      const msgType = selectedFile.type.startsWith('image/') ? 'image' : isAudioFile ? 'audio' : 'file';

      // Create message with file info (include placeholder waveform for audio)
      const newMessage: Message = {
        id: data.messageId || Date.now().toString(),
        content: isAudioFile ? 'Voice message' : selectedFile.name,
        senderId: currentUserId,
        recipientId: testRecipientId,
        direction: 'sent',
        status: 'sent',
        timestamp: new Date(),
        type: msgType,
        fileUrl: data.fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        waveformData: data.waveform || undefined,
      };

      // Add to local messages
      setMessages(prev => [...prev, newMessage]);

      // Send via WebSocket
      if (socket && effectivelyOnline) {
        socket.emit('message:send', {
          recipientId: testRecipientId,
          content: isAudioFile ? 'Voice message' : selectedFile.name,
          type: msgType,
          fileUrl: data.fileUrl,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
          waveform: data.waveform,
          messageId: data.messageId,
        });
      }

      const label = selectedFile.type.startsWith('image/') ? 'Image' : isAudioFile ? 'Audio' : 'File';
      showToast(`${label} sent${data.needsWaveformGeneration ? ' (analysing waveform...)' : ' successfully'}`, 'success');

      // For audio files: decode waveform client-side (browser handles any codec) and push to backend
      if (isAudioFile && data.messageId) {
        const msgId = data.messageId;
        const token = localStorage.getItem('token');
        extractWaveformFromFile(selectedFile).then(({ waveform, duration }) => {
          // Update local state immediately
          setMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, waveformData: waveform, duration } : m
          ));
          // Push to backend → backend pushes audio:waveform to recipient too
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/messages/${msgId}/waveform`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ waveform, duration }),
          }).catch(e => console.error('Failed to update waveform:', e));
        }).catch(e => console.error('Waveform extraction failed:', e));
      }

      // Clear selection
      cancelFileSelection();

    } catch (error) {
      console.error('File upload error:', error);
      showToast('Failed to send file', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle voice recording completion
  const handleVoiceRecording = async (audioBlob: Blob, waveformData: number[]) => {
    if (!testRecipientId) {
      showToast('Please select a recipient', 'error');
      return;
    }

    if (!socket || !effectivelyOnline) {
      showToast('Cannot send voice message while offline', 'error');
      return;
    }

    setUploadingFile(true);
    addLog('info', 'voice:recording-complete', {
      size: audioBlob.size,
      waveformLength: waveformData.length
    });

    try {
      // Create a File object from the Blob
      const audioFile = new File(
        [audioBlob],
        `voice-${Date.now()}.webm`,
        { type: audioBlob.type }
      );

      // Create FormData
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('recipientId', testRecipientId);
      formData.append('type', 'audio');
      formData.append('waveform', JSON.stringify(waveformData));

      // Upload to backend
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/messages/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      addLog('info', 'voice:upload-success', { fileUrl: data.fileUrl, messageId: data.messageId });

      // Calculate duration from waveform data (~10 samples per second)
      const estimatedDuration = waveformData.length / 10;

      // Create message with audio info
      const newMessage: Message = {
        id: data.messageId || Date.now().toString(),
        content: 'Voice message',
        senderId: currentUserId,
        recipientId: testRecipientId,
        direction: 'sent',
        status: 'sent',
        timestamp: new Date(),
        type: 'audio',
        fileUrl: data.fileUrl,
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileType: audioFile.type,
        waveformData: waveformData,
        duration: estimatedDuration,
      };

      // Add to local messages
      setMessages(prev => [...prev, newMessage]);

      // Send voice message via WebSocket to recipient (using existing messageId from upload)
      if (socket && effectivelyOnline) {
        socket.emit('message:send', {
          recipientId: testRecipientId,
          content: 'Voice message',
          type: 'audio',
          fileUrl: data.fileUrl,
          fileName: audioFile.name,
          fileSize: audioFile.size,
          fileType: audioFile.type,
          waveform: waveformData,
          duration: estimatedDuration,
          messageId: data.messageId, // Use existing DB record - no duplicate created
        });
        addLog('sent', 'voice:message-sent', {
          recipientId: testRecipientId,
          fileName: audioFile.name,
          fileUrl: data.fileUrl,
        });
      }

      showToast('Voice message sent successfully', 'success');

    } catch (error) {
      console.error('Voice message error:', error);
      addLog('error', 'voice:send-failed', { error });
      showToast('Failed to send voice message', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  // Test: Presence
  const testPresenceUpdate = (status: 'online' | 'away') => {
    if (!socket || !effectivelyOnline) {
      showToast('WebSocket not connected', 'error');
      return;
    }

    socket.emit('presence:update', status);
    showToast(`Presence updated: ${status}`, 'success');
  };

  const testPresenceRequest = () => {
    if (!socket || !effectivelyOnline) {
      showToast('WebSocket not connected', 'error');
      return;
    }
    if (!testRecipientId) {
      showToast('Enter recipient ID', 'error');
      return;
    }

    socket.emit('presence:request', [testRecipientId]);
    showToast('Presence requested', 'success');
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'logs:cleared', {});
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
    addLog('info', 'messages:cleared', {});
  };

  // Copy logs to clipboard
  const copyLogs = () => {
    const logsText = logs.map(log =>
      `[${log.timestamp.toLocaleTimeString()}] [${log.type.toUpperCase()}] ${log.event}: ${JSON.stringify(log.data)}`
    ).join('\n');

    navigator.clipboard.writeText(logsText);
    showToast('Logs copied to clipboard', 'success');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%', // Fit within parent (app layout)
      width: '100%',  // Full width of parent
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      overflow: 'hidden', // No scrolling on main container
    }}>

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden', // No scrolling
        height: '100%', // Full height
      }}>
        {/* Left Panel - Controls */}
        <div style={{
          width: '350px',
          minWidth: '350px', // Prevent shrinking
          maxWidth: '350px', // Prevent growing
          height: '100%',
          padding: '20px',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderRight: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>

          {/* Connection Status Box */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: '8px',
            border: `2px solid ${effectivelyOnline ? '#10b981' : '#ef4444'}`,
          }}>

            {/* API Configuration */}
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', opacity: 0.7 }}>
                <i className="fas fa-cog" style={{ marginRight: '6px' }}></i>API CONFIGURATION
              </div>
              {[
                { label: 'API URL', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001 (default)' },
                { label: 'WS URL', value: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001 (default)' },
                { label: 'App', value: process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr (default)' },
                { label: 'Version', value: (require('@/version').version) },
                { label: 'Env', value: process.env.NODE_ENV || 'unknown' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', gap: '8px', fontSize: '11px', marginBottom: '4px', fontFamily: 'monospace' }}>
                  <span style={{ opacity: 0.5, minWidth: '60px' }}>{label}:</span>
                  <span style={{
                    color: value.includes('default') ? '#f59e0b' : '#10b981',
                    wordBreak: 'break-all',
                  }}>{value}</span>
                </div>
              ))}
            </div>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', opacity: 0.7 }}>
                CONNECTION STATUS
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                borderRadius: '6px',
                backgroundColor: effectivelyOnline
                  ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)')
                  : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: effectivelyOnline ? '#10b981' : '#ef4444',
                  animation: effectivelyOnline ? 'pulse 2s ease-in-out infinite' : 'none',
                }}></div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: effectivelyOnline ? '#10b981' : '#ef4444',
                }}>
                  {effectivelyOnline ? <><i className="fas fa-check-circle"></i> Connected</> : <><i className="fas fa-times-circle"></i> Disconnected</>}
                </div>
              </div>
              {manualOffline && (
                <div style={{
                  marginTop: '6px',
                  fontSize: '11px',
                  opacity: 0.7,
                  fontStyle: 'italic',
                }}>
                  (Manually offline)
                </div>
              )}
            </div>

            {/* Manual Offline Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>
                  Manual Offline
                </div>
                <div style={{ fontSize: '11px', opacity: 0.6 }}>
                  Simulate offline mode
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '44px',
                height: '24px',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={manualOffline}
                  onChange={(e) => {
                    setManualOffline(e.target.checked);
                    showToast(
                      e.target.checked ? 'Manual offline mode enabled' : 'Manual offline mode disabled',
                      e.target.checked ? 'warning' : 'success'
                    );
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: manualOffline ? '#ef4444' : (isDark ? '#374151' : '#d1d5db'),
                  transition: '0.3s',
                  borderRadius: '34px',
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '',
                    height: '18px',
                    width: '18px',
                    left: manualOffline ? '23px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    transition: '0.3s',
                    borderRadius: '50%',
                  }}></span>
                </span>
              </label>
            </div>

            {/* Typing Indicators Status */}
            {(isUserTyping || isRecipientTyping || isRecipientRecording || isRecipientListeningToMyAudio) && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              }}>
                {isUserTyping && (
                  <div style={{
                    fontSize: '12px',
                    marginBottom: '4px',
                    opacity: 0.8,
                  }}>
                    <i className="fas fa-keyboard"></i> You are typing...
                  </div>
                )}
                {isRecipientTyping && (
                  <div style={{
                    fontSize: '12px',
                    opacity: 0.8,
                    color: '#f97316',
                    marginBottom: '4px',
                  }}>
                    <i className="fas fa-keyboard"></i> Recipient is typing...
                  </div>
                )}
                {isRecipientRecording && (
                  <div style={{
                    fontSize: '12px',
                    opacity: 0.9,
                    color: '#ef4444',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <i className="fas fa-microphone" style={{ animation: 'pulse 1s ease-in-out infinite' }}></i>
                    Recipient is recording a voice note...
                  </div>
                )}
                {isRecipientListeningToMyAudio && (
                  <div style={{
                    fontSize: '12px',
                    opacity: 0.9,
                    color: '#8b5cf6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <i className="fas fa-headphones"></i>
                    Recipient is listening to your voice note...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Controls */}
          <div style={{ marginBottom: '20px' }}>
            {loadingUsers ? (
              <div style={{
                padding: '10px',
                textAlign: 'center',
                fontSize: '14px',
                opacity: 0.7,
              }}>
                Loading users...
              </div>
            ) : availableUsers.length === 0 ? (
              <div style={{
                padding: '10px',
                textAlign: 'center',
                fontSize: '14px',
                opacity: 0.7,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                borderRadius: '8px',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              }}>
                No other users available
              </div>
            ) : (
              <Select
                label="Select Recipient"
                value={testRecipientId}
                onChange={(e) => {
                  setTestRecipientId(e.target.value);
                  if (e.target.value) {
                    const selectedUser = availableUsers.find(u => u.id === e.target.value);
                    addLog('info', 'recipient:selected', {
                      userId: e.target.value,
                      username: selectedUser?.username
                    });
                  }
                }}
              >
                <option value="">-- Choose a user --</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </Select>
            )}
          </div>

          {/* Ghost Typing Mode Toggle */}
          {testRecipientId && (
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
              borderRadius: '8px',
              border: `1px solid ${ghostTypingEnabled ? '#8b5cf6' : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)')}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    <i className="fas fa-ghost"></i> Ghost Typing Mode
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.7 }}>
                    Show what you&#39;re typing in real-time
                  </div>
                </div>
                <label style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '44px',
                  height: '24px',
                  cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={ghostTypingEnabled}
                    onChange={(e) => {
                      setGhostTypingEnabled(e.target.checked);
                      if (!e.target.checked) {
                        // Clear ghost text when disabling
                        setRecipientGhostText('');
                        if (socket && effectivelyOnline && testRecipientId) {
                          socket.emit('ghost:typing', {
                            recipientId: testRecipientId,
                            text: ''
                          });
                        }
                      }
                      showToast(
                        e.target.checked ? 'Ghost typing enabled' : 'Ghost typing disabled',
                        e.target.checked ? 'success' : 'info'
                      );
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: ghostTypingEnabled ? '#8b5cf6' : '#94a3b8',
                    transition: '0.3s',
                    borderRadius: '24px',
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: ghostTypingEnabled ? '23px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '0.3s',
                      borderRadius: '50%',
                    }}></span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Message Test */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              <i className="fas fa-comments"></i> Message Test
            </h3>
            <Input
              type="text"
              value={testMessage}
              onChange={handleMessageInputChange}
              placeholder="Type test message"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  testSendMessage();
                }
              }}
              style={{ marginBottom: '8px' }}
            />
            <Button
              variant="orange"
              fullWidth
              onClick={testSendMessage}
              disabled={!effectivelyOnline}
            >
              Send Message
            </Button>

            {/* File Upload */}
            <div style={{ marginTop: '12px' }}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx,.txt,.zip,.mp3,.wav,.ogg,.m4a,audio/*"
              />
              <Button
                variant="blue"
                fullWidth
                onClick={() => fileInputRef.current?.click()}
                disabled={!effectivelyOnline || uploadingFile}
                icon={<i className="fas fa-paperclip"></i>}
              >
                {uploadingFile ? 'Uploading...' : 'Attach File/Image'}
              </Button>
            </div>

            {/* File Preview */}
            {selectedFile && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                border: `1px solid #3b82f6`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    <i className="fas fa-paperclip"></i> {selectedFile.name}
                  </div>
                  <button
                    onClick={cancelFileSelection}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
                  {(selectedFile.size / 1024).toFixed(2)} KB • {selectedFile.type || 'Unknown type'}
                </div>
                {filePreviewUrl && (
                  <img
                    src={filePreviewUrl}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                    }}
                  />
                )}
                <Button
                  variant="green"
                  fullWidth
                  onClick={sendFile}
                  disabled={uploadingFile || !effectivelyOnline}
                >
                  {uploadingFile ? 'Sending...' : 'Send File'}
                </Button>
              </div>
            )}
          </div>

          {/* Voice Recorder */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              <i className="fas fa-microphone"></i> Voice Message
            </h3>
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecording}
              disabled={!effectivelyOnline || uploadingFile || !testRecipientId}
              onRecordingStart={() => {
                const s = socketRef.current;
                const recipientId = testRecipientIdRef.current;
                const online = effectivelyOnlineRef.current;
                console.log('🎙️ onRecordingStart called', { hasSocket: !!s, recipientId, online });
                if (s && online && recipientId) {
                  s.emit('audio:recording', { recipientId, isRecording: true });
                  console.log('🎙️ Emitted audio:recording START to', recipientId);
                }
              }}
              onRecordingStop={() => {
                const s = socketRef.current;
                const recipientId = testRecipientIdRef.current;
                const online = effectivelyOnlineRef.current;
                console.log('🎙️ onRecordingStop called', { hasSocket: !!s, recipientId, online });
                if (s && online && recipientId) {
                  s.emit('audio:recording', { recipientId, isRecording: false });
                  console.log('🎙️ Emitted audio:recording STOP to', recipientId);
                }
              }}
            />
            {!testRecipientId && (
              <div style={{
                marginTop: '8px',
                padding: '8px',
                borderRadius: '6px',
                backgroundColor: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                color: isDark ? '#fbbf24' : '#d97706',
                fontSize: '12px',
                textAlign: 'center',
              }}>
                Select a recipient first
              </div>
            )}
          </div>

          {/* Typing Indicators Test */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              <i className="fas fa-keyboard"></i> Typing Indicators
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="blue"
                onClick={testTypingStart}
                disabled={!effectivelyOnline}
                style={{ flex: 1 }}
              >
                Start
              </Button>
              <Button
                variant="purple"
                onClick={testTypingStop}
                disabled={!effectivelyOnline}
                style={{ flex: 1 }}
              >
                Stop
              </Button>
            </div>
          </div>

          {/* Presence Test */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              <i className="fas fa-user-circle"></i> Presence
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <Button
                variant="green"
                onClick={() => testPresenceUpdate('online')}
                disabled={!effectivelyOnline}
                style={{ flex: 1 }}
              >
                Online
              </Button>
              <Button
                variant="orange"
                onClick={() => testPresenceUpdate('away')}
                disabled={!effectivelyOnline}
                style={{ flex: 1 }}
              >
                Away
              </Button>
            </div>
            <Button
              variant="purple"
              fullWidth
              onClick={testPresenceRequest}
              disabled={!effectivelyOnline}
            >
              Request Status
            </Button>
          </div>
        </div>

        {/* Right Panel - Split View: System Logs (Top) and Messages (Bottom) */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height: '100%', // Lock to full height
          minHeight: '100%', // Prevent shrinking
        }}>

          {/* SYSTEM LOGS SECTION - TOP HALF (Fixed 50%) */}
          <div style={{
            position: 'relative', // Positioning context for Chrome
            height: '50%',
            minHeight: '50%', // Lock to exactly 50%
            maxHeight: '50%', // Lock to exactly 50%
            display: 'flex',
            flexDirection: 'column',
            borderBottom: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'}`,
            overflow: 'hidden', // No overflow on container
          }}>
            {/* Log Header */}
            <div style={{
              height: '48px', // Fixed header height
              minHeight: '48px',
              maxHeight: '48px',
              padding: '12px 20px',
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0, // Don't shrink
            }}>
              <div>
                <span style={{ fontWeight: '600' }}><i className="fas fa-list-alt"></i> System Logs</span>
                <span style={{ marginLeft: '8px', fontSize: '14px', opacity: 0.7 }}>
                  ({logs.length})
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={copyLogs}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    color: isDark ? '#ffffff' : '#000000',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <i className="fas fa-copy"></i> Copy
                </button>
                <button
                  onClick={clearLogs}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <i className="fas fa-trash"></i> Clear
                </button>
              </div>
            </div>

            {/* Log Content */}
            <div style={{
              position: 'relative', // Important for Chrome
              flex: '1 1 0', // Flex with zero base - prevents content from expanding
              height: 0, // Force flex to calculate height
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '12px',
              WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
            }}>
              {logs.length === 0 ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  opacity: 0.6,
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📡</div>
                    <div style={{ fontSize: '14px' }}>No system events yet</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '6px' }}>
                  {logs.map((log) => {
                    let bgColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)';
                    let borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                    let iconColor = '#94a3b8';

                    if (log.type === 'sent') {
                      bgColor = 'rgba(59, 130, 246, 0.1)';
                      borderColor = '#3b82f6';
                      iconColor = '#3b82f6';
                    } else if (log.type === 'received') {
                      bgColor = 'rgba(16, 185, 129, 0.1)';
                      borderColor = '#10b981';
                      iconColor = '#10b981';
                    } else if (log.type === 'error') {
                      bgColor = 'rgba(239, 68, 68, 0.1)';
                      borderColor = '#ef4444';
                      iconColor = '#ef4444';
                    }

                    return (
                      <div
                        key={log.id}
                        style={{
                          padding: '8px',
                          borderRadius: '6px',
                          backgroundColor: bgColor,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '4px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: iconColor, fontSize: '14px' }}>
                              {log.type === 'sent' && <i className="fas fa-arrow-up"></i>}
                              {log.type === 'received' && <i className="fas fa-arrow-down"></i>}
                              {log.type === 'info' && <i className="fas fa-info-circle"></i>}
                              {log.type === 'error' && <i className="fas fa-exclamation-triangle"></i>}
                            </span>
                            <span style={{ fontWeight: '600', fontSize: '13px' }}>
                              {log.event}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', opacity: 0.7 }}>
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <pre style={{
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          margin: 0,
                          opacity: 0.8,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          maxHeight: '100px',
                          overflowY: 'auto',
                        }}>
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* MESSAGES SECTION - BOTTOM HALF (Fixed 50%) */}
          <div style={{
            position: 'relative', // Positioning context for Chrome
            height: '50%',
            minHeight: '50%', // Lock to exactly 50%
            maxHeight: '50%', // Lock to exactly 50%
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden', // No overflow on container
          }}>
            {/* Messages Header */}
            <div style={{
              minHeight: '48px',
              padding: '8px 20px',
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '4px',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: '600' }}><i className="fas fa-comments"></i> Messages</span>
                  <span style={{ marginLeft: '8px', fontSize: '14px', opacity: 0.7 }}>
                    ({messages.length})
                  </span>
                  {messageQueue.length > 0 && (
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '12px',
                      padding: '2px 8px',
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>
                      {messageQueue.length} queued
                    </span>
                  )}
                </div>
                <button
                  onClick={clearMessages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <i className="fas fa-trash"></i> Clear
                </button>
              </div>
            </div>

            {/* Messages Content */}
            <div style={{
              position: 'relative', // Important for Chrome
              flex: '1 1 0', // Flex with zero base - prevents content from expanding
              height: 0, // Force flex to calculate height
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
            }}>
              {messages.length === 0 ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  opacity: 0.6,
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}><i className="fas fa-comments"></i></div>
                    <div style={{ fontSize: '14px' }}>No messages yet</div>
                  </div>
                </div>
              ) : (
                <MessageBubble
                  messages={messages}
                  isRecipientTyping={isRecipientTyping}
                  isRecipientRecording={isRecipientRecording}
                  recipientGhostText={recipientGhostText}
                  listeningMessageIds={listeningMessageIds}
                  onImageClick={(imageUrl, imageName) => {
                    setLightboxImageUrl(imageUrl);
                    setLightboxImageName(imageName);
                    setLightboxOpen(true);
                  }}
                  messagesEndRef={messagesEndRef}
                  onAudioPlayStatusChange={(messageId, senderId, isPlaying, isEnded) => {
                    const s = socketRef.current;
                    const online = effectivelyOnlineRef.current;
                    if (s && online) {
                      s.emit('audio:listening', {
                        senderId,
                        messageId,
                        isListening: isPlaying,
                        isEnded: isEnded === true,
                      });
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>

      {/* Lightbox for viewing images */}
      <Lightbox
        imageUrl={lightboxImageUrl}
        imageName={lightboxImageName}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}

