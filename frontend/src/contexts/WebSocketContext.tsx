'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { useLog } from './LogContext';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
  disconnect: () => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
  connecting: false,
  disconnect: () => {},
  reconnect: () => {},
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const initRef = useRef<(() => Socket | null) | null>(null);
  const { addLog } = useLog();

  useEffect(() => {
    // Function to initialize WebSocket connection
    const initializeWebSocket = () => {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (!token || token === 'undefined') {
        console.log('⚠️  No auth token found, skipping WebSocket connection');
        return null;
      }

      // Validate user data exists
      if (!userData || userData === 'undefined') {
        console.warn('⚠️  User data not found, skipping WebSocket connection');
        return null;
      }

      // Parse user data to validate
      try {
        const user = JSON.parse(userData);
        if (!user.id) {
          console.warn('⚠️  Invalid user data (no ID), skipping WebSocket connection');
          return null;
        }
      } catch (e) {
        console.error('⚠️  Failed to parse user data, skipping WebSocket connection');
        return null;
      }

      console.log('🔌 Initializing WebSocket connection...');
      setConnecting(true);

      // Connect to WebSocket server
      const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // Connection events
      newSocket.on('connect', () => {
        setConnecting(false);
        console.log('✅ WebSocket connected:', newSocket.id);
        addLog('info', 'socket:connected', { id: newSocket.id });
      });

      // Server confirms all handlers are registered — safe to emit
      newSocket.on('socket:ready', () => {
        setConnected(true);
        console.log('✅ Socket ready — server handlers registered');
        addLog('info', 'socket:ready', { id: newSocket.id });
      });

      newSocket.on('disconnect', (reason) => {
        setConnected(false);
        setConnecting(false);
        console.log('🔌 WebSocket disconnected:', reason);
        addLog('info', 'socket:disconnected', { reason });
      });

      newSocket.on('connect_error', (error) => {
        setConnected(false);
        setConnecting(false);
        const errorMessage = error?.message || 'Unknown connection error';
        console.error('❌ WebSocket connection error:', errorMessage);
        addLog('error', 'socket:connect_error', { message: errorMessage });
        if (errorMessage.includes('Authentication error')) {
          console.warn('⚠️  Authentication failed - token may be invalid. Consider logging out.');
        }
      });

      newSocket.on('error', (error) => {
        if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
          console.warn('⚠️  WebSocket error occurred (no details provided)');
          return;
        }
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const errorDetails = typeof error === 'object' ? JSON.stringify(error) : error;
        console.error('❌ WebSocket error:', errorMessage);
        if (errorDetails !== errorMessage) {
          console.error('   Error details:', errorDetails);
        }
        addLog('error', 'socket:error', { message: errorMessage });
      });

      // Reconnection events — connected set via socket:ready after server re-registers handlers
      newSocket.io.on('reconnect', (attemptNumber) => {
        console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
        setConnecting(false);
        addLog('info', 'socket:reconnected', { attempts: attemptNumber });
      });

      newSocket.io.on('reconnect_attempt', () => {
        console.log('🔄 Attempting to reconnect...');
        setConnecting(true);
        addLog('info', 'socket:reconnect_attempt', {});
      });

      newSocket.io.on('reconnect_failed', () => {
        console.error('❌ WebSocket reconnection failed');
        setConnecting(false);
        addLog('error', 'socket:reconnect_failed', {});
      });

      // Log ALL incoming and outgoing socket events
      newSocket.onAny((event: string, ...args: any[]) => {
        addLog('received', event, args.length === 1 ? args[0] : args.length ? args : undefined);
      });
      newSocket.onAnyOutgoing((event: string, ...args: any[]) => {
        const data = args.find(a => typeof a === 'object' && a !== null && typeof a !== 'function');
        addLog('sent', event, data ?? undefined);
      });

      return newSocket;
    };

    // Initialize on mount
    initRef.current = initializeWebSocket;
    const initialSocket = initializeWebSocket();
    if (initialSocket) {
      socketRef.current = initialSocket;
      setSocket(initialSocket);
    }

    // Listen for storage changes (e.g., when user logs in from another tab or after initial mount)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        console.log('🔄 Auth data changed, reinitializing WebSocket...');

        // Close existing socket
        if (socket) {
          socket.close();
          setSocket(null);
          setConnected(false);
          setConnecting(false);
        }

        // Try to connect with new credentials
        setTimeout(() => {
          const newSocket = initializeWebSocket();
          if (newSocket) {
            setSocket(newSocket);
          }
        }, 100);
      }
    };

    // Also listen for custom login event (when user logs in on same tab)
    const handleLoginEvent = () => {
      console.log('🔄 Login detected, initializing WebSocket...');

      // Close existing socket
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
        setConnecting(false);
      }

      // Connect with new credentials
      setTimeout(() => {
        const newSocket = initializeWebSocket();
        if (newSocket) {
          setSocket(newSocket);
        }
      }, 100);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleLoginEvent);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Closing WebSocket connection');
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleLoginEvent);
      if (initialSocket) {
        initialSocket.close();
      }
    };
  }, []); // Only run once on mount, but with event listeners for changes

  return (
    <WebSocketContext.Provider value={{
      socket, connected, connecting,
      disconnect: () => {
        const s = socketRef.current;
        if (s) {
          s.disconnect();
          setConnected(false);
          setConnecting(false);
        }
      },
      reconnect: () => {
        const s = socketRef.current;
        if (s) {
          // Reconnect existing socket
          s.connect();
        } else if (initRef.current) {
          // Create a fresh socket if none exists
          const newSocket = initRef.current();
          if (newSocket) {
            socketRef.current = newSocket;
            setSocket(newSocket);
          }
        }
      },
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

