'use client';

import { useWebSocket } from '@/contexts/WebSocketContext';
import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: Date;
}

export default function WebSocketDemo() {
  const { socket, connected } = useWebSocket();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [recipientId, setRecipientId] = useState('');

  useEffect(() => {
    if (!socket) return;

    // Listen for incoming messages
    socket.on('message:received', (message: Message) => {
      console.log('📨 Received message:', message);
      setMessages(prev => [...prev, message]);
    });

    // Listen for sent confirmations
    socket.on('message:sent', (data: any) => {
      console.log('✅ Message sent:', data);
    });

    // Listen for connection status
    socket.on('user:status', (status: any) => {
      console.log('👤 User status:', status);
    });

    return () => {
      socket.off('message:received');
      socket.off('message:sent');
      socket.off('user:status');
    };
  }, [socket]);

  const sendMessage = () => {
    if (!socket || !connected || !inputMessage.trim() || !recipientId.trim()) return;

    socket.emit('message:send', {
      recipientId: recipientId,
      content: inputMessage,
      type: 'text'
    });

    setInputMessage('');
  };

  const containerStyle = {
    maxWidth: '600px',
    margin: '40px auto',
    padding: '20px',
    backgroundColor: theme === 'dark' ? '#1e293b' : '#f8fafc',
    borderRadius: '12px',
    boxShadow: theme === 'dark'
      ? '0 4px 20px rgba(0, 0, 0, 0.5)'
      : '0 4px 20px rgba(0, 0, 0, 0.1)',
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    marginBottom: '10px',
    borderRadius: '8px',
    border: `1px solid ${theme === 'dark' ? '#334155' : '#cbd5e1'}`,
    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
    color: theme === 'dark' ? '#ffffff' : '#000000',
    fontSize: '14px',
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: connected ? '#f97316' : '#94a3b8',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: connected ? 'pointer' : 'not-allowed',
  };

  const messageStyle = {
    padding: '12px',
    marginBottom: '8px',
    borderRadius: '8px',
    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
    border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
        WebSocket Demo
      </h2>

      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <strong>Status:</strong>{' '}
        <span style={{ color: connected ? '#10b981' : '#ef4444' }}>
          {connected ? <><i className="fas fa-circle"></i> Connected</> : <><i className="fas fa-circle"></i> Disconnected</>}
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Recipient User ID"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Type your message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          style={inputStyle}
          disabled={!connected}
        />
        <button
          onClick={sendMessage}
          style={buttonStyle}
          disabled={!connected}
        >
          Send Message
        </button>
      </div>

      <div>
        <h3 style={{ marginBottom: '10px' }}>Messages:</h3>
        {messages.length === 0 ? (
          <p style={{ textAlign: 'center', opacity: 0.6 }}>No messages yet...</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={messageStyle}>
              <strong>{msg.senderUsername}:</strong> {msg.content}
              <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: theme === 'dark' ? '#0f172a' : '#f1f5f9', borderRadius: '8px', fontSize: '12px' }}>
        <strong>Tips:</strong>
        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
          <li>Check browser console for WebSocket events</li>
          <li>Connection indicator shows in top-right corner</li>
          <li>Enter a recipient user ID to send messages</li>
          <li>Messages appear in real-time when received</li>
        </ul>
      </div>
    </div>
  );
}

