'use client';

import { useWebSocket } from '@/contexts/WebSocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './ConnectionIndicator.module.css';

export default function ConnectionIndicator() {
  const { connected, connecting } = useWebSocket();
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
        className={styles.indicator}
      >
        <div className={styles.row}>
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
            className={`${styles.dot} ${connecting ? styles.dotConnecting : styles.dotDisconnected}`}
          />

          {/* Status text */}
          <span className={styles.statusText}>
            {connecting ? 'Connecting...' : 'Offline'}
          </span>
        </div>

        {/* Show auth error message if applicable */}
        {showAuthError && !connecting && (
          <div className={styles.authError}>
            <div className={styles.authMessage}>⚠️ Session may be invalid</div>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Logout &amp; Reconnect
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
