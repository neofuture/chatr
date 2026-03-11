'use client';

import styles from './BackgroundBlobs.module.css';

export default function BackgroundBlobs() {
  return (
    <div className={styles['bg-effects']} data-testid="bg-effects">
      <div className={`${styles['bg-blob']} ${styles['bg-blob-1']}`} data-testid="bg-blob-1"></div>
      <div className={`${styles['bg-blob']} ${styles['bg-blob-2']}`} data-testid="bg-blob-2"></div>
      <div className={`${styles['bg-blob']} ${styles['bg-blob-3']}`} data-testid="bg-blob-3"></div>
    </div>
  );
}
