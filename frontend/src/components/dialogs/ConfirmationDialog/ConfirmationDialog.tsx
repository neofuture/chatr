'use client';

import { useEffect } from 'react';
import { useConfirmation } from '@/contexts/ConfirmationContext';

export default function ConfirmationDialog() {
  const { currentConfirmation, closeConfirmation } = useConfirmation();

  // Handle keyboard events
  useEffect(() => {
    if (!currentConfirmation?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close with undefined/cancel
        closeConfirmation(undefined);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentConfirmation?.isOpen, closeConfirmation]);

  if (!currentConfirmation || !currentConfirmation.isOpen) {
    return null;
  }

  const { title, message, actions, urgency = 'info' } = currentConfirmation;

  const getUrgencyColor = () => {
    switch (urgency) {
      case 'danger':
        return 'rgba(239, 68, 68, 0.1)';
      case 'warning':
        return 'rgba(249, 115, 22, 0.1)';
      default:
        return 'rgba(59, 130, 246, 0.1)';
    }
  };

  const getButtonStyle = (action: typeof actions[0]) => {
    return {
      width: '100%',
      padding: '0.875rem 1rem',
      fontSize: '1.0625rem',
      fontWeight: action.variant === 'destructive' ? '600' : '400',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      transition: 'background 0.2s',
      color: action.variant === 'destructive'
        ? '#ef4444'
        : action.variant === 'primary'
          ? 'var(--blue-500)'
          : 'var(--blue-300)',
    };
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="confirmation-backdrop"
        onClick={() => closeConfirmation(undefined)}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 10500,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Dialog */}
      <div
        className="confirmation-dialog"
        role="alertdialog"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10501,
          width: '90%',
          maxWidth: '320px',
          animation: 'confirmationScale 0.25s cubic-bezier(0.36, 0.66, 0.04, 1)',
        }}
      >
        {/* Dialog Content */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(20px)',
            borderRadius: '1rem',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
          }}
        >
          {/* Header with urgency indicator */}
          <div
            style={{
              padding: '1.5rem 1.25rem 1rem',
              background: getUrgencyColor(),
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <h2
              id="confirmation-title"
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
                textAlign: 'center',
              }}
            >
              {title}
            </h2>
            <p
              id="confirmation-message"
              style={{
                fontSize: '0.9375rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
                textAlign: 'center',
              }}
            >
              {message}
            </p>
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => closeConfirmation(action.value)}
                style={getButtonStyle(action)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {action.label}
                {index < actions.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: 'var(--border-color)',
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

