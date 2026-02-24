'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { version } from '@/version';
import ProfileImageUploader from '@/components/image-manip/ProfileImageUploader/ProfileImageUploader';
import CoverImageUploader from '@/components/image-manip/CoverImageUploader/CoverImageUploader';
import WebSocketDemo from '@/components/WebSocketDemo/WebSocketDemo';

export default function SettingsPage() {
  const router = useRouter();
  const { theme: themeMode, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [userId, setUserId] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [showWebSocketDemo, setShowWebSocketDemo] = useState(false);

  const isDark = themeMode === 'dark';

  useEffect(() => {
    // Get user data and token from localStorage
    const storedToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (storedToken && storedToken !== 'undefined') {
      setToken(storedToken);
    }

    if (userData && userData !== 'undefined') {
      try {
        const user = JSON.parse(userData);
        setUserId(user.id || 'N/A');
      } catch (e) {
        console.error('Failed to parse user data:', e);
        setUserId('Invalid data');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/'); // Redirect to home page
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${label} copied to clipboard!`, 'success');
    }).catch(() => {
      showToast('Failed to copy to clipboard', 'error');
    });
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
      {/* Full-width Cover Image at top */}
      <div style={{ width: '100%', marginBottom: '2rem' }}>
        <CoverImageUploader userId={userId} isDark={isDark} />
      </div>

      {/* Centered content below */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '0 20px 20px 20px',
        gap: '2rem'
      }}>
        <div style={{ textAlign: 'center', marginTop: '-112px' }}>
          <ProfileImageUploader userId={userId} isDark={isDark} />
          <h2 style={{ fontSize: '24px', marginTop: '20px', marginBottom: '10px', color: 'inherit' }}>Settings</h2>
          <p style={{ fontSize: '16px', opacity: 0.7 }}>User preferences and account settings</p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%',
          maxWidth: '400px',
          padding: '1.5rem',
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.05)',
          borderRadius: '12px',
          border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(15, 23, 42, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                margin: 0,
                marginBottom: '4px',
                color: 'inherit'
              }}>
                Theme
              </h3>
              <p style={{
                fontSize: '14px',
                opacity: 0.7,
                margin: 0
              }}>
                {isDark ? 'Dark mode' : 'Light mode'}
              </p>
            </div>

            <button
              onClick={toggleTheme}
              style={{
                width: '50px',
                height: '28px',
                backgroundColor: isDark ? '#f97316' : '#3b82f6',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.3s',
                padding: '2px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                position: 'relative'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: isDark ? '24px' : '2px',
                transition: 'left 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}>
                <i className={`fad ${isDark ? 'fa-moon' : 'fa-sun'}`} style={{ color: isDark ? '#f97316' : '#3b82f6' }}></i>
              </div>
            </button>
          </div>
        </div>

        <div style={{
          width: '100%',
          maxWidth: '400px',
          padding: '1rem 1.5rem',
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.05)',
          borderRadius: '12px',
          border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(15, 23, 42, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '14px',
            opacity: 0.7,
            margin: 0,
            marginBottom: '4px'
          }}>
            App Version
          </p>
          <p style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: 0,
            color: isDark ? '#3b82f6' : '#1e293b'
          }}>
            {version}
          </p>
        </div>

        {/* User ID Section */}
        <div style={{
          width: '100%',
          maxWidth: '400px',
          padding: '1rem 1.5rem',
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.05)',
          borderRadius: '12px',
          border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(15, 23, 42, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <p style={{
              fontSize: '14px',
              opacity: 0.7,
              margin: 0
            }}>
              User ID
            </p>
            <button
              onClick={() => copyToClipboard(userId, 'User ID')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                color: isDark ? '#3b82f6' : '#1e293b',
                fontSize: '14px'
              }}
              title="Copy to clipboard"
            >
              <i className="fad fa-copy"></i>
            </button>
          </div>
          <p style={{
            fontSize: '16px',
            fontWeight: '500',
            margin: 0,
            color: isDark ? '#3b82f6' : '#1e293b',
            wordBreak: 'break-all',
            fontFamily: 'monospace'
          }}>
            {userId || 'Not available'}
          </p>
        </div>

        {/* Token Section */}
        <div style={{
          width: '100%',
          maxWidth: '400px',
          padding: '1rem 1.5rem',
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.05)',
          borderRadius: '12px',
          border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(15, 23, 42, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <p style={{
              fontSize: '14px',
              opacity: 0.7,
              margin: 0
            }}>
              Access Token
            </p>
            <button
              onClick={() => copyToClipboard(token, 'Token')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                color: isDark ? '#3b82f6' : '#1e293b',
                fontSize: '14px'
              }}
              title="Copy to clipboard"
            >
              <i className="fad fa-copy"></i>
            </button>
          </div>
          <p style={{
            fontSize: '12px',
            fontWeight: '500',
            margin: 0,
            color: isDark ? '#3b82f6' : '#1e293b',
            wordBreak: 'break-all',
            fontFamily: 'monospace',
            maxHeight: '80px',
            overflow: 'auto'
          }}>
            {token ? `${token.substring(0, 50)}...` : 'Not available'}
          </p>
        </div>

        {/* WebSocket Demo Button */}
        <div style={{
          width: '100%',
          maxWidth: '400px',
          padding: '1rem 1.5rem',
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'white',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                margin: '0 0 4px 0'
              }}>
                WebSocket Demo
              </h3>
              <p style={{
                fontSize: '14px',
                opacity: 0.7,
                margin: 0
              }}>
                Test real-time messaging
              </p>
            </div>

            <button
              onClick={() => setShowWebSocketDemo(!showWebSocketDemo)}
              style={{
                padding: '8px 16px',
                backgroundColor: showWebSocketDemo ? '#10b981' : '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {showWebSocketDemo ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {showWebSocketDemo && <WebSocketDemo />}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            padding: '12px 32px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
