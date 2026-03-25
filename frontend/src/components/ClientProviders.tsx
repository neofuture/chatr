'use client';

import { useEffect, type ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LogProvider } from '@/contexts/LogContext';
import { UserSettingsProvider } from '@/contexts/UserSettingsContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { ConfirmationProvider } from '@/contexts/ConfirmationContext';
import { FriendsProvider } from '@/contexts/FriendsContext';
import { CallProvider } from '@/contexts/CallContext';
import PanelContainer from '@/components/panels/PanelContainer/PanelContainer';
import ToastContainer from '@/components/ToastContainer/ToastContainer';
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog/ConfirmationDialog';
import CallOverlay from '@/components/CallOverlay/CallOverlay';
import RoutePreloader from '@/components/RoutePreloader';

const TRANSIENT_PATTERNS = [
  'Load failed',
  'Failed to fetch',
  'NetworkError',
  'The operation was aborted',
  'ERR_CONNECTION_REFUSED',
  'ECONNRESET',
  'AbortError',
  'fetch failed',
];

function matchesTransient(text: string): boolean {
  return TRANSIENT_PATTERNS.some(p => text.includes(p));
}

function isTransientNetworkError(...args: unknown[]): boolean {
  const msg = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ');
  return matchesTransient(msg);
}

export default function ClientProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    if (isChrome) {
      
      document.documentElement.classList.add('is-chrome');var s=document.createElement('style');s.textContent='html.is-chrome *,html.is-chrome *::before,html.is-chrome *::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}';document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const origError = console.error;
    console.error = (...args: unknown[]) => {
      if (isTransientNetworkError(...args)) return;
      origError.apply(console, args);
    };

    const onError = (e: ErrorEvent) => {
      if (e.message && matchesTransient(e.message)) e.preventDefault();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason ?? '');
      if (matchesTransient(msg)) e.preventDefault();
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      console.error = origError;
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
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
              <CallProvider>
                <RoutePreloader />
                {children}
                <PanelContainer />
                <ToastContainer />
                <ConfirmationDialog />
                <CallOverlay />
              </CallProvider>
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
