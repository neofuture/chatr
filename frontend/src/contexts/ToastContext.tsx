'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'newmessage';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  /** Optional custom title — overrides the default type-based title */
  title?: string;
  /** Optional click handler — e.g. navigate to a conversation */
  onClick?: () => void;
  /** Optional label shown on the toast action button */
  actionLabel?: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, duration?: number, onClick?: () => void, actionLabel?: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType, duration: number = 4000, onClick?: () => void, actionLabel?: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration, onClick, actionLabel, title };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

