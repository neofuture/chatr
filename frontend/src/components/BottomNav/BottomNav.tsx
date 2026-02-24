'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { getProfileImageURL } from '@/lib/profileImageService';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const { theme: themeMode } = useTheme();
  const pathname = usePathname();
  const [profileImageUrl, setProfileImageUrl] = useState('/profile/default-profile.jpg');

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
          if (url) setProfileImageUrl(url);
        }
      } catch {}
    };

    loadProfileImage();

    const handler = () => loadProfileImage();
    window.addEventListener('profileImageUpdated', handler);
    return () => window.removeEventListener('profileImageUpdated', handler);
  }, []);

  const menuItems = [
    { name: 'CHATS',   href: '/app',          icon: 'fa-comments',   type: 'icon' },
    { name: 'GROUPS',  href: '/app/groups',   icon: 'fa-users',      type: 'icon' },
    { name: 'UPDATES', href: '/app/updates',  icon: 'fa-newspaper',  type: 'icon' },
    { name: 'TEST',    href: '/app/test',      icon: 'fa-flask',      type: 'icon' },
    { name: 'USER',    href: '/app/settings', icon: profileImageUrl, type: 'image' },
  ];

  return (
    <div
      className={styles.bottomNav}
      style={{ backgroundColor: theme.headerBg, borderTop: `1px solid ${theme.border}` }}
    >
      {menuItems.map((item) => {
        const isActive = pathname === item.href;
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
              />
            ) : (
              <motion.i
                className={`fad ${item.icon} ${styles.navIcon}`}
                animate={{ scale: isActive ? 1.15 : 1, color: isActive ? theme.activeText : theme.menuText }}
                transition={{ duration: 0.3 }}
              />
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

