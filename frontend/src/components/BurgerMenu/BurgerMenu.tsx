'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './BurgerMenu.module.css';

interface BurgerMenuProps {
  isDark: boolean;
  onPanelDemo?: () => void;
}

export default function BurgerMenu({ isDark, onPanelDemo }: BurgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const menuItems = [
    { name: 'Home', href: '/', icon: 'fa-home', isButton: false },
    { name: 'Demo Components', href: '/demo', icon: 'fa-palette', isButton: false },
    { name: 'Panel Demo', href: '#', icon: 'fa-mobile-alt', isButton: true },
    { name: 'Read Documentation', href: '/docs', icon: 'fa-book', isButton: false },
    { name: 'Database Console', href: '/console', icon: 'fa-database', isButton: false },
  ];

  const bgColor = isDark ? '#1e293b' : '#f8fafc';
  const textColor = isDark ? '#93c5fd' : '#475569';
  const borderColor = isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.2)';
  const hoverBg = isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.05)';
  const barColor = isOpen ? '#3b82f6' : (isDark ? '#ffffff' : '#0f172a');

  return (
    <>
      {/* Burger Button */}
      <button className={styles.burgerBtn} onClick={() => setIsOpen(!isOpen)}>
        <div className={styles.burgerIcon}>
          <span
            className={`${styles.bar} ${isOpen ? styles.barTopOpen : styles.barTop}`}
            style={{ backgroundColor: barColor }}
          />
          <span
            className={`${styles.bar} ${isOpen ? styles.barMidOpen : styles.barMid}`}
            style={{ backgroundColor: barColor }}
          />
          <span
            className={`${styles.bar} ${isOpen ? styles.barBottomOpen : styles.barBottom}`}
            style={{ backgroundColor: barColor }}
          />
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
      )}

      {/* Menu Panel */}
      <div
        data-testid="burger-drawer"
        className={`${styles.panel} ${isOpen ? styles.panelOpen : styles.panelClosed}`}
        style={{ backgroundColor: bgColor, borderRight: `1px solid ${borderColor}`, left: isOpen ? '0px' : '-280px' }}
      >
        {/* Menu Header */}
        <div className={styles.panelHeader} style={{ borderBottom: `1px solid ${borderColor}` }}>
          <h3 className={styles.panelTitle} style={{ color: textColor }}>Menu</h3>
        </div>

        {/* Menu Items */}
        <div className={styles.panelBody}>
          {menuItems.map((item) => {
            if (item.isButton && onPanelDemo) {
              return (
                <button
                  key={item.name}
                  onClick={() => { onPanelDemo(); setIsOpen(false); }}
                  className={styles.menuItem}
                  style={{ color: textColor }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className={`fad ${item.icon} ${styles.menuItemIcon}`}></i>
                  <span>{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={styles.menuItem}
                style={{ color: textColor }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <i className={`fad ${item.icon} ${styles.menuItemIcon}`}></i>
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={styles.logoutBtn}
            style={{ borderTop: `1px solid ${borderColor}` }}
          >
            <i className={`fad fa-sign-out-alt ${styles.logoutIcon}`}></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
