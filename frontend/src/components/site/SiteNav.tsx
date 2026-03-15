'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import s from './SiteNav.module.css';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/widget', label: 'Widget' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/technology', label: 'Technology' },
  { href: '/product', label: 'Full Overview' },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

          <div className={s.themeBtn}><ThemeToggle /></div>

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
        </div>
      )}
    </>
  );
}
