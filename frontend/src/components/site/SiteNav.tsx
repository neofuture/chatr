'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import AuthPanel from '@/components/panels/AuthPanel/AuthPanel';
import s from './SiteNav.module.css';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/widget', label: 'Widget' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/technology', label: 'Technology' },
  { href: '/product', label: 'Full Overview' },
  { href: '/contact', label: 'Contact' },
];

interface User {
  id: string;
  username: string;
  displayName?: string | null;
  profileImage?: string | null;
}

export default function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authPanelView, setAuthPanelView] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
          setUser(JSON.parse(userData));
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    window.addEventListener('chatr:auth-changed', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('chatr:auth-changed', checkAuth);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleOpenAuth = (e: CustomEvent<{ view: 'login' | 'register' }>) => {
      setAuthPanelView(e.detail.view);
      setAuthPanelOpen(true);
    };
    window.addEventListener('chatr:open-auth', handleOpenAuth as EventListener);
    return () => window.removeEventListener('chatr:open-auth', handleOpenAuth as EventListener);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setDropdownOpen(false);
    router.push('/');
  };

  const openAuthPanel = (view: 'login' | 'register') => {
    setAuthPanelView(view);
    setAuthPanelOpen(true);
    setDropdownOpen(false);
    setOpen(false);
  };

  const hasProfileImage = !!user?.profileImage;

  return (
    <>
      <nav className={s.nav}>
        <div className={s.inner}>
          <Link href="/" className={s.logo}>
            <Image
              src="/images/logo-horizontal.png"
              alt="Chatr"
              width={120}
              height={40}
              className={s.logoImg}
              priority
            />
          </Link>

          <div className={s.links}>
            {LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`${s.link} ${pathname === l.href ? s.linkActive : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className={s.rightSection}>
            <div className={s.themeBtn}><ThemeToggle compact showLabel={false} /></div>

            <div className={s.avatarWrapper} ref={dropdownRef}>
              <button
                className={s.avatarBtn}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User menu"
              >
                {hasProfileImage ? (
                  <img
                    src={user.profileImage!}
                    alt={user?.displayName || user?.username || 'User'}
                    className={s.avatar}
                  />
                ) : (
                  <div className={s.avatarFallback}>
                    <i className="fas fa-user" />
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className={s.dropdown}>
                  {user ? (
                    <>
                      <div className={s.dropdownHeader}>
                        <span className={s.dropdownName}>{user.displayName || user.username}</span>
                      </div>
                      <Link href="/app" className={s.dropdownItem} onClick={() => setDropdownOpen(false)}>
                        <i className="fas fa-rocket" /> Go to App
                      </Link>
                      <button className={s.dropdownItem} onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt" /> Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button className={s.dropdownItem} onClick={() => openAuthPanel('login')}>
                        <i className="fas fa-sign-in-alt" /> Login
                      </button>
                      <button className={s.dropdownItem} onClick={() => openAuthPanel('register')}>
                        <i className="fas fa-user-plus" /> Register
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <button className={s.hamburger} onClick={() => setOpen(!open)}>
            <i className={`fas fa-${open ? 'times' : 'bars'}`} />
          </button>
        </div>
      </nav>

      {open && (
        <div className={s.mobileMenu}>
          {LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`${s.link} ${pathname === l.href ? s.linkActive : ''}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className={s.mobileAuthSection}>
            {user ? (
              <>
                <Link href="/app" className={s.mobileCta} onClick={() => setOpen(false)}>
                  <i className="fas fa-rocket" /> Go to App
                </Link>
                <button className={s.mobileLogout} onClick={() => { handleLogout(); setOpen(false); }}>
                  <i className="fas fa-sign-out-alt" /> Logout
                </button>
              </>
            ) : (
              <>
                <button className={s.mobileCta} onClick={() => openAuthPanel('login')}>
                  <i className="fas fa-sign-in-alt" /> Login
                </button>
                <button className={s.mobileRegister} onClick={() => openAuthPanel('register')}>
                  <i className="fas fa-user-plus" /> Register
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <AuthPanel
        isOpen={authPanelOpen}
        onClose={() => setAuthPanelOpen(false)}
        initialView={authPanelView}
      />
    </>
  );
}
