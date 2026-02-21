'use client';

import { useEffect } from 'react';

interface LightboxProps {
  imageUrl: string;
  imageName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Lightbox({ imageUrl, imageName, isOpen, onClose }: LightboxProps) {

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-in',
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          color: '#ffffff',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
          backdropFilter: 'blur(10px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
        aria-label="Close lightbox"
      >
        ✕
      </button>

      {/* Image name */}
      {imageName && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '500',
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '10px 20px',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
          }}
        >
          {imageName}
        </div>
      )}

      {/* Image */}
      <img
        src={imageUrl}
        alt={imageName || 'Full size image'}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
        style={{
          maxWidth: '90%',
          maxHeight: '90%',
          objectFit: 'contain',
          borderRadius: '8px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          animation: 'zoomIn 0.2s ease-out',
        }}
      />

      {/* Instructions */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '14px',
          textAlign: 'center',
        }}
      >
        Click anywhere or press ESC to close
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes zoomIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

