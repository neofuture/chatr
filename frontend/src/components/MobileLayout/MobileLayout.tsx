'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import BurgerMenu from '@/components/BurgerMenu/BurgerMenu';
import { getProfileImageURL } from '@/lib/profileImageService';
import type { User } from '@/types';

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
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? '#0f172a' : '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', color: isDark ? '#3b82f6' : '#0f172a' }}></i>
          <p style={{ marginTop: '20px', color: isDark ? '#93c5fd' : '#475569' }}>Loading...</p>
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
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: theme.bg
    }}>
      {/* Title Bar - Fixed at Top */}
      <div style={{
        backgroundColor: theme.headerBg,
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1rem',
        flexShrink: 0,
        position: 'relative',
        minHeight: '56px'
      }}>
        {/* Burger Menu on Left */}
        <div style={{ width: '40px', display: 'flex', alignItems: 'center' }}>
          <BurgerMenu isDark={isDark} onPanelDemo={onPanelDemo} />
        </div>

        {/* Centered Title */}
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none'
        }}>
          <AnimatePresence mode="wait">
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              style={{
                color: theme.text,
                fontSize: '1rem',
                fontWeight: '600',
                margin: 0,
                lineHeight: '1.5',
                whiteSpace: 'nowrap'
              }}
            >
              {title}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Right spacer for balance or Action Button */}
        <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <AnimatePresence>
            {headerAction && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                onClick={headerAction.onClick}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.text,
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className={headerAction.icon}></i>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>


      {/* Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        color: theme.contentText
      }}>
        {children}
      </div>

      {/* Bottom Menu - Fixed at Bottom */}
      <div style={{
        height: '80px',
        backgroundColor: theme.headerBg,
        borderTop: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 16px',
        flexShrink: 0,
        zIndex: 100
      }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
                cursor: 'pointer',
                padding: '8px',
                minWidth: '60px',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {item.type === 'image' ? (
                <motion.img
                  key={item.icon}
                  src={item.icon}
                  alt={item.name}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    opacity: isActive ? 1 : 0.8
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    border: isActive ? `2px solid ${theme.activeText}` : `2px solid ${theme.menuText}`,
                  }}
                />
              ) : (
                <motion.i
                  className={`fad ${item.icon}`}
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    color: isActive ? theme.activeText : theme.menuText
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    fontSize: '24px',
                    pointerEvents: 'none',
                  }}
                />
              )}
              <motion.span
                animate={{
                  color: isActive ? theme.activeText : theme.menuText
                }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  pointerEvents: 'none'
                }}
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
