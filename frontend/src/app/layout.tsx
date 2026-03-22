import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import * as versionModule from '@/version';
import ClientProviders from '@/components/ClientProviders';
import BackToTop from '@/components/BackToTop/BackToTop';

const inter = Inter({ subsets: ['latin'] });

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${PRODUCT_NAME} — Real-Time Messaging Platform`,
    template: `%s | ${PRODUCT_NAME}`,
  },
  description: 'A free, open source real-time messaging platform with voice notes, video, file sharing, AI assistant, typing indicators, read receipts, and an embeddable support widget. 50+ features, 2,700+ tests, MIT-licensed.',
  keywords: [
    'real-time chat', 'messaging platform', 'live chat widget', 'customer support chat',
    'embeddable chat', 'WebSocket messaging', 'AI chatbot', 'typing indicators',
    'read receipts', 'voice messages', 'group chat', 'white-label chat',
    'Intercom alternative', 'open source chat', 'Next.js chat', 'React messaging',
    'Node.js chat', 'PostgreSQL chat', 'Redis real-time', 'Socket.IO',
  ],
  authors: [{ name: 'Carl Fearby', url: SITE_URL }],
  creator: 'Carl Fearby',
  publisher: PRODUCT_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: SITE_URL,
    siteName: PRODUCT_NAME,
    title: `${PRODUCT_NAME} — Real-Time Messaging Platform`,
    description: 'A free, open source messaging platform with 50+ features: voice notes, video, AI chatbot, embeddable widget, and enterprise security. MIT-licensed, fully tested.',
    images: [{ url: '/screenshots/10-dashboard-top.png', width: 1440, height: 900, alt: `${PRODUCT_NAME} — Real-Time Messaging Platform` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PRODUCT_NAME} — Real-Time Messaging Platform`,
    description: 'A free, open source messaging platform with 50+ features: voice notes, video, AI chatbot, embeddable widget, and enterprise security. MIT-licensed.',
    images: ['/screenshots/10-dashboard-top.png'],
  },
  alternates: { canonical: SITE_URL },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: PRODUCT_NAME,
  },
  formatDetection: { telephone: false },
  category: 'technology',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: PRODUCT_NAME,
    applicationCategory: 'CommunicationApplication',
    operatingSystem: 'Web',
    description: 'A free, open source real-time messaging platform with voice notes, video, file sharing, AI assistant, typing indicators, read receipts, and an embeddable support widget. MIT-licensed.',
    url: SITE_URL,
    author: { '@type': 'Person', name: 'Carl Fearby' },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP', availability: 'https://schema.org/InStock' },
    featureList: 'Real-time messaging, Voice notes, Video sharing, File sharing, AI chatbot, Embeddable widget, Typing indicators, Read receipts, Group chats, Dark/Light themes',
    screenshot: `${SITE_URL}/screenshots/01-landing-page.png`,
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '5', bestRating: '5', ratingCount: '1' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: PRODUCT_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo-horizontal.png`,
    contactPoint: { '@type': 'ContactPoint', contactType: 'technical support', url: `${SITE_URL}/contact` },
    sameAs: ['https://github.com/neofuture/chatr'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: PRODUCT_NAME,
    url: SITE_URL,
    description: 'A free, open source real-time messaging platform with 50+ features, 2,700+ automated tests. MIT-licensed.',
    publisher: { '@type': 'Organization', name: PRODUCT_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/logo-horizontal.png` } },
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {jsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{const APP_VERSION='${versionModule.version}';const APP_VERSION_KEY='chatrr-app-version';const storedVersion=localStorage.getItem(APP_VERSION_KEY);if(storedVersion&&storedVersion!==APP_VERSION){console.log('[Version] Updating from',storedVersion,'to',APP_VERSION);if('caches' in window){caches.keys().then(function(names){return Promise.all(names.map(function(name){return caches.delete(name);}));}).then(function(){localStorage.setItem(APP_VERSION_KEY,APP_VERSION);window.location.reload();});}else{localStorage.setItem(APP_VERSION_KEY,APP_VERSION);window.location.reload();}}else if(!storedVersion){console.log('[Version] Initializing version',APP_VERSION);localStorage.setItem(APP_VERSION_KEY,APP_VERSION);}}catch(e){console.error('[Version] Error:',e);}})();`,
          }}
        />
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
        <ClientProviders>
          {children}
          <BackToTop />
        </ClientProviders>
      </body>
    </html>
  );
}
