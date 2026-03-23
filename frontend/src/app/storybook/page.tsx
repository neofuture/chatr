'use client';

import { useEffect } from 'react';

const STORYBOOK_URL =
  process.env.NODE_ENV === 'production'
    ? '/storybook/index.html'
    : 'http://localhost:6006';

export default function StorybookRedirect() {
  useEffect(() => {
    window.location.href = STORYBOOK_URL;
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
    }}>
      Redirecting to Storybook…
    </div>
  );
}
