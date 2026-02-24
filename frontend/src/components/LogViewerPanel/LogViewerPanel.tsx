'use client';

import { useRef } from 'react';
import { useLog } from '@/contexts/LogContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { LogEntry } from '@/components/test/types';
import styles from './LogViewerPanel.module.css';

const TYPE_META: Record<LogEntry['type'], { label: string; cls: string; icon: string }> = {
  sent:     { label: 'SENT',     cls: 'sent',     icon: 'fas fa-arrow-up' },
  received: { label: 'RECV',     cls: 'received', icon: 'fas fa-arrow-down' },
  info:     { label: 'INFO',     cls: 'info',     icon: 'fas fa-info-circle' },
  error:    { label: 'ERROR',    cls: 'error',    icon: 'fas fa-exclamation-triangle' },
};

export default function LogViewerPanel() {
  const { logs, clearLogs, copyLogs } = useLog();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const bottomRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`${styles.root} ${isDark ? styles.dark : styles.light}`}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <i className="fas fa-list-alt" style={{ color: 'var(--color-blue-400)' }} />
          <span className={styles.toolbarTitle}>System Logs</span>
          <span className={styles.badge}>{logs.length}</span>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.btnSecondary} onClick={copyLogs} title="Copy all logs">
            <i className="fas fa-copy" /> Copy
          </button>
          <button className={styles.btnDanger} onClick={clearLogs} title="Clear logs">
            <i className="fas fa-trash" /> Clear
          </button>
        </div>
      </div>

      {/* Log list */}
      <div className={styles.list}>
        {logs.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📡</span>
            <span>No events yet</span>
          </div>
        ) : (
          [...logs].reverse().map(log => {
            const meta = TYPE_META[log.type] ?? TYPE_META.info;
            return (
              <div key={log.id} className={`${styles.entry} ${styles[meta.cls]}`}>
                <div className={styles.entryHeader}>
                  <div className={styles.entryLeft}>
                    <i className={`${meta.icon} ${styles.entryIcon} ${styles[`icon_${meta.cls}`]}`} />
                    <span className={`${styles.entryBadge} ${styles[`badge_${meta.cls}`]}`}>{meta.label}</span>
                    <span className={styles.entryEvent}>{log.event}</span>
                  </div>
                  <span className={styles.entryTime}>{log.timestamp.toLocaleTimeString()}</span>
                </div>
                {log.data && Object.keys(log.data).length > 0 && (
                  <pre className={styles.entryData}>{JSON.stringify(log.data, null, 2)}</pre>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

