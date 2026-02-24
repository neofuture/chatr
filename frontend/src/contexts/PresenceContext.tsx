'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface PresenceInfo {
  status: PresenceStatus;
  lastSeen: Date | null;
}

interface PresenceContextType {
  userPresence: Record<string, PresenceInfo>;
  getPresence: (userId: string) => PresenceInfo;
  requestPresence: (userIds: string[]) => void;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { socket, connected } = useWebSocket();
  const [userPresence, setUserPresence] = useState<Record<string, PresenceInfo>>({});

  const getPresence = useCallback((userId: string): PresenceInfo => {
    return userPresence[userId] ?? { status: 'offline', lastSeen: null };
  }, [userPresence]);

  const requestPresence = useCallback((userIds: string[]) => {
    if (!socket || !connected || !userIds.length) return;
    socket.emit('presence:request', userIds);
  }, [socket, connected]);

  // Listen for real-time presence updates
  useEffect(() => {
    if (!socket) return;

    const onUserStatus = (data: any) => {
      if (data.userId && data.status) {
        setUserPresence(prev => ({
          ...prev,
          [data.userId]: {
            status: data.status as PresenceStatus,
            lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
            hidden: !!data.hidden,
          },
        }));
      }
    };

    const onPresenceResponse = (data: any) => {
      if (!Array.isArray(data)) return;
      setUserPresence(prev => {
        const next = { ...prev };
        data.forEach((entry: any) => {
          if (entry.userId) {
            next[entry.userId] = {
              status: (entry.status ?? 'offline') as PresenceStatus,
              lastSeen: entry.lastSeen ? new Date(entry.lastSeen) : null,
              hidden: !!entry.hidden,
            };
          }
        });
        return next;
      });
    };

    socket.on('user:status', onUserStatus);
    socket.on('presence:response', onPresenceResponse);

    return () => {
      socket.off('user:status', onUserStatus);
      socket.off('presence:response', onPresenceResponse);
    };
  }, [socket]);

  return (
    <PresenceContext.Provider value={{ userPresence, getPresence, requestPresence }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error('usePresence must be used within a PresenceProvider');
  return ctx;
}

