'use client';

import type { PresenceInfo } from '@/components/test/types';
import styles from './PresenceAvatar.module.css';

interface PresenceAvatarProps {
  /** Display name — used to derive initials if no image */
  displayName: string;
  /** Profile image URL — if absent, initials are shown */
  profileImage?: string | null;
  /** Presence info for the dot colour */
  info: PresenceInfo;
  /** Outer diameter in px. Default 50. */
  size?: number;
  /** Whether to show the presence dot. Default true. */
  showDot?: boolean;
}

export default function PresenceAvatar({
  displayName,
  profileImage,
  info,
  size = 50,
  showDot = true,
}: PresenceAvatarProps) {
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || displayName.slice(0, 2).toUpperCase();

  const dotColour = info.status === 'online' ? 'var(--presence-online)'
    : info.status === 'away'                 ? 'var(--presence-away)'
    :                                          'var(--presence-offline)';

  const ring   = 3;
  const inner  = size - ring * 2;
  const dotSz  = Math.max(13, Math.round(size * 0.36)); // bigger, min 13px

  // Position the dot so its centre sits exactly on the circle's edge at ~135° (bottom-right).
  // Centre of circle is at (size/2, size/2). Point on circumference at 135° from top:
  //   cx = size/2 + (size/2) * cos(45°) = size/2 + size/2 * 0.707
  //   cy = size/2 + (size/2) * sin(45°) = same
  // We position bottom/right from the container edge, so:
  //   right  = size - (cx + dotSz/2) = size/2 - size/2*0.707 - dotSz/2
  //   bottom = size - (cy + dotSz/2) = same
  const r      = size / 2;
  const centre = r + r * 0.707; // x/y coordinate of dot centre from top-left
  const dotPos = Math.round(size - centre - dotSz / 2);

  return (
    <div className={styles.root} style={{ width: size, height: size }}>
      {/* Gradient ring — only shown around photos; initials have their own gradient bg */}
      <div
        className={profileImage ? styles.ring : styles.ringBorder}
        style={{ borderRadius: '50%', padding: ring }}
      >
        {profileImage ? (
          <img
            src={profileImage}
            alt={displayName}
            className={styles.image}
            style={{ width: inner, height: inner }}
          />
        ) : (
          <div
            className={styles.initials}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Presence dot — hidden if user suppresses online status */}
      {showDot && !info.hidden && (
        <span
          className={styles.dot}
          aria-hidden="true"
          style={{
            width:  dotSz,
            height: dotSz,
            backgroundColor: dotColour,
            bottom: dotPos,
            right:  dotPos,
          }}
        />
      )}
    </div>
  );
}

