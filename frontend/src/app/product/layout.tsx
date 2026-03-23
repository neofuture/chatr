import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Product Overview — Complete Technical & Commercial Reference',
  description:
    'Comprehensive product overview with architecture details, screenshots, and commercial analysis. 16 sections covering every aspect of the Chatr messaging platform.',
  openGraph: {
    type: 'website',
    title: 'Product Overview — Complete Technical & Commercial Reference',
    description:
      'Comprehensive product overview with architecture details, screenshots, and commercial analysis. 16 sections covering every aspect of the Chatr messaging platform.',
    url: SITE_URL + '/product',
    images: [{ url: SITE_URL + '/screenshots/04-chat-view.png', width: 1440, height: 900, alt: 'Chatr Product Overview' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Product Overview — Complete Technical & Commercial Reference',
    description:
      'Comprehensive product overview with architecture details, screenshots, and commercial analysis. 16 sections covering every aspect of the Chatr messaging platform.',
    images: [SITE_URL + '/screenshots/04-chat-view.png'],
  },
  alternates: { canonical: SITE_URL + '/product' },
};

const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Chatr Product Overview',
  description: 'Comprehensive product overview with architecture details, screenshots, and commercial analysis. 16 sections covering every aspect of the Chatr messaging platform.',
  url: SITE_URL + '/product',
  isPartOf: { '@type': 'WebSite', name: 'Chatr', url: SITE_URL },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      {children}
    </>
  );
}
