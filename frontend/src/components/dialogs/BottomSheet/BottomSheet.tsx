'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type HeightMode = 'full' | 'fixed' | 'auto';

interface BottomSheetProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  heightMode?: HeightMode;
  fixedHeight?: string;
  showCloseButton?: boolean;
  title?: string;
  className?: string;
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  heightMode = 'fixed',
  fixedHeight = '60vh',
  showCloseButton = true,
  title,
  className = '',
}: BottomSheetProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isFullyOpen, setIsFullyOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsFullyOpen(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
          // Set fully open after animation completes (300ms)
          setTimeout(() => {
            setIsFullyOpen(true);
          }, 300);
        });
      });
    } else if (shouldRender) {
      setIsAnimating(false);
      setIsFullyOpen(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  // Escape key handler
  useEffect(() => {
    // Only allow Escape dismissal if close button is shown
    if (!isOpen || !onClose || !showCloseButton) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, showCloseButton]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only allow backdrop dismissal if close button is shown
    if (e.target === e.currentTarget && onClose && showCloseButton) {
      onClose();
    }
  };

  const getHeight = () => {
    switch (heightMode) {
      case 'full':
        return '100vh';
      case 'fixed':
        return fixedHeight;
      case 'auto':
        return 'auto';
      default:
        return fixedHeight;
    }
  };

  const getMaxHeight = () => {
    if (heightMode === 'auto') {
      return '90vh';
    }
    return '100vh';
  };

  const getBorderRadius = () => {
    // For full height mode: rounded during animation, square when fully open
    if (heightMode === 'full') {
      return isFullyOpen ? '0' : '1rem';
    }
    // For other modes: always rounded
    return '1rem';
  };

  if (!mounted || !shouldRender) return null;

  const sheetContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          opacity: isAnimating ? 1 : 0,
          transition: 'opacity 300ms ease-in-out',
        }}
        role="presentation"
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
        className={className}
        style={{
          position: 'relative',
          width: '100%',
          height: getHeight(),
          maxHeight: getMaxHeight(),
          backgroundColor: 'var(--bg-secondary)',
          borderTopLeftRadius: getBorderRadius(),
          borderTopRightRadius: getBorderRadius(),
          boxShadow: '0 -10px 50px rgba(0, 0, 0, 0.5)',
          transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms ease-out, border-top-left-radius 300ms ease-out, border-top-right-radius 300ms ease-out',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0,
          }}
        >
          {title ? (
            <h2
              id="bottom-sheet-title"
              style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              {title}
            </h2>
          ) : (
            <div />
          )}

          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              aria-label="Close bottom sheet"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--bg-card)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: heightMode === 'auto' ? 'visible' : 'auto',
            padding: '1.5rem',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
}

