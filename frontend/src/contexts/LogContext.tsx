'use client';

import { createContext, useContext, useCallback, useRef, useState, useEffect, ReactNode } from 'react';
import type { LogEntry } from '@/types/types.ts';

const STORAGE_KEY = 'chatr:system-logs';
const MAX_LOGS = 1000;

function loadLogsFromStorage(): LogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LogEntry[];
    // Rehydrate timestamp strings back to Date objects
    return parsed.map(l => ({ ...l, timestamp: new Date(l.timestamp) }));
  } catch {
    return [];
  }
}

function saveLogsToStorage(logs: LogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // Storage full — clear and try again
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch {}
  }
}

interface LogContextValue {
  logs: LogEntry[];
  addLog: (type: LogEntry['type'], event: string, data?: any) => void;
  clearLogs: () => void;
  copyLogs: () => void;
}

const LogContext = createContext<LogContextValue>({
  logs: [],
  addLog: () => {},
  clearLogs: () => {},
  copyLogs: () => {},
});

export function LogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>(() => loadLogsFromStorage());
  const idRef = useRef(0);

  // Persist to localStorage whenever logs change
  useEffect(() => {
    saveLogsToStorage(logs);
  }, [logs]);

  const addLog = useCallback((type: LogEntry['type'], event: string, data: any = {}) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${idRef.current++}`,
      type,
      event,
      data,
      timestamp: new Date(),
    };
    setLogs(prev => [entry, ...prev].slice(0, MAX_LOGS));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const copyLogs = useCallback(() => {
    setLogs(prev => {
      const text = prev.map(l =>
        `[${l.timestamp.toLocaleTimeString()}] ${l.type.toUpperCase()} ${l.event}: ${JSON.stringify(l.data)}`
      ).join('\n');
      navigator.clipboard?.writeText(text).catch(() => {});
      return prev;
    });
  }, []);

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs, copyLogs }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLog() {
  return useContext(LogContext);
}
