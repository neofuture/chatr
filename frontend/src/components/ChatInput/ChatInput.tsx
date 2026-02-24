'use client';

import { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/contexts/ToastContext';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  recipientId: string;
  onMessageSent?: () => void;
}

export default function ChatInput({ recipientId, onMessageSent }: ChatInputProps) {
  const { socket, connected } = useWebSocket();
  const { showToast } = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef   = useRef<NodeJS.Timeout | null>(null);
  const typingHeartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef        = useRef(false);

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
      // Only emit typing:start if we weren't already typing (avoids redundant events)
      if (!isTypingRef.current) {
        socket.emit('typing:start', { recipientId });
        isTypingRef.current = true;

        // Heartbeat: re-emit typing:start every 2s so the receiver never times out
        // while the user is actively typing
        const scheduleHeartbeat = () => {
          typingHeartbeatRef.current = setTimeout(() => {
            if (!isTypingRef.current) return;
            try { socket.emit('typing:start', { recipientId }); } catch { /* ignore */ }
            scheduleHeartbeat();
          }, 2000);
        };
        scheduleHeartbeat();
      }

      // (Re-)arm the inactivity stop — 3s of no keystrokes stops the indicator
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        if (typingHeartbeatRef.current) clearTimeout(typingHeartbeatRef.current);
        try { socket.emit('typing:stop', { recipientId }); } catch { /* ignore */ }
      }, 3000);

    } catch (error) {
      console.warn('⚠️  Failed to emit typing:start', error);
    }
  };

  const handleTypingStop = () => {
    if (!socket || !connected) return;

    isTypingRef.current = false;
    if (typingTimeoutRef.current)   clearTimeout(typingTimeoutRef.current);
    if (typingHeartbeatRef.current) clearTimeout(typingHeartbeatRef.current);

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
    <div className={styles.container}>
      {/* Text Input */}
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyPress}
        placeholder="Type a message..."
        disabled={sending || !connected}
        className={styles.textarea}
        onBlur={handleTypingStop}
      />

      {/* Send Button */}
      <button
        onClick={handleSendMessage}
        disabled={!message.trim() || sending || !connected}
        className={styles.sendBtn}
      >
        {sending ? (
          <div className={styles.spinner} />
        ) : (
          <i className="fas fa-paper-plane"></i>
        )}
      </button>
    </div>
  );
}

