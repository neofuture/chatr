'use client';

import { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useTheme } from '@/contexts/ThemeContext';

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
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        color: isDark ? '#94a3b8' : '#64748b',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
          <div>Loading messages...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        color: '#ef4444',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        color: isDark ? '#94a3b8' : '#64748b',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            No messages yet
          </div>
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Start a conversation with @{recipientUsername}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '20px',
      overflowY: 'auto',
      height: '100%',
    }}>
      {messages.map((message) => {
        const isSent = message.senderId === currentUserId;

        return (
          <div
            key={message.id}
            style={{
              display: 'flex',
              justifyContent: isSent ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: '8px',
            }}
          >
            {/* Message bubble */}
            <div
              style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '18px',
                backgroundColor: isSent
                  ? '#f97316'
                  : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'),
                color: isSent ? '#ffffff' : (isDark ? '#ffffff' : '#000000'),
                wordBreak: 'break-word',
                position: 'relative',
              }}
            >
              {/* Message content */}
              <div style={{ fontSize: '15px', lineHeight: '1.4' }}>
                {message.content}
              </div>

              {/* Timestamp and status */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '4px',
                fontSize: '11px',
                opacity: 0.7,
                justifyContent: 'flex-end',
              }}>
                <span>
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>

                {/* Status indicators (only for sent messages) */}
                {isSent && (
                  <span style={{ marginLeft: '4px' }}>
                    {message.status === 'sent' && '✓'}
                    {message.status === 'delivered' && '✓✓'}
                    {message.status === 'read' && <span style={{ color: '#60a5fa' }}>✓✓</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}

