'use client';

import type { PresenceInfo } from '@/types/types.ts';
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
  /** Optional click handler — makes the avatar interactive */
  onClick?: (e: React.MouseEvent) => void;
  /** Whether this is the AI bot — shows teal ring instead of orange-red */
  isBot?: boolean;
  /** Whether this is a widget guest — shows green ring */
  isGuest?: boolean;
  /** Whether this is a group — shows fa-users icon with orange ring */
  isGroup?: boolean;
}

export default function PresenceAvatar({
  displayName,
  profileImage,
  info,
  size = 50,
  showDot = true,
  onClick,
  isBot = false,
  isGuest = false,
  isGroup = false,
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

  const ring   = size <= 40 ? 1 : 2;
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
    <div
      className={styles.root}
      style={{ width: size, height: size, cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e as any); } : undefined}
    >
      {/* Gradient ring */}
      <div
        className={isBot ? styles.ringBot : isGuest ? styles.ringGuest : styles.ring}
        style={{ borderRadius: '50%', padding: ring }}
      >
        {profileImage ? (
          <img
            src={profileImage}
            alt={displayName}
            className={styles.image}
            style={{ width: inner, height: inner }}
          />
        ) : isGroup ? (
          <div
            className={styles.initials}
            style={{ width: inner, height: inner, fontSize: Math.round(size * 0.38) }}
          >
            <i className="fas fa-users" />
          </div>
        ) : (
          <div
            className={isBot ? styles.initialsBot : isGuest ? styles.initialsGuest : styles.initials}
            style={{ width: inner, height: inner, fontSize: Math.round(size * 0.36) }}
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

