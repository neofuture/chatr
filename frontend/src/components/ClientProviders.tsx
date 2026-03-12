'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LogProvider } from '@/contexts/LogContext';
import { UserSettingsProvider } from '@/contexts/UserSettingsContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { ConfirmationProvider } from '@/contexts/ConfirmationContext';
import { FriendsProvider } from '@/contexts/FriendsContext';
import PanelContainer from '@/components/panels/PanelContainer/PanelContainer';
import ToastContainer from '@/components/ToastContainer/ToastContainer';
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog/ConfirmationDialog';
import RoutePreloader from '@/components/RoutePreloader';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LogProvider>
      <UserSettingsProvider>
      <WebSocketProvider>
        <PresenceProvider>
        <ToastProvider>
          <PanelProvider>
            <ConfirmationProvider>
              <FriendsProvider>
                <RoutePreloader />
                {children}
                <PanelContainer />
                <ToastContainer />
                <ConfirmationDialog />
              </FriendsProvider>
            </ConfirmationProvider>
          </PanelProvider>
        </ToastProvider>
        </PresenceProvider>
      </WebSocketProvider>
      </UserSettingsProvider>
      </LogProvider>
    </ThemeProvider>
  );
}
