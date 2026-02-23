'use client';

import { useEffect } from 'react';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import styles from './ConfirmationDialog.module.css';

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
      case 'danger': return 'rgba(239, 68, 68, 0.1)';
      case 'warning': return 'rgba(249, 115, 22, 0.1)';
      default: return 'rgba(59, 130, 246, 0.1)';
    }
  };

  const getActionClass = (action: typeof actions[0]) => {
    if (action.variant === 'destructive') return `${styles.actionBtn} ${styles.actionBtnDestructive}`;
    if (action.variant === 'primary') return `${styles.actionBtn} ${styles.actionBtnPrimary}`;
    return `${styles.actionBtn} ${styles.actionBtnDefault}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`confirmation-backdrop ${styles.backdrop}`}
        onClick={() => closeConfirmation(undefined)}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
        style={{ zIndex: 10500 }}
      />

      {/* Dialog */}
      <div
        className={`confirmation-dialog ${styles.dialog}`}
        role="alertdialog"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
        style={{ zIndex: 10501 }}
      >
        <div className={styles.card}>
          {/* Header */}
          <div className={styles.header} style={{ background: getUrgencyColor() }}>
            <h2 id="confirmation-title" className={styles.dialogTitle}>{title}</h2>
            <p id="confirmation-message" className={styles.dialogMessage}>{message}</p>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => closeConfirmation(action.value)}
                className={getActionClass(action)}
              >
                {action.label}
                {index < actions.length - 1 && (
                  <div className={styles.actionDivider} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
