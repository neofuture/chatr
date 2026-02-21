'use client';

import { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';

interface ChatInputProps {
  recipientId: string;
  onMessageSent?: () => void;
}

export default function ChatInput({ recipientId, onMessageSent }: ChatInputProps) {
  const { socket, connected } = useWebSocket();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDark = theme === 'dark';

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Handle typing indicators
  const handleTypingStart = () => {
    if (!socket || !connected) return;

    try {
      socket.emit('typing:start', { recipientId });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        try {
          socket.emit('typing:stop', { recipientId });
        } catch (err) {
          console.warn('⚠️  Failed to emit typing:stop', err);
        }
      }, 3000);
    } catch (error) {
      console.warn('⚠️  Failed to emit typing:start', error);
    }
  };

  const handleTypingStop = () => {
    if (!socket || !connected) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      socket.emit('typing:stop', { recipientId });
    } catch (error) {
      console.warn('⚠️  Failed to emit typing:stop', error);
    }
  };

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) return;
    if (!socket || !connected) {
      showToast('WebSocket not connected', 'error');
      return;
    }

    setSending(true);
    handleTypingStop();

    try {
      // Send via WebSocket with error handling
      socket.emit('message:send', {
        recipientId,
        content: trimmedMessage,
        type: 'text',
      }, (response: any) => {
        // Optional callback handler
        if (response?.error) {
          console.error('❌ Message send error:', response.error);
          showToast('Failed to send message', 'error');
        }
      });

      // Clear input optimistically
      setMessage('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Callback
      onMessageSent?.();
    } catch (error) {
      console.error('❌ Error sending message:', error);
      showToast('Failed to send message', 'error');
      // Restore message on error
      setMessage(trimmedMessage);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    if (e.target.value.length > 0) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: '12px',
      padding: '16px 20px',
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.9)',
      borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
    }}>
      {/* Text Input */}
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
        placeholder="Type a message..."
        disabled={sending || !connected}
        style={{
          flex: 1,
          minHeight: '40px',
          maxHeight: '120px',
          padding: '10px 16px',
          borderRadius: '20px',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
          color: isDark ? '#ffffff' : '#000000',
          fontSize: '15px',
          fontFamily: 'inherit',
          resize: 'none',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#f97316';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
          handleTypingStop();
        }}
      />

      {/* Send Button */}
      <button
        onClick={handleSendMessage}
        disabled={!message.trim() || sending || !connected}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: (!message.trim() || sending || !connected)
            ? (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)')
            : '#f97316',
          color: '#ffffff',
          fontSize: '18px',
          cursor: (!message.trim() || sending || !connected) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (message.trim() && !sending && connected) {
            e.currentTarget.style.backgroundColor = '#ea580c';
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (message.trim() && !sending && connected) {
            e.currentTarget.style.backgroundColor = '#f97316';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        {sending ? (
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        ) : (
          <i className="fas fa-paper-plane"></i>
        )}
      </button>

      {/* Add keyframe animation for spinner */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

