'use client';

import { useWebSocket } from '@/contexts/WebSocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useState, useEffect, useRef } from 'react';
import styles from './WebSocketStatusBadge.module.css';

interface MessageLog {
  type: 'sent' | 'received';
  event: string;
  data: any;
  timestamp: Date;
}

export default function WebSocketStatusBadge() {
  const { socket, connected, connecting } = useWebSocket();
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Check auth on mount and storage changes
  useEffect(() => {
    const check = () => {
      const token = localStorage.getItem('token');
      setIsAuthed(!!token && token !== 'undefined');
    };
    check();
    window.addEventListener('storage', check);
    window.addEventListener('userLoggedIn', check);
    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener('userLoggedIn', check);
    };
  }, []);

  // Load saved position from localStorage on mount
  useEffect(() => {
    const savedPosition = localStorage.getItem('websocket-badge-position');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        setPosition(parsed);
      } catch (e) {
        console.error('Failed to parse saved badge position');
      }
    }
  }, []);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('websocket-badge-position', JSON.stringify(position));
  }, [position]);

  // Listen to WebSocket events for debugging
  useEffect(() => {
    if (!socket) return;

    const logMessage = (type: 'sent' | 'received', event: string, data: any) => {
      setMessages(prev => {
        const newLog: MessageLog = { type, event, data, timestamp: new Date() };
        // Keep only last 10 messages
        return [newLog, ...prev].slice(0, 10);
      });
    };

    // Intercept outgoing events
    const originalEmit = socket.emit.bind(socket);
    socket.emit = (event: string, ...args: any[]) => {
      logMessage('sent', event, args[0]);
      return originalEmit(event, ...args);
    };

    // Listen to common incoming events
    const events = [
      'message:received',
      'message:sent',
      'message:status',
      'group:message:received',
      'group:user:joined',
      'group:user:left',
      'typing:status',
      'user:status',
      'presence:update',
      'presence:response',
      'error',
    ];

    events.forEach(event => {
      const handler = (data: any) => {
        logMessage('received', event, data);
      };
      socket.on(event, handler);
    });

    return () => {
      events.forEach(event => {
        socket.off(event);
      });
    };
  }, [socket]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the badge itself, not when it's expanded content
    if (expanded) return;

    e.preventDefault();
    setIsDragging(true);

    const rect = badgeRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = window.innerWidth - e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Keep within bounds (minimum 10px from edges)
    const boundedX = Math.max(10, Math.min(window.innerWidth - 100, newX));
    const boundedY = Math.max(10, Math.min(window.innerHeight - 60, newY));

    setPosition({ x: boundedX, y: boundedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleClick = (e: React.MouseEvent) => {
    // Don't toggle if we just finished dragging
    if (isDragging) {
      e.stopPropagation();
      return;
    }
    setExpanded(!expanded);
  };

  const clearMessages = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMessages([]);
  };

  const bgColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)';
  const textColor = theme === 'dark' ? '#ffffff' : '#000000';
  const dividerColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  let statusColor = '#10b981';
  let statusText = 'Connected';
  let statusIcon = <i className="fas fa-circle" style={{ color: '#10b981' }}></i>;

  if (connecting) {
    statusColor = '#f97316';
    statusText = 'Connecting';
    statusIcon = <i className="fas fa-circle" style={{ color: '#f97316' }}></i>;
  } else if (!connected) {
    statusColor = '#ef4444';
    statusText = 'Offline';
    statusIcon = <i className="fas fa-circle" style={{ color: '#ef4444' }}></i>;
  }

  if (!isAuthed) return null;

  return (
    <div
      ref={badgeRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={`${styles.badge} ${expanded ? styles.badgeExpanded : styles.badgeCollapsed} ${isDragging ? styles.badgeDragging : ''}`}
      style={{
        top: `${position.y}px`,
        right: `${position.x}px`,
        backgroundColor: bgColor,
        color: textColor,
        boxShadow: theme === 'dark'
          ? '0 4px 20px rgba(0, 0, 0, 0.5)'
          : '0 4px 20px rgba(0, 0, 0, 0.15)',
        border: `2px solid ${statusColor}`,
      }}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.statusIconWrapper}>{statusIcon}</span>
          <span style={{ color: statusColor }}>{statusText}</span>
        </div>
        {!expanded && <span className={styles.dragHint}>⋮⋮</span>}
        {expanded && messages.length > 0 && (
          <button
            onClick={clearMessages}
            className={styles.clearBtn}
            style={{ color: textColor }}
            title="Clear messages"
          >
            <i className="fas fa-trash"></i>
          </button>
        )}
      </div>

      {expanded && (
        <div
          className={styles.expandedContent}
          style={{ borderTop: `1px solid ${dividerColor}` }}
        >
          {/* Status Section */}
          <div className={styles.statusSection}>
            {connected && (
              <>
                <div className={styles.statusConnected}>✅ Real-time messaging active</div>
                <div className={styles.statusHint}>Drag to reposition</div>
              </>
            )}
            {connecting && (
              <>
                <div className={styles.statusConnecting}><i className="fas fa-spinner fa-pulse"></i> Establishing connection...</div>
                <div style={{ marginTop: '4px', opacity: 0.6 }}>Please wait</div>
              </>
            )}
            {!connected && !connecting && (
              <>
                <div className={styles.statusDisconnected}><i className="fas fa-exclamation-triangle"></i> Connection lost</div>
                <div style={{ marginTop: '4px', opacity: 0.6 }}>Check backend server</div>
              </>
            )}
          </div>

          {/* Message Log Section */}
          {connected && (
            <>
              <div
                className={styles.logHeader}
                style={{ borderTop: `1px solid ${dividerColor}` }}
              >
                📨 Message Log ({messages.length}/10)
              </div>

              {messages.length === 0 ? (
                <div className={styles.logEmpty}>No messages yet...</div>
              ) : (
                <div className={styles.logList}>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={styles.logItem}
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderLeft: `3px solid ${msg.type === 'sent' ? '#3b82f6' : '#10b981'}`,
                      }}
                    >
                      <div className={styles.logItemHeader}>
                        <span className={`${styles.logItemEvent} ${msg.type === 'sent' ? styles.logItemEventSent : styles.logItemEventReceived}`}>
                          {msg.type === 'sent' ? <i className="fas fa-arrow-up"></i> : <i className="fas fa-arrow-down"></i>} {msg.event}
                        </span>
                        <span className={styles.logItemTime}>
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className={styles.logItemData}>
                        {typeof msg.data === 'object'
                          ? JSON.stringify(msg.data, null, 2).slice(0, 200) + (JSON.stringify(msg.data).length > 200 ? '...' : '')
                          : String(msg.data)
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
