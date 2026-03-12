'use client';

import { useState } from 'react';
import styles from './LinkPreviewCard.module.css';

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

interface LinkPreviewCardProps {
  preview: LinkPreviewData;
  onDismiss?: () => void;
  compact?: boolean;
}

export default function LinkPreviewCard({ preview, onDismiss, compact }: LinkPreviewCardProps) {
  const [imgError, setImgError] = useState(false);
  const domain = preview.siteName || (() => {
    try { return new URL(preview.url).hostname.replace(/^www\./, ''); } catch { return ''; }
  })();

  const hasImage = preview.image && !imgError;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.card} ${compact ? styles.compact : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {onDismiss && (
        <button
          className={styles.dismiss}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
          aria-label="Dismiss preview"
        >
          &times;
        </button>
      )}

      {hasImage && (
        <div className={styles.imageWrap}>
          <img
            src={preview.image!}
            alt=""
            className={styles.image}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.site}>
          {preview.favicon && (
            <img src={preview.favicon} alt="" className={styles.favicon} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <span>{domain}</span>
        </div>
        {preview.title && (
          <div className={styles.title}>{preview.title}</div>
        )}
        {preview.description && (
          <div className={styles.description}>
            {preview.description.length > 120 ? preview.description.slice(0, 120) + '...' : preview.description}
          </div>
        )}
      </div>
    </a>
  );
}
