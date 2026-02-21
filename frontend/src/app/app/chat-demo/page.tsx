'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import ChatMessageList from '@/components/ChatMessageList/ChatMessageList';
import ChatInput from '@/components/ChatInput/ChatInput';

export default function ChatDemoPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [currentUserId, setCurrentUserId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [recipientUsername, setRecipientUsername] = useState('');
  const [showSetup, setShowSetup] = useState(true);
  const isDark = theme === 'dark';

  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem('user');
    if (userData && userData !== 'undefined') {
      try {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  }, []);

  const startChat = () => {
    if (recipientId && recipientUsername) {
      setShowSetup(false);
    }
  };

  if (showSetup) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px',
        gap: '20px',
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          padding: '30px',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '10px',
            textAlign: 'center',
          }}>
            💬 Chat Demo
          </h2>
          <p style={{
            fontSize: '14px',
            opacity: 0.7,
            marginBottom: '30px',
            textAlign: 'center',
          }}>
            Enter recipient details to start chatting
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
            }}>
              Recipient User ID
            </label>
            <input
              type="text"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="Enter user ID"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                color: isDark ? '#ffffff' : '#000000',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
            }}>
              Recipient Username
            </label>
            <input
              type="text"
              value={recipientUsername}
              onChange={(e) => setRecipientUsername(e.target.value)}
              placeholder="e.g., @johndoe"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                color: isDark ? '#ffffff' : '#000000',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={startChat}
            disabled={!recipientId || !recipientUsername}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: (!recipientId || !recipientUsername) ? '#94a3b8' : '#f97316',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (!recipientId || !recipientUsername) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (recipientId && recipientUsername) {
                e.currentTarget.style.backgroundColor = '#ea580c';
              }
            }}
            onMouseLeave={(e) => {
              if (recipientId && recipientUsername) {
                e.currentTarget.style.backgroundColor = '#f97316';
              }
            }}
          >
            Start Chat
          </button>

          <div style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
            borderRadius: '8px',
            fontSize: '12px',
            opacity: 0.8,
          }}>
            <strong>💡 Tip:</strong> Your User ID is: <code style={{
              padding: '2px 6px',
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}>{currentUserId || 'Loading...'}</code>
          </div>
        </div>

        <button
          onClick={() => router.push('/app')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
            backgroundColor: 'transparent',
            color: isDark ? '#ffffff' : '#000000',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          ← Back to App
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
    }}>
      {/* Chat Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowSetup(true)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              color: isDark ? '#ffffff' : '#000000',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ←
          </button>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {recipientUsername}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>
              {recipientId}
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ChatMessageList
          recipientId={recipientId}
          recipientUsername={recipientUsername}
          currentUserId={currentUserId}
        />
      </div>

      {/* Chat Input */}
      <ChatInput recipientId={recipientId} />
    </div>
  );
}

