'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getProfileImageURL } from '@/lib/profileImageService';
import type { User } from '@/types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImageUrl, setProfileImageUrl] = useState('/profile/default-profile.jpg');

  // Check authentication first
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      console.log('[AppLayout] Auth check:', {
        hasToken: !!token,
        hasUserData: !!userData,
        userDataValue: userData
      });

      if (!token || !userData || userData === 'undefined' || token === 'undefined') {
        console.log('[AppLayout] No valid auth found, redirecting to home');
        router.push('/');
        return;
      }

      try {
        const parsedUser = JSON.parse(userData);
        console.log('[AppLayout] Auth successful:', parsedUser.username);
        setUser(parsedUser);
      } catch (e) {
        console.error('[AppLayout] Failed to parse user data:', e);
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
          console.log('[AppLayout] Loaded profile image:', url);
          if (url) {
            // Add timestamp to force cache refresh
            const timestamp = new Date().getTime();
            const urlWithTimestamp = url.includes('?') ? `${url}&t=${timestamp}` : `${url}?t=${timestamp}`;
            setProfileImageUrl(urlWithTimestamp);
          }
        } catch (error) {
          console.error('[AppLayout] Failed to load profile image:', error);
        }
      }
    };

    // Load initially
    loadProfileImage();

    // Listen for profile image updates
    const handleProfileImageUpdate = (event: Event) => {
      console.log('[AppLayout] Profile image update event received');
      loadProfileImage();
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);

    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
  }, [user?.id]);

  // Show loading while checking auth
  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-5xl text-blue-500"></i>
          <p className="mt-4 text-blue-300">Loading...</p>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: 'Chats', href: '/app', icon: 'fa-comments', type: 'icon' },
    { name: 'Groups', href: '/app/groups', icon: 'fa-users', type: 'icon' },
    { name: 'Updates', href: '/app/updates', icon: 'fa-newspaper', type: 'icon' },
    { name: 'Test', href: '/app/test', icon: 'fa-flask', type: 'icon' },
    { name: 'User', href: '/app/settings', icon: profileImageUrl, type: 'image' },
  ];

  const activeTitle = (() => {
    if (pathname === '/app') return 'Chats';
    if (pathname === '/app/groups') return 'Groups';
    if (pathname === '/app/updates') return 'Updates';
    if (pathname === '/app/test') return 'Test Lab';
    if (pathname === '/app/settings') return 'User';
    return 'App';
  })();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-blue-300 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-slate-900">
      {/* Fixed Top Header */}
      <div className="flex-none h-16 bg-slate-800 border-b border-blue-500/20 px-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{activeTitle}</h1>
        <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-700/50 transition-colors text-blue-300">
          <span className="text-2xl">☰</span>
        </button>
      </div>

      {/* Content — flex-1 so it fills between header and nav, overflow-hidden so children can manage their own scroll */}
      <div className="flex-1 overflow-hidden min-h-0">
        {children}
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="flex-none h-20 bg-slate-800 border-t border-blue-500/20">
        <div className="h-full flex items-center justify-around px-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all flex-1 max-w-[90px] ${
                  isActive
                    ? 'text-orange-400 bg-orange-500/10'
                    : 'text-blue-300 hover:text-white hover:bg-slate-700/30'
                }`}
              >
                {item.type === 'image' ? (
                  <img
                    key={item.icon}
                    src={item.icon}
                    alt={item.name}
                    className="w-7 h-7 rounded-full object-cover"
                    style={{
                      border: isActive ? '2px solid #fb923c' : '2px solid #93c5fd',
                      opacity: isActive ? 1 : 0.8
                    }}
                  />
                ) : (
                  <i className={`fad ${item.icon} text-2xl`}></i>
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wider">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

