import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Features — 50+ Real-Time Messaging Features',
  description:
    'Seven message types, typing indicators, read receipts, voice notes, reactions, group chats, AI assistant, and an embeddable support widget. Every feature your messaging platform needs.',
  openGraph: {
    title: 'Features — 50+ Real-Time Messaging Features',
    description:
      'Seven message types, typing indicators, read receipts, voice notes, reactions, group chats, AI assistant, and an embeddable support widget. Every feature your messaging platform needs.',
    url: SITE_URL + '/features',
    images: [{ url: SITE_URL + '/screenshots/04-chat-view.png', width: 1200, height: 630 }],
  },
  twitter: {
    title: 'Features — 50+ Real-Time Messaging Features',
    description:
      'Seven message types, typing indicators, read receipts, voice notes, reactions, group chats, AI assistant, and an embeddable support widget. Every feature your messaging platform needs.',
    images: [SITE_URL + '/screenshots/04-chat-view.png'],
  },
  alternates: { canonical: SITE_URL + '/features' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
