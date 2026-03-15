import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Support Widget — Embeddable Live Chat',
  description:
    'Add live customer support to any website with one line of JavaScript. White-label, zero-friction, replaces Intercom at £0/seat. Full customisation with the Palette Designer.',
  openGraph: {
    title: 'Support Widget — Embeddable Live Chat',
    description:
      'Add live customer support to any website with one line of JavaScript. White-label, zero-friction, replaces Intercom at £0/seat. Full customisation with the Palette Designer.',
    url: SITE_URL + '/widget',
    images: [{ url: SITE_URL + '/screenshots/11-widget-intro.png', width: 1200, height: 630 }],
  },
  twitter: {
    title: 'Support Widget — Embeddable Live Chat',
    description:
      'Add live customer support to any website with one line of JavaScript. White-label, zero-friction, replaces Intercom at £0/seat. Full customisation with the Palette Designer.',
    images: [SITE_URL + '/screenshots/11-widget-intro.png'],
  },
  alternates: { canonical: SITE_URL + '/widget' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
