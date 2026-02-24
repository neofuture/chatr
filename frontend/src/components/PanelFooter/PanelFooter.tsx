'use client';

import { useTheme } from '@/contexts/ThemeContext';

interface PanelFooterProps {
  children?: React.ReactNode;
}

export default function PanelFooter({ children }: PanelFooterProps) {
  const { theme: themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <div
      style={{
        height: '80px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 16px',
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
        borderTop: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.2)'}`,
      }}
    >
      {children}
    </div>
  );
}

