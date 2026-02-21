'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WebSocketDebug() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      console.log('\n🔍 WebSocket Authentication Debug\n');

      // Check token
      const token = localStorage.getItem('token');
      console.log('1. Token:', token ? `✅ Exists (${token.substring(0, 30)}...)` : '❌ Not found');

      // Check user data
      const userData = localStorage.getItem('user');
      console.log('2. User data:', userData ? '✅ Exists' : '❌ Not found');

      if (userData && userData !== 'undefined') {
        try {
          const user = JSON.parse(userData);
          console.log('3. User object:', {
            id: user.id || '❌ Missing',
            username: user.username || '❌ Missing',
            email: user.email || '❌ Missing',
          });

          if (!user.id) {
            console.log('\n❌ PROBLEM: User has no ID');
            console.log('   This will cause "User not found" error');
          }
        } catch (e) {
          const error = e as Error;
          console.log('3. User parsing: ❌ Failed -', error.message);
        }
      }

      console.log('\n💡 To fix authentication issues:');
      console.log('   1. Click the button below to logout');
      console.log('   2. Login again with valid credentials');
      console.log('   3. WebSocket should connect automatically\n');
    };

    checkAuth();
  }, []);

  const handleClearAndLogout = () => {
    console.log('🧹 Clearing localStorage and logging out...');
    localStorage.clear();
    router.push('/');
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      zIndex: 10000,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '20px',
      borderRadius: '12px',
      maxWidth: '400px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>🔧 WebSocket Debug</h3>
      <p style={{ margin: '0 0 15px 0', fontSize: '14px', opacity: 0.9 }}>
        Check browser console (F12) for authentication details
      </p>
      <button
        onClick={handleClearAndLogout}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Clear Storage & Logout
      </button>
      <p style={{
        margin: '15px 0 0 0',
        fontSize: '12px',
        opacity: 0.7,
        borderTop: '1px solid rgba(255,255,255,0.2)',
        paddingTop: '15px'
      }}>
        This will clear all localStorage data and redirect to login.
      </p>
    </div>
  );
}

