'use client';

import { useState, useEffect } from 'react';
import { syncOfflineMessages } from '@/lib/offline';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = async () => {
      setIsOnline(true);

      // Auto-sync when coming back online
      const token = localStorage.getItem('token');
      if (token) {
        setIsSyncing(true);
        try {
          await syncOfflineMessages(token);
        } catch (error) {
          console.error('Auto-sync failed:', error);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSyncing };
}

