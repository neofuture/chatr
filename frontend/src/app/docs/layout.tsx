import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Complete technical documentation for the Chatr messaging platform. API references, component guides, architecture docs, and development guides.',
  openGraph: {
    title: 'Documentation',
    description:
      'Complete technical documentation for the Chatr messaging platform. API references, component guides, architecture docs, and development guides.',
    url: SITE_URL + '/docs',
    images: [{ url: SITE_URL + '/screenshots/12-docs.png', width: 1200, height: 630 }],
  },
  twitter: {
    title: 'Documentation',
    description:
      'Complete technical documentation for the Chatr messaging platform. API references, component guides, architecture docs, and development guides.',
    images: [SITE_URL + '/screenshots/12-docs.png'],
  },
  alternates: { canonical: SITE_URL + '/docs' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
