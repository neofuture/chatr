'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface PresenceInfo {
  status: PresenceStatus;
  lastSeen: Date | null;
  /** User has chosen to hide their online status */
  hidden?: boolean;
}

interface PresenceContextType {
  userPresence: Record<string, PresenceInfo>;
  getPresence: (userId: string) => PresenceInfo;
  requestPresence: (userIds: string[]) => void;
  /** IDs whose presence should be suppressed (shown as offline/hidden) */
  setSuppressedIds: (ids: Set<string>) => void;
}

const HIDDEN_PRESENCE: PresenceInfo = { status: 'offline', lastSeen: null, hidden: true };

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { socket, connected } = useWebSocket();
  const [userPresence, setUserPresence] = useState<Record<string, PresenceInfo>>({});
  const suppressedRef = useRef<Set<string>>(new Set());

  const setSuppressedIds = useCallback((ids: Set<string>) => {
    suppressedRef.current = ids;
  }, []);

  const getPresence = useCallback((userId: string): PresenceInfo => {
    if (suppressedRef.current.has(userId)) return HIDDEN_PRESENCE;
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
        // Ignore broadcast updates for suppressed users
        if (suppressedRef.current.has(data.userId)) return;
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
    <PresenceContext.Provider value={{ userPresence, getPresence, requestPresence, setSuppressedIds }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error('usePresence must be used within a PresenceProvider');
  return ctx;
}
