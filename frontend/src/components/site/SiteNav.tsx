'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import AuthPanel from '@/components/panels/AuthPanel/AuthPanel';
import BackgroundBlobs from '@/components/BackgroundBlobs/BackgroundBlobs';
import s from './SiteNav.module.css';
import { getApiBase } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/imageUrl';

const API = getApiBase();

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/widget', label: 'Widget' },
  { href: '/pricing', label: 'Pricing & Support' },
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

  const [liveProfileImage, setLiveProfileImage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLiveProfileImage(null); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    let cancelled = false;
    fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.status === 401 || r.status === 403) {
          if (!cancelled) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setLiveProfileImage(null);
          }
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        if (cancelled || !data) return;
        const img = data.profileImage;
        if (img) setLiveProfileImage(resolveAssetUrl(img) || img);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const hasProfileImage = !!liveProfileImage;
  const avatarSrc = liveProfileImage || '';

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dropdownOpen) setDropdownOpen(false);
        if (open) setOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [dropdownOpen, open]);

  return (
    <>
      <BackgroundBlobs />
      <a href="#main-content" className={s.skipLink}>Skip to content</a>
      <nav className={s.nav} aria-label="Main navigation">
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
                aria-current={pathname === l.href ? 'page' : undefined}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className={s.rightSection}>
            <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.githubLink} aria-label="GitHub">
              <i className="fab fa-github" aria-hidden="true" />
            </a>
            <div className={s.themeBtn}><ThemeToggle compact showLabel={false} /></div>

            <div className={s.avatarWrapper} ref={dropdownRef}>
              <button
                className={s.avatarBtn}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User menu"
                aria-expanded={dropdownOpen}
              >
                {hasProfileImage ? (
                  <img
                    src={avatarSrc}
                    alt={user?.displayName || user?.username || 'User'}
                    className={s.avatar}
                  />
                ) : (
                  <div className={s.avatarFallback}>
                    <i className="fas fa-user" aria-hidden="true" />
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className={s.dropdown} role="menu">
                  {user ? (
                    <>
                      <div className={s.dropdownHeader}>
                        <span className={s.dropdownName}>{user.displayName || user.username}</span>
                      </div>
                      <Link href="/app" className={s.dropdownItem} role="menuitem" onClick={() => setDropdownOpen(false)}>
                        <i className="fas fa-rocket" aria-hidden="true" /> Go to App
                      </Link>
                      <button className={s.dropdownItem} role="menuitem" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt" aria-hidden="true" /> Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <button className={s.dropdownItem} role="menuitem" onClick={() => openAuthPanel('login')}>
                        <i className="fas fa-sign-in-alt" aria-hidden="true" /> Login
                      </button>
                      <button className={s.dropdownItem} role="menuitem" onClick={() => openAuthPanel('register')}>
                        <i className="fas fa-user-plus" aria-hidden="true" /> Register
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <button className={s.hamburger} onClick={() => setOpen(!open)} aria-label="Toggle navigation menu" aria-expanded={open}>
            <i className={`fas fa-${open ? 'times' : 'bars'}`} aria-hidden="true" />
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
              aria-current={pathname === l.href ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className={s.mobileAuthSection}>
            {user ? (
              <>
                <Link href="/app" className={s.mobileCta} onClick={() => setOpen(false)}>
                  <i className="fas fa-rocket" aria-hidden="true" /> Go to App
                </Link>
                <button className={s.mobileLogout} onClick={() => { handleLogout(); setOpen(false); }}>
                  <i className="fas fa-sign-out-alt" aria-hidden="true" /> Logout
                </button>
              </>
            ) : (
              <>
                <button className={s.mobileCta} onClick={() => openAuthPanel('login')}>
                  <i className="fas fa-sign-in-alt" aria-hidden="true" /> Login
                </button>
                <button className={s.mobileRegister} onClick={() => openAuthPanel('register')}>
                  <i className="fas fa-user-plus" aria-hidden="true" /> Register
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
