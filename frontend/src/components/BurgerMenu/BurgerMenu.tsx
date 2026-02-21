'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
    router.push('/'); // Redirect to home page
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

  return (
    <>
      {/* Burger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          zIndex: 2000,
          position: 'relative'
        }}
      >
        <div style={{
          width: '24px',
          height: '16px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <span style={{
            width: '24px',
            height: '2px',
            backgroundColor: isOpen ? '#3b82f6' : (isDark ? '#ffffff' : '#0f172a'),
            position: 'absolute',
            transition: 'all 0.3s ease',
            transform: isOpen ? 'rotate(45deg)' : 'translateY(-6px)',
            top: '50%',
            left: 0
          }}></span>
          <span style={{
            width: '24px',
            height: '2px',
            backgroundColor: isOpen ? '#3b82f6' : (isDark ? '#ffffff' : '#0f172a'),
            position: 'absolute',
            transition: 'all 0.3s ease',
            opacity: isOpen ? 0 : 1,
            top: '50%',
            left: 0
          }}></span>
          <span style={{
            width: '24px',
            height: '2px',
            backgroundColor: isOpen ? '#3b82f6' : (isDark ? '#ffffff' : '#0f172a'),
            position: 'absolute',
            transition: 'all 0.3s ease',
            transform: isOpen ? 'rotate(-45deg)' : 'translateY(6px)',
            top: '50%',
            left: 0
          }}></span>
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 1998,
            animation: 'fadeIn 0.2s ease-out'
          }}
        />
      )}

      {/* Menu Panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: isOpen ? 0 : '-280px',
        height: '100vh',
        width: '280px',
        backgroundColor: bgColor,
        borderRight: `1px solid ${borderColor}`,
        transition: 'left 0.3s ease-out',
        zIndex: 1999,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isOpen ? '4px 0 12px rgba(0, 0, 0, 0.3)' : 'none'
      }}>
        {/* Menu Header */}
        <div style={{
          padding: '0.5rem 1rem',
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '56px'
        }}>
          {/* Centered Menu title */}
          <h3 style={{
            color: textColor,
            fontSize: '1rem',
            fontWeight: '600',
            margin: 0,
            lineHeight: '1.5'
          }}>Menu</h3>
        </div>

        {/* Menu Items */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {menuItems.map((item) => {
            if (item.isButton && onPanelDemo) {
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    onPanelDemo();
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    color: textColor,
                    textDecoration: 'none',
                    transition: 'background-color 0.2s',
                    cursor: 'pointer',
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className={`fad ${item.icon}`} style={{ fontSize: '20px', width: '20px' }}></i>
                  <span>{item.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px 20px',
                  color: textColor,
                  textDecoration: 'none',
                  transition: 'background-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <i className={`fad ${item.icon}`} style={{ fontSize: '20px', width: '20px' }}></i>
                <span style={{ fontSize: '16px', fontWeight: '500' }}>{item.name}</span>
              </Link>
            );
          })}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 20px',
              color: '#ef4444',
              textDecoration: 'none',
              transition: 'background-color 0.2s',
              cursor: 'pointer',
              width: '100%',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              fontFamily: 'inherit',
              fontSize: '16px',
              fontWeight: '500',
              marginTop: '8px',
              borderTop: `1px solid ${borderColor}`
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ fontSize: '20px' }}>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

