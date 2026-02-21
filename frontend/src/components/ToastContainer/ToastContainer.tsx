'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast, Toast } from '@/contexts/ToastContext';

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(toast.duration || 4000);

  // Get title based on toast type
  const getTitle = () => {
    switch (toast.type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'info':
        return 'Info';
      case 'warning':
        return 'Warning';
      default:
        return '';
    }
  };

  // ...existing timer functions...
  const startTimer = () => {
    if (toast.duration && toast.duration > 0 && remainingTimeRef.current > 0) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        handleClose();
      }, remainingTimeRef.current);
    }
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      // Calculate remaining time
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  };

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove();
    }, 300); // Match animation duration
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
    pauseTimer();
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimer();
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`toast toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
      onClick={handleClose}
    >
      <div className="toast-icon">
        {toast.type === 'success' && <i className="fas fa-check"></i>}
        {toast.type === 'error' && <i className="fas fa-times"></i>}
        {toast.type === 'info' && <i className="fas fa-info-circle"></i>}
        {toast.type === 'warning' && <i className="fas fa-exclamation-triangle"></i>}
      </div>
      <div className="toast-message">
        <div className="toast-title">{getTitle()}</div>
        <div className="toast-text">{toast.message}</div>
      </div>
      <button
        className="toast-close"
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
      >
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

