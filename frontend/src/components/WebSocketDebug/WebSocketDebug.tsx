'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './WebSocketDebug.module.css';

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
    <div className={styles.container}>
      <h3 className={styles.title}>🔧 WebSocket Debug</h3>
      <p className={styles.description}>
        Check browser console (F12) for authentication details
      </p>
      <button onClick={handleClearAndLogout} className={styles.logoutBtn}>
        Clear Storage &amp; Logout
      </button>
      <p className={styles.footer}>
        This will clear all localStorage data and redirect to login.
      </p>
    </div>
  );
}
