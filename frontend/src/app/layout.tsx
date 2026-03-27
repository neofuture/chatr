import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import * as versionModule from '@/version';
import ClientProviders from '@/components/ClientProviders';
import BackToTop from '@/components/BackToTop/BackToTop';

const inter = Inter({ subsets: ['latin'] });

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.chatr-app.online';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: PRODUCT_NAME,
    template: `%s | ${PRODUCT_NAME}`,
  },
  description: 'Chatr — Real-time messaging app',
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: PRODUCT_NAME,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
            __html: `(function(){try{const APP_VERSION='${versionModule.version}';const APP_VERSION_KEY='chatr-app-version';const storedVersion=localStorage.getItem(APP_VERSION_KEY);if(storedVersion&&storedVersion!==APP_VERSION){console.log('[Version] Updating from',storedVersion,'to',APP_VERSION);if('caches' in window){caches.keys().then(function(names){return Promise.all(names.map(function(name){return caches.delete(name);}));}).then(function(){localStorage.setItem(APP_VERSION_KEY,APP_VERSION);window.location.reload();});}else{localStorage.setItem(APP_VERSION_KEY,APP_VERSION);window.location.reload();}}else if(!storedVersion){console.log('[Version] Initializing version',APP_VERSION);localStorage.setItem(APP_VERSION_KEY,APP_VERSION);}}catch(e){console.error('[Version] Error:',e);}})();`,
          }}
        />
        <link rel="stylesheet" href="/assets/font-awesome/css/all.min.css" />
        <link rel="icon" type="image/x-icon" href="/favicon/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </head>
      <body className={inter.className}>
        <noscript>
          <div style={{ padding: '2rem', textAlign: 'center', background: '#1e293b', color: '#f1f5f9' }}>
            Chatr requires JavaScript to run. Please enable JavaScript in your browser settings.
          </div>
        </noscript>
        <ClientProviders>
          {children}
          <BackToTop />
        </ClientProviders>
      </body>
    </html>
  );
}
