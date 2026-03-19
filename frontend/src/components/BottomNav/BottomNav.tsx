'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { getProfileImageURL } from '@/lib/profileImageService';
import styles from './BottomNav.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function BottomNav() {
  const { theme: themeMode } = useTheme();
  const { socket, connected } = useWebSocket();
  const pathname = usePathname();
  const [profileImageUrl, setProfileImageUrl] = useState('/profile/default-profile.jpg');
  const [firstName, setFirstName] = useState('ME');
  const [pendingRequests, setPendingRequests] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [unreadGroups, setUnreadGroups] = useState(0);

  // Combined badge = DM unreads + group unreads
  const totalUnread = unreadChats + unreadGroups;


  const isDark = themeMode === 'dark';

  const theme = {
    headerBg: isDark ? '#1e293b' : '#f8fafc',
    border: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.2)',
    menuText: isDark ? '#93c5fd' : '#64748b',
    activeText: '#f97316',
  };

  useEffect(() => {
    const loadProfileImage = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const url = await getProfileImageURL(user.id);
          if (url) {
            setProfileImageUrl(url);
          } else if (user.profileImage) {
            setProfileImageUrl(user.profileImage);
          }
          const name = user.firstName || user.displayName?.split(' ')[0] || user.username?.replace(/^@/, '') || 'ME';
          setFirstName(name.toUpperCase());
        }
      } catch {}
    };

    loadProfileImage();

    const handler = () => loadProfileImage();
    window.addEventListener('profileImageUpdated', handler);
    return () => window.removeEventListener('profileImageUpdated', handler);
  }, []);

  // Fetch unread chat count when socket connects + poll
  useEffect(() => {
    if (!connected) return;
    const fetchUnread = async () => {
      try {
        const { socketFirst } = await import('@/lib/socketRPC');
        const data = await socketFirst(socket, 'conversations:request', {}, 'GET', '/api/users/conversations') as any;
        const total = ((data?.conversations ?? []) as any[]).reduce(
          (sum: number, c: any) => sum + (c.unreadCount ?? 0), 0
        );
        setUnreadChats(total);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);

    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.total === 'number') {
        setUnreadChats(detail.total);
      } else {
        setTimeout(fetchUnread, 500);
      }
    };
    const onGroupUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.total === 'number') {
        setUnreadGroups(detail.total);
      }
    };
    window.addEventListener('chatr:unread-changed', onUpdate);
    window.addEventListener('chatr:group-unread-changed', onGroupUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('chatr:unread-changed', onUpdate);
      window.removeEventListener('chatr:group-unread-changed', onGroupUpdate);
    };
  }, [socket, connected]);

  // Fetch incoming friend request count when socket connects
  useEffect(() => {
    if (!connected) return;
    const fetchPending = async () => {
      try {
        const { socketFirst } = await import('@/lib/socketRPC');
        const data = await socketFirst(socket, 'friends:requests:incoming', {}, 'GET', '/api/friends/requests/incoming') as any;
        setPendingRequests(data?.requests?.length ?? 0);
      } catch {}
    };

    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    const onFriendsChanged = () => fetchPending();
    window.addEventListener('chatr:friends-changed', onFriendsChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('chatr:friends-changed', onFriendsChanged);
    };
  }, [socket, connected]);

  // Listen to socket friend:update events directly for instant badge updates
  useEffect(() => {
    if (!socket) return;
    const fetchPending = async () => {
      const { socketFirst } = await import('@/lib/socketRPC');
      const data = await socketFirst(socket, 'friends:requests:incoming', {}, 'GET', '/api/friends/requests/incoming') as any;
      setPendingRequests(data?.requests?.length ?? 0);
    };
    socket.on('friend:update', fetchPending);
    return () => { socket.off('friend:update', fetchPending); };
  }, [socket]);

  const menuItems = [
    { name: 'CHATS',   href: '/app',          icon: 'fa-comments',   type: 'icon', badge: totalUnread },
    { name: 'FRIENDS', href: '/app/friends',  icon: 'fa-user-group', type: 'icon', badge: pendingRequests },
    { name: 'GROUPS',  href: '/app/groups',   icon: 'fa-users',      type: 'icon', badge: unreadGroups },
    { name: firstName,  href: '/app/profile', icon: profileImageUrl, type: 'image' },
  ];

  return (
    <div
      className={styles.bottomNav}
      style={{ backgroundColor: theme.headerBg, borderTop: `1px solid ${theme.border}` }}
    >
      {menuItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href));
        return (
          <Link key={item.name} href={item.href} className={styles.navLink}>
            {item.type === 'image' ? (
              <motion.img
                key={item.icon}
                src={item.icon}
                alt={item.name}
                animate={{ scale: isActive ? 1.1 : 1, opacity: isActive ? 1 : 0.8 }}
                transition={{ duration: 0.3 }}
                className={styles.navProfileImg}
                style={{
                  border: isActive ? `2px solid ${theme.activeText}` : `2px solid ${theme.menuText}`,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/profile/default-profile.jpg';
                }}
              />
            ) : (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <motion.i
                  className={`fad ${item.icon} ${styles.navIcon}`}
                  animate={{ scale: isActive ? 1.15 : 1, color: isActive ? theme.activeText : theme.menuText }}
                  transition={{ duration: 0.3 }}
                />
                {(item as any).badge > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    background: '#ef4444', color: '#fff',
                    borderRadius: '999px', fontSize: 9, fontWeight: 700,
                    minWidth: 14, height: 14, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                    lineHeight: 1,
                  }}>
                    {(item as any).badge > 99 ? '99+' : (item as any).badge}
                  </span>
                )}
              </div>
            )}
            <motion.span
              animate={{ color: isActive ? theme.activeText : theme.menuText }}
              transition={{ duration: 0.3 }}
              className={styles.navLabel}
            >
              {item.name}
            </motion.span>
          </Link>
        );
      })}
    </div>
  );
}

