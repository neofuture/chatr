import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Developer Dashboard — Real-Time Analytics',
  description:
    '17+ live metrics, code health gauges, commit intelligence, security audit, and an embedded test runner. Real-time development analytics for the Chatr platform.',
  openGraph: {
    type: 'website',
    title: 'Developer Dashboard — Real-Time Analytics',
    description:
      '17+ live metrics, code health gauges, commit intelligence, security audit, and an embedded test runner. Real-time development analytics for the Chatr platform.',
    url: SITE_URL + '/dashboard',
    images: [{ url: SITE_URL + '/screenshots/10-dashboard-top.png', width: 1200, height: 630, alt: 'Chatr Developer Dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Developer Dashboard — Real-Time Analytics',
    description:
      '17+ live metrics, code health gauges, commit intelligence, security audit, and an embedded test runner. Real-time development analytics for the Chatr platform.',
    images: [SITE_URL + '/screenshots/10-dashboard-top.png'],
  },
  alternates: { canonical: SITE_URL + '/dashboard' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
