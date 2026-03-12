'use client';

import { useState, useEffect } from 'react';
import { usePresence } from '@/contexts/PresenceContext';
import { useFriends } from '@/hooks/useFriends';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import PresenceLabel from '@/components/PresenceLabel/PresenceLabel';
import { imageUrl } from '@/lib/imageUrl';
import styles from './UserProfilePanel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  profileImage: string | null;
  coverImage: string | null;
  lastSeen: string | null;
  phoneNumber?: string | null;
  email?: string | null;
}

interface Props {
  userId: string;
}

export default function UserProfilePanel({ userId }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);

  const { userPresence, requestPresence } = usePresence();
  const { showConfirmation } = useConfirmation();
  const {
    friends, incoming, outgoing, blocked,
    sendRequest, acceptRequest, declineRequest,
    removeFriend, blockUser, unblockUser, refresh,
  } = useFriends();

  // Fetch profile on mount
  useEffect(() => {
    if (!userId) return;
    const token = localStorage.getItem('token');
    setLoading(true);
    setError(false);
    fetch(`${API}/api/users/by-id/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (data.blockedByThem) {
          setBlockedByThem(true);
        } else {
          setProfile(data.user);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [userId]);

  // Request presence for this user
  useEffect(() => {
    if (userId) requestPresence([userId]);
  }, [userId, requestPresence]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <i className="fa-solid fa-circle-notch fa-spin" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <i className="fa-solid fa-user-slash" style={{ fontSize: '32px' }} />
          <span>Could not load profile</span>
        </div>
      </div>
    );
  }

  if (blockedByThem) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <i className="fa-solid fa-ban" style={{ fontSize: '32px' }} />
          <span>Content not available</span>
        </div>
      </div>
    );
  }

  const displayName = profile.displayName || profile.username.replace(/^@/, '');
  const info = userPresence[userId] ?? { status: 'offline' as const, lastSeen: null };

  // ── Friendship state ──────────────────────────────────────────────────────
  const friend       = friends.find(f => f.user.id === userId);
  const incomingReq  = incoming.find(r => r.user.id === userId);
  const outgoingReq  = outgoing.find(r => r.user.id === userId);
  const blockedEntry = blocked.find(b => b.user.id === userId);
  const isFriend     = !!friend;
  const isBlocked    = !!blockedEntry;

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleAddFriend = () => sendRequest(userId);

  const handleRemoveFriend = async () => {
    if (!friend) return;
    const ok = await showConfirmation({
      title: 'Remove Friend',
      message: `Remove ${displayName} from your friends?`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Remove', variant: 'destructive', value: true },
      ],
    });
    if (ok) { removeFriend(friend.friendshipId, userId); await refresh(); }
  };

  const handleBlock = async () => {
    const ok = await showConfirmation({
      title: 'Block User',
      message: `Block ${displayName}? This will also remove them from your friends.`,
      urgency: 'danger',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Block', variant: 'destructive', value: true },
      ],
    });
    if (ok) { await blockUser(userId); await refresh(); }
  };

  const handleUnblock = async () => {
    const ok = await showConfirmation({
      title: 'Unblock User',
      message: `Unblock ${displayName}?`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Unblock', variant: 'destructive', value: true },
      ],
    });
    if (ok) { await unblockUser(userId); await refresh(); }
  };

  const handleAccept = () => incomingReq && acceptRequest(incomingReq.friendshipId, userId);
  const handleDecline = () => incomingReq && declineRequest(incomingReq.friendshipId, userId);
  const handleCancelRequest = () => outgoingReq && declineRequest(outgoingReq.friendshipId, userId);

  return (
    <div className={styles.page}>

      {/* Hero: cover image + avatar ring overlapping the bottom edge */}
      <div className={styles.hero}>
        <div className={styles.cover}>
          <img
            src={profile.coverImage || '/cover/default-cover.jpg'}
            alt="Cover"
            className={styles.coverImg}
          />
        </div>
        <div className={styles.avatarRing}>
          <div className={styles.avatarInner}>
            <img
              src={imageUrl(profile.profileImage, 'md') || '/profile/default-profile.jpg'}
              alt={displayName}
              className={styles.avatarImg}
            />
          </div>
        </div>
      </div>

      {/* Content below the hero */}
      <div className={styles.content}>
        <div className={styles.nameBlock}>
          <h2 className={styles.displayName}>{displayName}</h2>
          <p className={styles.username}>@{profile.username.replace(/^@/, '')}</p>

          {/* Presence */}
          {!info.hidden && (
            <div className={styles.presenceRow}>
              <span
                className={`${styles.dot} ${
                  info.status === 'online'  ? styles.dotOnline  :
                  info.status === 'away'    ? styles.dotAway    :
                  styles.dotOffline
                }`}
              />
              <PresenceLabel info={info} showDot={false} />
            </div>
          )}
        </div>

        {/* Friend actions */}
        <div className={styles.actions}>
            {isBlocked ? (
              <button className={styles.btnDanger} onClick={handleUnblock}>
                <i className="fa-solid fa-lock-open" /> Unblock
              </button>
            ) : isFriend ? (
              <>
                <button className={styles.btnSecondary} onClick={handleRemoveFriend}>
                  <i className="fa-solid fa-user-minus" /> Remove Friend
                </button>
                <button className={styles.btnDanger} onClick={handleBlock}>
                  <i className="fa-solid fa-ban" /> Block
                </button>
              </>
            ) : incomingReq ? (
              <>
                <button className={styles.btnPrimary} onClick={handleAccept}>
                  <i className="fa-solid fa-check" /> Accept
                </button>
                <button className={styles.btnSecondary} onClick={handleDecline}>
                  <i className="fa-solid fa-xmark" /> Decline
                </button>
              </>
            ) : outgoingReq ? (
              <>
                <span className={styles.btnSecondary} style={{ cursor: 'default', opacity: 0.6 }}>
                  <i className="fa-regular fa-clock" /> Request sent
                </span>
                <button className={styles.btnSecondary} onClick={handleCancelRequest}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button className={styles.btnPrimary} onClick={handleAddFriend}>
                  <i className="fa-solid fa-user-plus" /> Add Friend
                </button>
                <button className={styles.btnDanger} onClick={handleBlock}>
                  <i className="fa-solid fa-ban" /> Block
                </button>
              </>
            )}
        </div>

        {/* Info section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Profile</h3>
          <div className={styles.sectionBody}>
            {profile.displayName && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{profile.displayName}</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Username</span>
              <span className={styles.infoValue}>@{profile.username.replace(/^@/, '')}</span>
            </div>
            {profile.phoneNumber && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Phone</span>
                <span className={styles.infoValue}>{profile.phoneNumber}</span>
              </div>
            )}
            {profile.email && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{profile.email}</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
