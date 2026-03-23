import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Features — 50+ Real-Time Messaging Features',
  description:
    'Seven message types, typing indicators, read receipts, voice notes, reactions, group chats, AI assistant, and an embeddable support widget. Every feature your messaging platform needs.',
  openGraph: {
    type: 'website',
    title: 'Features — 50+ Real-Time Messaging Features',
    description:
      'Seven message types, typing indicators, read receipts, voice notes, reactions, group chats, AI assistant, and an embeddable support widget. Every feature your messaging platform needs.',
    url: SITE_URL + '/features',
    images: [{ url: SITE_URL + '/screenshots/04-chat-view.png', width: 1440, height: 900, alt: 'Chatr Features — Real-Time Messaging' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Features — 50+ Real-Time Messaging Features',
    description:
      'Seven message types, typing indicators, read receipts, voice notes, reactions, group chats, AI assistant, and an embeddable support widget. Every feature your messaging platform needs.',
    images: [SITE_URL + '/screenshots/04-chat-view.png'],
  },
  alternates: { canonical: SITE_URL + '/features' },
};

const featuresJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Chatr Features',
  description: 'Seven message types, typing indicators, read receipts, voice notes, reactions, group chats, AI assistant, and an embeddable support widget.',
  url: SITE_URL + '/features',
  isPartOf: { '@type': 'WebSite', name: 'Chatr', url: SITE_URL },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(featuresJsonLd) }} />
      {children}
    </>
  );
}
