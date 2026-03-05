'use client';

import { useFriends } from '@/hooks/useFriends';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import { useOpenUserProfile } from '@/hooks/useOpenUserProfile';
import styles from './BlockedUsersPanel.module.css';

export default function BlockedUsersPanel() {
  const { blocked, unblockUser } = useFriends();
  const { showConfirmation } = useConfirmation();
  const openUserProfile = useOpenUserProfile();

  const handleUnblock = async (targetUserId: string, displayName: string) => {
    const result = await showConfirmation({
      title: 'Unblock User',
      message: `Are you sure you want to unblock ${displayName}?`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Unblock', variant: 'destructive', value: true },
      ],
    });
    if (result === true) {
      await unblockUser(targetUserId);
    }
  };

  return (
    <div className={styles.container}>
      {blocked.length === 0 ? (
        <div className={styles.empty}>
          <i className="fad fa-user-check" />
          <span>No blocked users</span>
        </div>
      ) : (
        <div className={styles.list}>
          {blocked.map((b) => {
            const dn = b.user.displayName || b.user.username?.replace(/^@/, '') || 'Unknown';
            return (
              <div key={b.friendshipId} className={styles.row}>
                <PresenceAvatar
                  profileImage={b.user.profileImage ?? null}
                  displayName={dn}
                  size={40}
                  info={{ status: 'offline', lastSeen: null }}
                  showDot={false}
                  onClick={() => openUserProfile(b.user.id, dn, b.user.profileImage)}
                />
                <div className={styles.info}>
                  <span className={styles.name}>{dn}</span>
                  <span className={styles.username}>{b.user.username}</span>
                </div>
                <button
                  className={styles.unblockBtn}
                  onClick={() => handleUnblock(b.user.id, dn)}
                >
                  <i className="fas fa-lock-open" />
                  Unblock
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

