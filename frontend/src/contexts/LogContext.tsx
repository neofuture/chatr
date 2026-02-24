'use client';

import { createContext, useContext, useCallback, useRef, useState, ReactNode } from 'react';
import type { LogEntry } from '@/components/test/types';

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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const idRef = useRef(0);

  const addLog = useCallback((type: LogEntry['type'], event: string, data: any = {}) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${idRef.current++}`,
      type,
      event,
      data,
      timestamp: new Date(),
    };
    setLogs(prev => [entry, ...prev].slice(0, 1000));
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

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

