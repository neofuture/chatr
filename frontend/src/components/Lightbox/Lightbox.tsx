'use client';

import { useEffect } from 'react';
import styles from './Lightbox.module.css';

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
    <div className={styles.overlay} onClick={onClose}>
      {/* Close button */}
      <button onClick={onClose} className={styles.closeBtn} aria-label="Close lightbox">
        ✕
      </button>

      {/* Image name */}
      {imageName && (
        <div className={styles.imageName}>{imageName}</div>
      )}

      {/* Image */}
      <img
        src={imageUrl}
        alt={imageName || 'Full size image'}
        onClick={(e) => e.stopPropagation()}
        className={styles.image}
      />

      {/* Instructions */}
      <div className={styles.instructions}>
        Click anywhere or press ESC to close
      </div>
    </div>
  );
}
