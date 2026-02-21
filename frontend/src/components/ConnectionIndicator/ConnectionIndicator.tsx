'use client';

import { useWebSocket } from '@/contexts/WebSocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ConnectionIndicator() {
  const { connected, connecting } = useWebSocket();
  const { theme } = useTheme();
  const router = useRouter();
  const [showAuthError, setShowAuthError] = useState(false);

  // Check for authentication errors
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (!token || token === 'undefined' || !user || user === 'undefined') {
        setShowAuthError(true);
      } else {
        setShowAuthError(false);
      }
    };

    // Check on mount
    checkAuth();

    // Check every 5 seconds
    const interval = setInterval(checkAuth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Don't show anything if connected
  if (connected) return null;

  const bgColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)';
  const textColor = theme === 'dark' ? '#ffffff' : '#000000';
  const statusColor = connecting ? '#f97316' : '#ef4444'; // Orange when connecting, red when disconnected

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          backgroundColor: bgColor,
          color: textColor,
          padding: '12px 20px',
          borderRadius: '25px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '8px',
          boxShadow: theme === 'dark'
            ? '0 4px 20px rgba(0, 0, 0, 0.5)'
            : '0 4px 20px rgba(0, 0, 0, 0.15)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          fontSize: '14px',
          fontWeight: '500',
          minWidth: '200px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          {/* Animated status dot */}
          <motion.div
            animate={{
              scale: connecting ? [1, 1.2, 1] : 1,
              opacity: connecting ? [1, 0.6, 1] : 1,
            }}
            transition={{
              duration: 1.5,
              repeat: connecting ? Infinity : 0,
              ease: 'easeInOut',
            }}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              boxShadow: `0 0 10px ${statusColor}`,
              flexShrink: 0,
            }}
          />

          {/* Status text */}
          <span style={{ flex: 1 }}>
            {connecting ? 'Connecting...' : 'Offline'}
          </span>
        </div>

        {/* Show auth error message if applicable */}
        {showAuthError && !connecting && (
          <div style={{
            fontSize: '12px',
            opacity: 0.8,
            borderTop: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            paddingTop: '8px',
            width: '100%',
          }}>
            <div style={{ marginBottom: '8px' }}>
              ⚠️ Session may be invalid
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Logout & Reconnect
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

