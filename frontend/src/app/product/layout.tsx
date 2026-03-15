import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Product Overview — Complete Technical & Commercial Reference',
  description:
    'Comprehensive product overview with architecture details, screenshots, and commercial analysis. 16 sections covering every aspect of the Chatr messaging platform.',
  openGraph: {
    title: 'Product Overview — Complete Technical & Commercial Reference',
    description:
      'Comprehensive product overview with architecture details, screenshots, and commercial analysis. 16 sections covering every aspect of the Chatr messaging platform.',
    url: SITE_URL + '/product',
    images: [{ url: SITE_URL + '/screenshots/03-conversations.png', width: 1200, height: 630 }],
  },
  twitter: {
    title: 'Product Overview — Complete Technical & Commercial Reference',
    description:
      'Comprehensive product overview with architecture details, screenshots, and commercial analysis. 16 sections covering every aspect of the Chatr messaging platform.',
    images: [SITE_URL + '/screenshots/03-conversations.png'],
  },
  alternates: { canonical: SITE_URL + '/product' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
