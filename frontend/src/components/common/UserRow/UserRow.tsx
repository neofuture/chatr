'use client';

import type { ReactNode } from 'react';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import type { PresenceInfo } from '@/types/types';
import styles from './UserRow.module.css';

interface Props {
  profileImage: string | null;
  displayName: string;
  subtitle?: string;
  presence?: PresenceInfo;
  showPresenceDot?: boolean;
  avatarSize?: number;
  isFriend?: boolean;
  badges?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  onAvatarClick?: () => void;
}

export default function UserRow({
  profileImage,
  displayName,
  subtitle,
  presence = { status: 'offline', lastSeen: null },
  showPresenceDot = true,
  avatarSize = 40,
  isFriend,
  badges,
  actions,
  onClick,
  onAvatarClick,
}: Props) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag className={styles.row} onClick={onClick}>
      <PresenceAvatar
        profileImage={profileImage}
        displayName={displayName}
        size={avatarSize}
        info={presence}
        showDot={showPresenceDot}
        onClick={onAvatarClick ? (e) => { e.stopPropagation(); onAvatarClick(); } : undefined}
      />
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{displayName}</span>
          {isFriend && <span className={styles.friendBadge}>Friend</span>}
          {badges}
        </div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </Tag>
  );
}
