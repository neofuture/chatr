'use client';

import { useCallback } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { usePanels } from '@/contexts/PanelContext';
import UserProfilePanel from '@/components/UserProfilePanel/UserProfilePanel';

function getCurrentUserId(): string {
  if (typeof window === 'undefined') return '';
  try { return JSON.parse(localStorage.getItem('user') || '{}')?.id ?? ''; } catch { return ''; }
}

/**
 * Returns a stable callback that opens a stacked UserProfilePanel
 * when called with a userId. If it's the current user, navigates
 * to /app/profile instead.
 */
export function useOpenUserProfile() {
  const { openPanel } = usePanels();
  const router = useRouter();

  return useCallback((userId: string, displayName?: string, profileImage?: string | null) => {
    if (userId && userId === getCurrentUserId()) {
      router.push('/app/profile');
      return;
    }
    const img = profileImage ?? undefined;
    openPanel(
      `user-profile-${userId}`,
      React.createElement(UserProfilePanel, { userId }),
      displayName ?? 'Profile',
      'left',
      undefined,
      img,
      true
    );
  }, [openPanel, router]);
}

