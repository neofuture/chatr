'use client';

import React, { useState, useEffect } from 'react';
import { useFriends } from '@/hooks/useFriends';
import { usePresence } from '@/contexts/PresenceContext';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import type { FriendEntry, FriendRequest, FriendUser } from '@/types/types';
import PaneSearchBox from '@/components/common/PaneSearchBox/PaneSearchBox';
import UserRow from '@/components/common/UserRow/UserRow';
import { useOpenUserProfile } from '@/hooks/useOpenUserProfile';
import styles from './FriendsPanel.module.css';

type Tab = 'friends' | 'search' | 'requests' | 'blocked';

interface Props {
  onStartChat?: (userId: string, displayName: string, profileImage?: string | null, isFriend?: boolean, friendshipId?: string | null) => void;
}

export default function FriendsPanel({ onStartChat }: Props) {
  const [tab, setTab] = useState<Tab>('friends');
  const { userPresence, requestPresence } = usePresence();
  const openUserProfile = useOpenUserProfile();
  const { showConfirmation } = useConfirmation();
  const {
    friends, incoming, outgoing, blocked, loading,
    searchQuery, setSearchQuery, searchResults, searching,
    sendRequest, acceptRequest, declineRequest, removeFriend, blockUser, unblockUser,
  } = useFriends();


  // Request presence for any users returned by search
  useEffect(() => {
    if (searchResults.length > 0) {
      requestPresence(searchResults.map((u: FriendUser) => u.id));
    }
  }, [searchResults, requestPresence]);

  const totalRequests = incoming.length;

  const dn = (u: { displayName?: string | null; username: string }) =>
    u.displayName || u.username.replace(/^@/, '');

  const uname = (u: { username: string }) => `@${u.username.replace(/^@/, '')}`;

  const presence = (id: string) => userPresence[id] ?? { status: 'offline' as const, lastSeen: null };

  // ── Search tab ─────────────────────────────────────────────────────────────
  const renderSearch = () => (
    <div className={styles.list}>
      {searching && (
        <div className={styles.spinner}><i className="fa-solid fa-circle-notch fa-spin" /></div>
      )}
      {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><i className="fa-solid fa-user-slash" /></div>
          No users found for &ldquo;{searchQuery}&rdquo;
        </div>
      )}
      {!searching && searchQuery.length < 2 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><i className="fa-solid fa-magnifying-glass" /></div>
          Type at least 2 characters to search
        </div>
      )}
      {searchResults.map((u: FriendUser) => {
        const fs = u.friendship;
        const isBlocked = fs?.status === 'blocked';
        return (
          <UserRow
            key={u.id}
            profileImage={u.profileImage ?? null}
            displayName={dn(u)}
            subtitle={uname(u)}
            presence={presence(u.id)}
            isFriend={fs?.status === 'accepted'}
            onAvatarClick={() => openUserProfile(u.id, dn(u), u.profileImage)}
            actions={<>
              {!fs && !isBlocked && (
                <button className={styles.btnAdd} onClick={() => sendRequest(u.id)}>
                  <i className="fa-solid fa-plus" /> Add
                </button>
              )}
              {fs?.status === 'pending' && fs.iRequested && (
                <span className={styles.btnPending}><i className="fa-regular fa-clock" /> Pending</span>
              )}
              {fs?.status === 'pending' && !fs.iRequested && (
                <>
                  <button className={styles.btnAccept} onClick={() => acceptRequest(fs.id, u.id)}>Accept</button>
                  <button className={styles.btnDecline} onClick={() => declineRequest(fs.id, u.id)}>Decline</button>
                </>
              )}
              {fs?.status === 'accepted' && (
                <span className={styles.btnFriend}><i className="fa-solid fa-user-check" /> Friend</span>
              )}
              {isBlocked && (
                <button className={styles.btnGhost} onClick={() => unblockUser(u.id)}>Unblock</button>
              )}
              {!isBlocked && (
                <button
                  className={styles.btnAccept}
                  onClick={() => onStartChat?.(u.id, dn(u), u.profileImage, fs?.status === 'accepted', fs?.status === 'accepted' ? fs?.id : undefined)}
                  title="Send message"
                >
                  <i className="fa-solid fa-comment" />
                </button>
              )}
            </>}
          />
        );
      })}
    </div>
  );

  // ── Friends tab ────────────────────────────────────────────────────────────
  const handleRemoveFriend = async (f: FriendEntry) => {
    const result = await showConfirmation({
      title: 'Remove Friend',
      message: `Are you sure you want to remove ${dn(f.user)} from your friends?`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Remove', variant: 'destructive', value: true },
      ],
    });
    if (result === true) {
      removeFriend(f.friendshipId, f.user.id);
    }
  };

  const handleBlockUser = async (f: FriendEntry) => {
    const result = await showConfirmation({
      title: 'Block User',
      message: `Are you sure you want to block ${dn(f.user)}? This will also remove them from your friends.`,
      urgency: 'danger',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Block', variant: 'destructive', value: true },
      ],
    });
    if (result === true) {
      blockUser(f.user.id);
    }
  };

  const renderFriends = () => {
    if (loading) return <div className={styles.spinner}><i className="fa-solid fa-circle-notch fa-spin" /></div>;
    if (friends.length === 0) return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}><i className="fa-solid fa-user-group" /></div>
        No friends yet — use Search to find people
      </div>
    );
    return (
      <div className={styles.list}>
        {friends.map((f: FriendEntry) => (
          <UserRow
            key={f.friendshipId}
            profileImage={f.user.profileImage ?? null}
            displayName={dn(f.user)}
            subtitle={uname(f.user)}
            presence={presence(f.user.id)}
            onAvatarClick={() => openUserProfile(f.user.id, dn(f.user), f.user.profileImage)}
            actions={<>
              <button className={styles.btnGhost} onClick={() => handleRemoveFriend(f)}>
                <i className="fa-solid fa-user-minus" /> Remove
              </button>
              <button className={styles.btnDanger} onClick={() => handleBlockUser(f)}>
                <i className="fa-solid fa-ban" /> Block
              </button>
              <button
                className={styles.btnAccept}
                onClick={() => onStartChat?.(f.user.id, dn(f.user), f.user.profileImage, true, f.friendshipId)}
              >
                <i className="fa-solid fa-comment" />
              </button>
            </>}
          />
        ))}
      </div>
    );
  };

  // ── Requests tab ───────────────────────────────────────────────────────────
  const renderRequests = () => {
    if (loading) return <div className={styles.spinner}><i className="fa-solid fa-circle-notch fa-spin" /></div>;
    const hasAny = incoming.length > 0 || outgoing.length > 0;
    if (!hasAny) return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}><i className="fa-solid fa-envelope-open" /></div>
        No pending friend requests
      </div>
    );
    return (
      <div className={styles.list}>
        {incoming.length > 0 && (
          <>
            <div className={styles.sectionHeader}>Incoming</div>
            {incoming.map((r: FriendRequest) => (
              <UserRow
                key={r.friendshipId}
                profileImage={r.user.profileImage ?? null}
                displayName={dn(r.user)}
                subtitle={uname(r.user)}
                presence={presence(r.user.id)}
                onAvatarClick={() => openUserProfile(r.user.id, dn(r.user), r.user.profileImage)}
                actions={<>
                  <button className={styles.btnAccept} onClick={() => acceptRequest(r.friendshipId, r.user.id)}>
                    <i className="fa-solid fa-check" /> Accept
                  </button>
                  <button className={styles.btnDecline} onClick={() => declineRequest(r.friendshipId, r.user.id)}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </>}
              />
            ))}
          </>
        )}
        {outgoing.length > 0 && (
          <>
            <div className={styles.sectionHeader}>Sent</div>
            {outgoing.map((r: FriendRequest) => (
              <UserRow
                key={r.friendshipId}
                profileImage={r.user.profileImage ?? null}
                displayName={dn(r.user)}
                subtitle="Pending acceptance"
                presence={{ status: 'offline', lastSeen: null }}
                showPresenceDot={false}
                onAvatarClick={() => openUserProfile(r.user.id, dn(r.user), r.user.profileImage)}
                actions={
                  <button className={styles.btnDecline} onClick={() => declineRequest(r.friendshipId, r.user.id)}>
                    Cancel
                  </button>
                }
              />
            ))}
          </>
        )}
      </div>
    );
  };

  // ── Blocked tab ────────────────────────────────────────────────────────────
  const renderBlocked = () => {
    if (loading) return <div className={styles.spinner}><i className="fa-solid fa-circle-notch fa-spin" /></div>;
    if (blocked.length === 0) return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}><i className="fa-solid fa-ban" /></div>
        No blocked users
      </div>
    );
    return (
      <div className={styles.list}>
        {blocked.map((b: FriendEntry) => (
          <UserRow
            key={b.friendshipId}
            profileImage={b.user.profileImage ?? null}
            displayName={dn(b.user)}
            subtitle={uname(b.user)}
            presence={{ status: 'offline', lastSeen: null }}
            showPresenceDot={false}
            onAvatarClick={() => openUserProfile(b.user.id, dn(b.user), b.user.profileImage)}
            actions={
              <button className={styles.btnGhost} onClick={() => unblockUser(b.user.id)}>
                <i className="fa-solid fa-lock-open" /> Unblock
              </button>
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Search */}
      <PaneSearchBox
        value={searchQuery}
        onChange={val => {
          setSearchQuery(val);
          if (val.length >= 2) setTab('search');
          if (val.length === 0) setTab('friends');
        }}
        onClear={() => setTab('friends')}
        placeholder="Search people…"
        autoFocus
      />

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'friends' ? styles.tabActive : ''}`} onClick={() => setTab('friends')}>
          <i className="fa-solid fa-user-group" /> Friends
        </button>
        <button className={`${styles.tab} ${tab === 'requests' ? styles.tabActive : ''}`} onClick={() => setTab('requests')}>
          <i className="fa-solid fa-user-clock" /> Requests
          {totalRequests > 0 && <span className={styles.badge}>{totalRequests}</span>}
        </button>
        <button className={`${styles.tab} ${tab === 'blocked' ? styles.tabActive : ''}`} onClick={() => setTab('blocked')}>
          <i className="fa-solid fa-ban" /> Blocked
        </button>
      </div>

      {tab === 'search' && renderSearch()}
      {tab === 'friends' && renderFriends()}
      {tab === 'requests' && renderRequests()}
      {tab === 'blocked' && renderBlocked()}
    </div>
  );
}
