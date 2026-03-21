'use client';

import { useMemo } from 'react';
import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label?: string;
  visibleCount?: number;
}

const BTN_REM = 2;
const GAP_REM = 0.35;
const STEP = BTN_REM + GAP_REM;

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  label,
  visibleCount = 5,
}: PaginationProps) {
  const clipWidth = visibleCount * BTN_REM + (visibleCount - 1) * GAP_REM;

  const { translateX, fadeEdge } = useMemo(() => {
    const centerSlot = (clipWidth - BTN_REM) / 2;
    const raw = centerSlot - (currentPage - 1) * STEP;
    const minOffset = clipWidth - (totalPages * BTN_REM + (totalPages - 1) * GAP_REM);
    const clamped = Math.min(0, Math.max(minOffset, raw));
    const atStart = clamped >= 0;
    const atEnd = clamped <= minOffset;
    const fade = atStart && atEnd ? 'none' : atStart ? 'start' : atEnd ? 'end' : 'both';
    return { translateX: clamped, fadeEdge: fade };
  }, [currentPage, totalPages, clipWidth]);

  const allPages = useMemo(() => {
    const arr: number[] = [];
    for (let i = 1; i <= totalPages; i++) arr.push(i);
    return arr;
  }, [totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className={styles.bar}>
      <span className={styles.label}>
        {label || `Page ${currentPage} of ${totalPages}`}
      </span>
      <div className={styles.controls}>
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={styles.btnIcon}
          title="First page"
        >
          <i className="fas fa-angles-left" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.btnNav}
        >
          <i className="fas fa-chevron-left" style={{ marginRight: '0.25rem' }} /> Prev
        </button>

        <div className={styles.pageTrackClip} data-fade={fadeEdge} style={{ width: `${clipWidth}rem` }}>
          <div
            className={styles.pageTrack}
            style={{ transform: `translateX(${translateX}rem)` }}
          >
            {allPages.map(p => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={p === currentPage ? styles.btnPageActive : styles.btnPage}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.btnNav}
        >
          Next <i className="fas fa-chevron-right" style={{ marginLeft: '0.25rem' }} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={styles.btnIcon}
          title="Last page"
        >
          <i className="fas fa-angles-right" />
        </button>
      </div>
    </div>
  );
}
