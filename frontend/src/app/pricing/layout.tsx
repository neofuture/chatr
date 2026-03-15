import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Pricing — Zero Cost, Full Ownership',
  description:
    'Stop paying per-seat fees for chat software. Chatr replaces expensive SaaS subscriptions like Intercom (£39-99/seat/month) with a production-ready platform you deploy once and keep forever.',
  openGraph: {
    title: 'Pricing — Zero Cost, Full Ownership',
    description:
      'Stop paying per-seat fees for chat software. Chatr replaces expensive SaaS subscriptions like Intercom (£39-99/seat/month) with a production-ready platform you deploy once and keep forever.',
    url: SITE_URL + '/pricing',
    images: [{ url: SITE_URL + '/screenshots/01-landing-page.png', width: 1200, height: 630 }],
  },
  twitter: {
    title: 'Pricing — Zero Cost, Full Ownership',
    description:
      'Stop paying per-seat fees for chat software. Chatr replaces expensive SaaS subscriptions like Intercom (£39-99/seat/month) with a production-ready platform you deploy once and keep forever.',
    images: [SITE_URL + '/screenshots/01-landing-page.png'],
  },
  alternates: { canonical: SITE_URL + '/pricing' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
