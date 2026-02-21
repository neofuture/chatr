'use client';

import { useWebSocket } from '@/contexts/WebSocketContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useState, useEffect, useRef } from 'react';

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
  const badgeRef = useRef<HTMLDivElement>(null);

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
    const newY = window.innerHeight - e.clientY - dragOffset.y;

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

  let statusColor = '#10b981'; // Green for connected
  let statusText = 'Connected';
  let statusIcon = <i className="fas fa-circle" style={{ color: '#10b981' }}></i>;

  if (connecting) {
    statusColor = '#f97316'; // Orange
    statusText = 'Connecting';
    statusIcon = <i className="fas fa-circle" style={{ color: '#f97316' }}></i>;
  } else if (!connected) {
    statusColor = '#ef4444'; // Red
    statusText = 'Offline';
    statusIcon = <i className="fas fa-circle" style={{ color: '#ef4444' }}></i>;
  }

  return (
    <div
      ref={badgeRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: `${position.y}px`,
        right: `${position.x}px`,
        zIndex: 10000,
        backgroundColor: bgColor,
        color: textColor,
        padding: expanded ? '16px' : '10px 16px',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: expanded ? '12px' : '0',
        boxShadow: theme === 'dark'
          ? '0 4px 20px rgba(0, 0, 0, 0.5)'
          : '0 4px 20px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(10px)',
        border: `2px solid ${statusColor}`,
        fontSize: '13px',
        fontWeight: '600',
        cursor: isDragging ? 'grabbing' : (expanded ? 'default' : 'grab'),
        transition: isDragging ? 'none' : 'all 0.3s ease',
        minWidth: expanded ? '300px' : 'auto',
        maxWidth: expanded ? '400px' : 'auto',
        maxHeight: expanded ? '500px' : 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{statusIcon}</span>
          <span style={{ color: statusColor }}>{statusText}</span>
        </div>
        {!expanded && <span style={{ fontSize: '10px', opacity: 0.6 }}>⋮⋮</span>}
        {expanded && messages.length > 0 && (
          <button
            onClick={clearMessages}
            style={{
              background: 'none',
              border: 'none',
              color: textColor,
              opacity: 0.6,
              cursor: 'pointer',
              fontSize: '10px',
              padding: '4px',
            }}
            title="Clear messages"
          >
            <i className="fas fa-trash"></i>
          </button>
        )}
      </div>

      {expanded && (
        <div style={{
          fontSize: '11px',
          opacity: 0.8,
          textAlign: 'left',
          borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          paddingTop: '12px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '400px',
          overflowY: 'auto',
        }}>
          {/* Status Section */}
          <div style={{ marginBottom: '8px' }}>
            {connected && (
              <>
                <div style={{ color: '#10b981' }}>✅ Real-time messaging active</div>
                <div style={{ marginTop: '4px', opacity: 0.6, fontSize: '10px' }}>
                  Drag to reposition
                </div>
              </>
            )}
            {connecting && (
              <>
                <div style={{ color: '#f97316' }}><i className="fas fa-spinner fa-pulse"></i> Establishing connection...</div>
                <div style={{ marginTop: '4px', opacity: 0.6 }}>
                  Please wait
                </div>
              </>
            )}
            {!connected && !connecting && (
              <>
                <div style={{ color: '#ef4444' }}><i className="fas fa-exclamation-triangle"></i> Connection lost</div>
                <div style={{ marginTop: '4px', opacity: 0.6 }}>
                  Check backend server
                </div>
              </>
            )}
          </div>

          {/* Message Log Section */}
          {connected && (
            <>
              <div style={{
                borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                paddingTop: '8px',
                fontWeight: '600',
              }}>
                📨 Message Log ({messages.length}/10)
              </div>

              {messages.length === 0 ? (
                <div style={{ opacity: 0.6, fontSize: '10px', textAlign: 'center', padding: '8px' }}>
                  No messages yet...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        borderRadius: '6px',
                        fontSize: '10px',
                        borderLeft: `3px solid ${msg.type === 'sent' ? '#3b82f6' : '#10b981'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{
                          fontWeight: '600',
                          color: msg.type === 'sent' ? '#3b82f6' : '#10b981'
                        }}>
                          {msg.type === 'sent' ? <i className="fas fa-arrow-up"></i> : <i className="fas fa-arrow-down"></i>} {msg.event}
                        </span>
                        <span style={{ opacity: 0.6 }}>
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{
                        opacity: 0.8,
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        maxHeight: '60px',
                        overflowY: 'auto',
                      }}>
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

