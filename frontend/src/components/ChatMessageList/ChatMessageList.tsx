'use client';

import { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './ChatMessageList.module.css';

interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  type: string;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

interface ChatMessageListProps {
  recipientId: string;
  recipientUsername: string;
  currentUserId: string;
}

export default function ChatMessageList({ recipientId, recipientUsername, currentUserId }: ChatMessageListProps) {
  const { socket, connected } = useWebSocket();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load message history from API
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/messages/history?otherUserId=${recipientId}&limit=50`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load messages');
        }

        const data = await response.json();
        setMessages(data.messages || []);

        // Scroll to bottom after loading
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [recipientId]);

  // Listen for new messages via WebSocket
  useEffect(() => {
    if (!socket || !connected) return;

    const handleMessageReceived = (message: any) => {
      console.log('📨 Message received:', message);

      // Only add if it's from or to our conversation
      if (message.senderId === recipientId || message.recipientId === recipientId) {
        setMessages(prev => [...prev, {
          id: message.id,
          senderId: message.senderId,
          senderUsername: message.senderUsername,
          content: message.content,
          type: message.type,
          timestamp: new Date(message.timestamp),
          status: 'delivered',
        }]);

        scrollToBottom();

        // Send read receipt
        socket.emit('message:read', message.id);
      }
    };

    const handleMessageStatus = (update: any) => {
      console.log('📊 Message status update:', update);

      // Update message status in list
      setMessages(prev => prev.map(msg =>
        msg.id === update.messageId
          ? { ...msg, status: update.status }
          : msg
      ));
    };

    socket.on('message:received', handleMessageReceived);
    socket.on('message:status', handleMessageStatus);

    return () => {
      socket.off('message:received', handleMessageReceived);
      socket.off('message:status', handleMessageStatus);
    };
  }, [socket, connected, recipientId]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  if (loading) {
    return (
      <div className={styles.centered} style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
        <div className={styles.centeredContent}>
          <div className={styles.stateIcon}>💬</div>
          <div>Loading messages...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.centered} ${styles.stateError}`}>
        <div className={styles.centeredContent}>
          <div className={styles.stateIcon}>⚠️</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={styles.centered} style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
        <div className={styles.centeredContent}>
          <div className={styles.stateIconLarge}>💬</div>
          <div className={styles.stateEmpty}>No messages yet</div>
          <div className={styles.stateEmptyHint}>
            Start a conversation with @{recipientUsername}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {messages.map((message) => {
        const isSent = message.senderId === currentUserId;

        return (
          <div
            key={message.id}
            className={`${styles.messageRow} ${isSent ? styles.messageRowSent : styles.messageRowReceived}`}
          >
            {/* Message bubble */}
            <div
              className={`${styles.bubble} ${isSent ? styles.bubbleSent : ''}`}
              style={!isSent ? {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                color: isDark ? '#ffffff' : '#000000',
              } : undefined}
            >
              <div className={styles.bubbleText}>{message.content}</div>

              <div className={styles.bubbleMeta}>
                <span>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isSent && (
                  <span className={styles.statusMargin}>
                    {message.status === 'sent' && '✓'}
                    {message.status === 'delivered' && '✓✓'}
                    {message.status === 'read' && <span className={styles.readTick}>✓✓</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
