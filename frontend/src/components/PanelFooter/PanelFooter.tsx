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
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      }}
    >
      {children}
    </div>
  );
}

