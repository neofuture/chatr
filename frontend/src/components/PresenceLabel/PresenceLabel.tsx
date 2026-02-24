'use client';

import type { PresenceInfo } from '@/components/test/types';
import styles from './PresenceLabel.module.css';

export function formatPresence(info: PresenceInfo): string {
  if (info.status === 'online') return 'Online';
  if (info.status === 'away')   return 'Away';

  // Offline — format last seen
  const date = info.lastSeen;
  if (!date) return 'Last seen a while ago';

  const diff = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diff < 60)
    return `Last seen ${diff} second${diff === 1 ? '' : 's'} ago`;

  const mins = Math.floor(diff / 60);
  if (mins < 60)
    return `Last seen ${mins} minute${mins === 1 ? '' : 's'} ago`;

  const hours = Math.floor(diff / 3600);
  if (hours < 3)
    return `Last seen ${hours} hour${hours === 1 ? '' : 's'} ago`;

  if (hours < 24)
    return `Last seen at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  return `Last seen on ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export type PresenceDotVariant = 'sm' | 'md';

interface PresenceLabelProps {
  info: PresenceInfo;
  /** Show the coloured dot alongside the text. Default true. */
  showDot?: boolean;
  /** Dot size variant. Default 'sm'. */
  dotSize?: PresenceDotVariant;
  className?: string;
}

const DOT_SIZE: Record<PresenceDotVariant, number> = { sm: 7, md: 10 };

export default function PresenceLabel({
  info,
  showDot = true,
  dotSize = 'sm',
  className,
}: PresenceLabelProps) {
  const label = formatPresence(info);

  const colour = info.status === 'online' ? 'var(--presence-online)'
    : info.status === 'away'              ? 'var(--presence-away)'
    :                                       'var(--presence-offline)';

  const size = DOT_SIZE[dotSize];

  return (
    <span className={`${styles.root} ${className ?? ''}`}>
      {showDot && (
        <span
          className={styles.dot}
          aria-hidden="true"
          style={{ width: size, height: size, backgroundColor: colour }}
        />
      )}
      <span className={styles.label}>{label}</span>
    </span>
  );
}

