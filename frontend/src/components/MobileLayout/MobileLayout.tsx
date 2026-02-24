'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import BurgerMenu from '@/components/BurgerMenu/BurgerMenu';
import BottomNav from '@/components/BottomNav/BottomNav';
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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
  };

  return (
    <div className={styles.root} style={{ backgroundColor: theme.bg, overflow: 'hidden' }}>
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
      <div className={styles.content} style={{ color: theme.contentText }}>
        {children}
      </div>

      {/* Bottom Menu */}
      <BottomNav />
    </div>
  );
}
