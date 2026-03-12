'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import styles from './StorageChart.module.css';

interface StorageBucket {
  label: string;
  icon: string;
  bytes: number;
  color: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function estimateImageTableSize(table: typeof db.profileImages | typeof db.coverImages): Promise<number> {
  let total = 0;
  await table.each(row => {
    if (row.imageData) total += row.imageData.size || 0;
    if (row.thumbnail) total += row.thumbnail.size || 0;
  });
  return total;
}

async function estimateAudioCacheSize(): Promise<number> {
  let total = 0;
  await db.audioCache.each(row => {
    total += row.size || row.audioData?.size || 0;
  });
  return total;
}

async function estimateJsonTableSize(table: { count: () => Promise<number>; toArray: () => Promise<any[]> }): Promise<number> {
  const rows = await table.toArray();
  return new Blob([JSON.stringify(rows)]).size;
}

function getLocalStorageSize(): number {
  let bytes = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      bytes += key.length * 2;
      bytes += (localStorage.getItem(key)?.length ?? 0) * 2;
    }
  }
  return bytes;
}

const BUCKET_COLORS = [
  '#f97316', // orange  — profile images
  '#3b82f6', // blue    — cover images
  '#ec4899', // pink    — voice notes
  '#8b5cf6', // purple  — messages cache
  '#10b981', // emerald — offline data
  '#ef4444', // red     — outbound queue
  '#6b7280', // gray    — local storage
];

export default function StorageChart({ refreshKey }: { refreshKey?: number }) {
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileImgBytes, coverImgBytes, audioBytes, cachedMsgBytes, offlineBytes, outboundBytes] = await Promise.all([
          estimateImageTableSize(db.profileImages),
          estimateImageTableSize(db.coverImages as any),
          estimateAudioCacheSize(),
          estimateJsonTableSize(db.cachedMessages),
          Promise.all([
            estimateJsonTableSize(db.messages),
            estimateJsonTableSize(db.users),
            estimateJsonTableSize(db.groups),
          ]).then(sizes => sizes.reduce((a, b) => a + b, 0)),
          estimateJsonTableSize(db.outboundQueue),
        ]);

        const lsBytes = getLocalStorageSize();

        const result: StorageBucket[] = [
          { label: 'Profile Images', icon: 'fad fa-user-circle', bytes: profileImgBytes, color: BUCKET_COLORS[0] },
          { label: 'Cover Images', icon: 'fad fa-panorama', bytes: coverImgBytes, color: BUCKET_COLORS[1] },
          { label: 'Voice Notes', icon: 'fad fa-microphone', bytes: audioBytes, color: BUCKET_COLORS[2] },
          { label: 'Message Cache', icon: 'fad fa-comments', bytes: cachedMsgBytes, color: BUCKET_COLORS[3] },
          { label: 'Offline Data', icon: 'fad fa-cloud-arrow-down', bytes: offlineBytes, color: BUCKET_COLORS[4] },
          { label: 'Outbound Queue', icon: 'fad fa-paper-plane', bytes: outboundBytes, color: BUCKET_COLORS[5] },
          { label: 'Preferences', icon: 'fad fa-sliders', bytes: lsBytes, color: BUCKET_COLORS[6] },
        ];

        if (!cancelled) {
          setBuckets(result);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const totalBytes = buckets.reduce((sum, b) => sum + b.bytes, 0);
  const nonZero = buckets.filter(b => b.bytes > 0);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.barTrack}>
          <div className={styles.barPlaceholder} />
        </div>
        <div className={styles.legendLoading}>Calculating…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Total size header */}
      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Total</span>
        <span className={styles.totalValue}>{formatBytes(totalBytes)}</span>
      </div>

      {/* Stacked bar */}
      <div className={styles.barTrack}>
        {totalBytes === 0 ? (
          <div className={styles.barEmpty} />
        ) : (
          nonZero.map((b, i) => {
            const pct = (b.bytes / totalBytes) * 100;
            return (
              <div
                key={b.label}
                className={styles.barSegment}
                style={{
                  width: `${Math.max(pct, 1.5)}%`,
                  backgroundColor: b.color,
                  borderRadius:
                    i === 0 && nonZero.length === 1
                      ? '6px'
                      : i === 0
                        ? '6px 0 0 6px'
                        : i === nonZero.length - 1
                          ? '0 6px 6px 0'
                          : undefined,
                }}
                title={`${b.label}: ${formatBytes(b.bytes)}`}
              />
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {buckets.map(b => (
          <div key={b.label} className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: b.color }} />
            <i className={b.icon} style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '16px', textAlign: 'center' }} />
            <span className={styles.legendLabel}>{b.label}</span>
            <span className={styles.legendSize}>{b.bytes > 0 ? formatBytes(b.bytes) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
