'use client';

import { useEffect, useState } from 'react';
import ConversationList from '@/components/messaging/ConversationList/ConversationList';
import { ConversationUser } from '@/hooks/useConversationList';
import ChatMessageList from '@/components/ChatMessageList/ChatMessageList';
import { useTheme } from '@/contexts/ThemeContext';

export default function AppPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [currentUserId, setCurrentUserId] = useState('');
  const [activeUser, setActiveUser] = useState<ConversationUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw && raw !== 'undefined') {
        const u = JSON.parse(raw);
        setCurrentUserId(u.id ?? '');
      }
    } catch { /* ignore */ }
  }, []);

  if (!currentUserId) return null;

  if (activeUser) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}>
        {/* Back header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          borderBottom: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.08)'}`,
          flexShrink: 0,
          background: isDark ? '#1e293b' : '#ffffff',
        }}>
          <button
            onClick={() => setActiveUser(null)}
            aria-label="Back to conversations"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isDark ? '#93c5fd' : '#6366f1',
              fontSize: 18,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <i className="far fa-arrow-left" />
          </button>
          {activeUser.profileImage ? (
            <img
              src={activeUser.profileImage}
              alt={activeUser.displayName ?? activeUser.username}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#f97316)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 13,
            }}>
              {((activeUser.firstName?.[0] ?? '') + (activeUser.lastName?.[0] ?? '')).toUpperCase() ||
                (activeUser.displayName ?? activeUser.username).slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: isDark ? '#ffffff' : '#0f172a' }}>
              {activeUser.displayName ?? activeUser.username}
            </div>
            <div style={{ fontSize: 12, color: isDark ? '#93c5fd' : '#6366f1' }}>
              {activeUser.username}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChatMessageList
            recipientId={activeUser.id}
            recipientUsername={activeUser.username}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    );
  }

  return (
    <ConversationList
      currentUserId={currentUserId}
      onSelectUser={setActiveUser}
    />
  );
}
