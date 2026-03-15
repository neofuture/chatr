import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Documentation — API & Developer Guides',
  description:
    'Complete technical documentation for the Chatr messaging platform. API references, component guides, architecture docs, and development guides.',
  openGraph: {
    type: 'website',
    title: 'Documentation — API & Developer Guides',
    description:
      'Complete technical documentation for the Chatr messaging platform. API references, component guides, architecture docs, and development guides.',
    url: SITE_URL + '/docs',
    images: [{ url: SITE_URL + '/screenshots/10-dashboard-top.png', width: 1440, height: 900, alt: 'Chatr Documentation' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Documentation — API & Developer Guides',
    description:
      'Complete technical documentation for the Chatr messaging platform. API references, component guides, architecture docs, and development guides.',
    images: [SITE_URL + '/screenshots/10-dashboard-top.png'],
  },
  alternates: { canonical: SITE_URL + '/docs' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
