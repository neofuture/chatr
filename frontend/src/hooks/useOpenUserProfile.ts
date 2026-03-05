'use client';

import { useCallback } from 'react';
import React from 'react';
import { usePanels } from '@/contexts/PanelContext';
import UserProfilePanel from '@/components/UserProfilePanel/UserProfilePanel';

/**
 * Returns a stable callback that opens a stacked UserProfilePanel
 * when called with a userId. Safe to use anywhere in the tree.
 */
export function useOpenUserProfile() {
  const { openPanel } = usePanels();

  return useCallback((userId: string, displayName?: string, profileImage?: string | null) => {
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
  }, [openPanel]);
}

