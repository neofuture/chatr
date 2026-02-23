'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import BurgerMenu from '@/components/BurgerMenu/BurgerMenu';
import { getProfileImageURL } from '@/lib/profileImageService';
import type { User } from '@/types';
import styles from './MobileLayout.module.css';

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  onPanelDemo?: () => void;
  headerAction?: {
    icon: string;
    onClick: () => void;
  };
}

export default function MobileLayout({ children, title, onPanelDemo, headerAction }: MobileLayoutProps) {
  const { theme: themeMode } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImageUrl, setProfileImageUrl] = useState('/profile/default-profile.jpg');

  const isDark = themeMode === 'dark';

  // Check authentication
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      console.log('[MobileLayout] Auth check:', {
        hasToken: !!token,
        hasUserData: !!userData,
        userDataValue: userData
      });

      if (!token || !userData || userData === 'undefined' || token === 'undefined') {
        console.log('[MobileLayout] No valid auth found, redirecting to home');
        router.push('/');
        return;
      }

      try {
        const parsedUser = JSON.parse(userData);
        console.log('[MobileLayout] Auth successful:', parsedUser.username);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        console.error('[MobileLayout] Failed to parse user data:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // Load profile image and set up listener
  useEffect(() => {
    const loadProfileImage = async () => {
      if (user?.id) {
        try {
          const url = await getProfileImageURL(user.id);
          console.log('[MobileLayout] Loaded profile image:', url);
          if (url) {
            // Add timestamp to force cache refresh
            const timestamp = new Date().getTime();
            const urlWithTimestamp = url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
            setProfileImageUrl(urlWithTimestamp);
          }
        } catch (error) {
          console.error('[MobileLayout] Failed to load profile image:', error);
        }
      }
    };

    // Load initially
    loadProfileImage();

    // Listen for profile image updates
    const handleProfileImageUpdate = (event: Event) => {
      console.log('[MobileLayout] Profile image update event received');
      loadProfileImage();
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);

    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
  }, [user?.id]);

  // Show loading screen while checking auth
  if (isLoading || (!isAuthenticated && !user)) {
    return (
      <div
        className={styles.loadingScreen}
        style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff' }}
      >
        <div className={styles.loadingContent}>
          <i
            className={`fas fa-spinner fa-spin ${styles.loadingIcon}`}
            style={{ color: isDark ? '#3b82f6' : '#0f172a' }}
          />
          <p
            className={styles.loadingText}
            style={{ color: isDark ? '#93c5fd' : '#475569' }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const theme = {
    bg: isDark ? '#0f172a' : '#ffffff',
    headerBg: isDark ? '#1e293b' : '#f8fafc',
    border: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.2)',
    text: isDark ? 'white' : '#0f172a',
    contentText: isDark ? '#93c5fd' : '#475569',
    menuText: isDark ? '#93c5fd' : '#64748b',
    activeText: '#f97316'
  };


  const menuItems = [
    { name: 'CHATS', href: '/app', icon: 'fa-comments', type: 'icon' },
    { name: 'GROUPS', href: '/app/groups', icon: 'fa-users', type: 'icon' },
    { name: 'UPDATES', href: '/app/updates', icon: 'fa-newspaper', type: 'icon' },
    { name: 'TEST', href: '/app/test', icon: 'fa-flask', type: 'icon' },
    { name: 'USER', href: '/app/settings', icon: profileImageUrl, type: 'image' },
  ];

  return (
    <div className={styles.root} style={{ backgroundColor: theme.bg }}>
      {/* Title Bar - Fixed at Top */}
      <div
        className={styles.header}
        style={{ backgroundColor: theme.headerBg, borderBottom: `1px solid ${theme.border}` }}
      >
        {/* Burger Menu on Left */}
        <div className={styles.headerLeft}>
          <BurgerMenu isDark={isDark} onPanelDemo={onPanelDemo} />
        </div>

        {/* Centered Title */}
        <div className={styles.headerCenter}>
          <AnimatePresence mode="wait">
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className={styles.headerTitle}
              style={{ color: theme.text }}
            >
              {title}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Right spacer / Action Button */}
        <div className={styles.headerRight}>
          <AnimatePresence>
            {headerAction && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                onClick={headerAction.onClick}
                className={styles.headerActionBtn}
                style={{ color: theme.text }}
              >
                <i className={headerAction.icon}></i>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content Area */}
      <div className={styles.content} style={{ color: theme.contentText, overflowY: 'auto' }}>
        {children}
      </div>

      {/* Bottom Menu - Fixed at Bottom */}
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
    </div>
  );
}
