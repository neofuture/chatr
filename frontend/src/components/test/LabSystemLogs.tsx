'use client';

import type { LogEntry } from './types';

interface Props {
  logs: LogEntry[];
  isDark: boolean;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  onCopy: () => void;
  onClear: () => void;
}

export default function LabSystemLogs({ logs, isDark, logsEndRef, onCopy, onClear }: Props) {
  return (
    <div style={{
      height: '50%', minHeight: '50%', maxHeight: '50%',
      display: 'flex', flexDirection: 'column',
      borderBottom: `2px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: '48px', minHeight: '48px', maxHeight: '48px', flexShrink: 0,
        padding: '12px 20px',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <span style={{ fontWeight: '600' }}><i className="fas fa-list-alt" /> System Logs</span>
          <span style={{ marginLeft: '8px', fontSize: '14px', opacity: 0.7 }}>({logs.length})</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCopy} style={{
            padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px',
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            color: isDark ? '#fff' : '#000',
          }}><i className="fas fa-copy" /> Copy</button>
          <button onClick={onClear} style={{
            padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px',
            backgroundColor: '#ef4444', color: '#fff',
          }}><i className="fas fa-trash" /> Clear</button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: '1 1 0', height: 0, overflowY: 'auto', overflowX: 'hidden', padding: '12px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {logs.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', opacity: 0.6 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📡</div>
              <div style={{ fontSize: '14px' }}>No system events yet</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '6px' }}>
            {logs.map((log) => {
              const c = ({
                sent:     { bg: 'rgba(59,130,246,0.1)',  border: '#3b82f6', icon: '#3b82f6' },
                received: { bg: 'rgba(16,185,129,0.1)',  border: '#10b981', icon: '#10b981' },
                error:    { bg: 'rgba(239,68,68,0.1)',   border: '#ef4444', icon: '#ef4444' },
                info:     { bg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', icon: '#94a3b8' },
              } as Record<string, { bg: string; border: string; icon: string }>)[log.type] ?? { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', icon: '#94a3b8' };
              return (
                <div key={log.id} style={{ padding: '8px', borderRadius: '6px', backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: c.icon, fontSize: '14px' }}>
                        {log.type === 'sent'     && <i className="fas fa-arrow-up" />}
                        {log.type === 'received' && <i className="fas fa-arrow-down" />}
                        {log.type === 'info'     && <i className="fas fa-info-circle" />}
                        {log.type === 'error'    && <i className="fas fa-exclamation-triangle" />}
                      </span>
                      <span style={{ fontWeight: '600', fontSize: '13px' }}>{log.event}</span>
                    </div>
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>{log.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <pre style={{
                    fontSize: '11px', fontFamily: 'monospace', margin: 0, opacity: 0.8,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '100px', overflowY: 'auto',
                  }}>{JSON.stringify(log.data, null, 2)}</pre>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

