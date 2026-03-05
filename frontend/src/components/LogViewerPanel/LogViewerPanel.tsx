'use client';

import { useRef, useState } from 'react';
import { useLog } from '@/contexts/LogContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { LogEntry } from '@/types/types.ts';
import styles from './LogViewerPanel.module.css';

const TYPE_META: Record<LogEntry['type'], { label: string; cls: string; icon: string }> = {
  sent:     { label: 'SENT',  cls: 'sent',     icon: 'fas fa-arrow-up' },
  received: { label: 'RECV',  cls: 'received', icon: 'fas fa-arrow-down' },
  info:     { label: 'INFO',  cls: 'info',     icon: 'fas fa-info-circle' },
  error:    { label: 'ERROR', cls: 'error',    icon: 'fas fa-exclamation-triangle' },
};

type FilterType = 'all' | LogEntry['type'];

const FILTERS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'all',      label: 'All',     icon: 'fas fa-layer-group' },
  { key: 'sent',     label: 'Sent',    icon: 'fas fa-arrow-up' },
  { key: 'received', label: 'Recv',    icon: 'fas fa-arrow-down' },
  { key: 'info',     label: 'Info',    icon: 'fas fa-info-circle' },
  { key: 'error',    label: 'Error',   icon: 'fas fa-exclamation-triangle' },
];

export default function LogViewerPanel() {
  const { logs, clearLogs, copyLogs } = useLog();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filtered = activeFilter === 'all' ? logs : logs.filter(l => l.type === activeFilter);

  const counts: Record<FilterType, number> = {
    all:      logs.length,
    sent:     logs.filter(l => l.type === 'sent').length,
    received: logs.filter(l => l.type === 'received').length,
    info:     logs.filter(l => l.type === 'info').length,
    error:    logs.filter(l => l.type === 'error').length,
  };

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

      {/* Filter pills */}
      <div className={styles.filters}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`${styles.filterBtn} ${activeFilter === f.key ? styles.filterBtnActive : ''} ${f.key !== 'all' ? styles[`filter_${f.key}`] : ''} ${activeFilter === f.key && f.key !== 'all' ? styles[`filterActive_${f.key}`] : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            <i className={f.icon} />
            <span>{f.label}</span>
            {counts[f.key] > 0 && (
              <span className={styles.filterCount}>{counts[f.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Log list */}
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📡</span>
            <span>{logs.length === 0 ? 'No events yet' : 'No events match this filter'}</span>
          </div>
        ) : (
          [...filtered].map(log => {
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
