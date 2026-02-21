'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
  connecting: false,
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

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
        setConnected(true);
        setConnecting(false);
        console.log('✅ WebSocket connected:', newSocket.id);
      });

      newSocket.on('disconnect', (reason) => {
        setConnected(false);
        setConnecting(false);
        console.log('🔌 WebSocket disconnected:', reason);
      });

      newSocket.on('connect_error', (error) => {
        setConnected(false);
        setConnecting(false);

        // Parse error message for better logging
        const errorMessage = error?.message || 'Unknown connection error';
        console.error('❌ WebSocket connection error:', errorMessage);

        // If authentication failed, clear invalid token
        if (errorMessage.includes('Authentication error')) {
          console.warn('⚠️  Authentication failed - token may be invalid. Consider logging out.');
          // Don't auto-clear tokens here - let user manually logout
          // This prevents issues if it's just a temporary backend issue
        }
      });

      newSocket.on('error', (error) => {
        // Handle empty error objects gracefully
        if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
          console.warn('⚠️  WebSocket error occurred (no details provided)');
          return;
        }

        // Log error with proper formatting
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const errorDetails = typeof error === 'object' ? JSON.stringify(error) : error;

        console.error('❌ WebSocket error:', errorMessage);
        if (errorDetails !== errorMessage) {
          console.error('   Error details:', errorDetails);
        }
      });

      // Reconnection events
      newSocket.io.on('reconnect', (attemptNumber) => {
        console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
        setConnected(true);
        setConnecting(false);
      });

      newSocket.io.on('reconnect_attempt', () => {
        console.log('🔄 Attempting to reconnect...');
        setConnecting(true);
      });

      newSocket.io.on('reconnect_failed', () => {
        console.error('❌ WebSocket reconnection failed');
        setConnecting(false);
      });

      return newSocket;
    };

    // Initialize on mount
    const initialSocket = initializeWebSocket();
    if (initialSocket) {
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
    <WebSocketContext.Provider value={{ socket, connected, connecting }}>
      {children}
    </WebSocketContext.Provider>
  );
}

