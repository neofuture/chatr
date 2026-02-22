import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PanelProvider } from '@/contexts/PanelContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmationProvider } from '@/contexts/ConfirmationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import PanelContainer from '@/components/panels/PanelContainer/PanelContainer';
import ToastContainer from '@/components/ToastContainer/ToastContainer';
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog/ConfirmationDialog';
import RoutePreloader from '@/components/RoutePreloader';
import * as versionModule from '@/version';

const inter = Inter({ subsets: ['latin'] });

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} - Real-time Chat Application`,
  description: 'Connect and chat in real-time with friends and groups',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: PRODUCT_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{const APP_VERSION='${versionModule.version}';const APP_VERSION_KEY='chatrr-app-version';const storedVersion=localStorage.getItem(APP_VERSION_KEY);if(storedVersion&&storedVersion!==APP_VERSION){console.log('[Version] Updating from',storedVersion,'to',APP_VERSION);if('caches' in window){caches.keys().then(function(names){return Promise.all(names.map(function(name){return caches.delete(name);}));}).then(function(){localStorage.setItem(APP_VERSION_KEY,APP_VERSION);window.location.reload();});}else{localStorage.setItem(APP_VERSION_KEY,APP_VERSION);window.location.reload();}}else if(!storedVersion){console.log('[Version] Initializing version',APP_VERSION);localStorage.setItem(APP_VERSION_KEY,APP_VERSION);}}catch(e){console.error('[Version] Error:',e);}})();`,
          }}
        />
        {/* Preload critical app routes */}
        <link rel="prefetch" href="/app" />
        <link rel="prefetch" href="/app/groups" />
        <link rel="prefetch" href="/app/updates" />
        <link rel="prefetch" href="/app/settings" />
        <link rel="stylesheet" href="/assets/font-awesome/css/all.min.css" />
        <link rel="icon" type="image/x-icon" href="/favicon/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </head>
      <body className={inter.className}>
        <RoutePreloader />
        <ThemeProvider>
          <WebSocketProvider>
            <ToastProvider>
              <PanelProvider>
                <ConfirmationProvider>
                  {children}
                  <PanelContainer />
                  <ToastContainer />
                  <ConfirmationDialog />
                </ConfirmationProvider>
              </PanelProvider>
            </ToastProvider>
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
