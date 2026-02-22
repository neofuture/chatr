'use client';

import type { LogEntry } from './types';

interface Props {
  logs: LogEntry[];
  isDark: boolean;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  onCopy: () => void;
  onClear: () => void;
  onClose: () => void;
}

const TYPE_COLOUR: Record<string, { bg: string; border: string; icon: string }> = {
  sent:     { bg: 'rgba(59,130,246,0.1)',  border: '#3b82f6', icon: '#3b82f6' },
  received: { bg: 'rgba(16,185,129,0.1)',  border: '#10b981', icon: '#10b981' },
  error:    { bg: 'rgba(239,68,68,0.1)',   border: '#ef4444', icon: '#ef4444' },
  info:     { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', icon: '#94a3b8' },
};

export default function SystemLogsModal({ logs, isDark, logsEndRef, onCopy, onClear, onClose }: Props) {
  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Modal panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '860px', height: '80vh',
          display: 'flex', flexDirection: 'column',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderRadius: '12px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '14px 20px',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-list-alt" style={{ color: '#3b82f6' }} />
            <span style={{ fontWeight: '700', fontSize: '15px' }}>System Logs</span>
            <span style={{
              fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: '600',
              backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
              color: '#3b82f6',
            }}>{logs.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={onCopy} style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px',
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              color: isDark ? '#fff' : '#000',
            }}><i className="fas fa-copy" /> Copy</button>
            <button onClick={onClear} style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px',
              backgroundColor: '#ef4444', color: '#fff',
            }}><i className="fas fa-trash" /> Clear</button>
            <button onClick={onClose} style={{
              padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px',
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              color: isDark ? '#fff' : '#000',
            }}><i className="fas fa-times" /></button>
          </div>
        </div>

        {/* Log list */}
        <div style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          {logs.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', opacity: 0.5 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📡</div>
                <div style={{ fontSize: '14px' }}>No events yet</div>
              </div>
            </div>
          ) : (
            <>
              {[...logs].reverse().map(log => {
                const c = TYPE_COLOUR[log.type] ?? TYPE_COLOUR.info;
                return (
                  <div key={log.id} style={{
                    padding: '8px 12px', borderRadius: '6px',
                    backgroundColor: c.bg, border: `1px solid ${c.border}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span style={{ color: c.icon, fontSize: '13px', flexShrink: 0 }}>
                          {log.type === 'sent'     && <i className="fas fa-arrow-up" />}
                          {log.type === 'received' && <i className="fas fa-arrow-down" />}
                          {log.type === 'info'     && <i className="fas fa-info-circle" />}
                          {log.type === 'error'    && <i className="fas fa-exclamation-triangle" />}
                        </span>
                        <span style={{ fontWeight: '600', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.event}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', opacity: 0.6, flexShrink: 0, fontFamily: 'monospace' }}>
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <pre style={{
                      fontSize: '11px', fontFamily: 'monospace', margin: 0, opacity: 0.75,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '120px', overflowY: 'auto',
                    }}>{JSON.stringify(log.data, null, 2)}</pre>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

