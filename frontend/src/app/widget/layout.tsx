import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Support Widget — Embeddable Live Chat',
  description:
    'Add live customer support to any website with one line of JavaScript. White-label, zero-friction, replaces Intercom at £0/seat. Full customisation with the Palette Designer.',
  openGraph: {
    type: 'website',
    title: 'Support Widget — Embeddable Live Chat',
    description:
      'Add live customer support to any website with one line of JavaScript. White-label, zero-friction, replaces Intercom at £0/seat. Full customisation with the Palette Designer.',
    url: SITE_URL + '/widget',
    images: [{ url: SITE_URL + '/screenshots/37-widget-palette-designer.png', width: 1440, height: 900, alt: 'Chatr Embeddable Support Widget' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Support Widget — Embeddable Live Chat',
    description:
      'Add live customer support to any website with one line of JavaScript. White-label, zero-friction, replaces Intercom at £0/seat. Full customisation with the Palette Designer.',
    images: [SITE_URL + '/screenshots/37-widget-palette-designer.png'],
  },
  alternates: { canonical: SITE_URL + '/widget' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
