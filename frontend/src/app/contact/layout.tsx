import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Contact — Acquisition, Licensing & Partnerships',
  description:
    'Interested in acquiring Chatr, licensing the technology, or integrating it into your product? Let\'s talk business.',
  openGraph: {
    type: 'website',
    title: 'Contact — Acquisition, Licensing & Partnerships',
    description:
      'Interested in acquiring Chatr, licensing the technology, or integrating it into your product? Let\'s talk business.',
    url: SITE_URL + '/contact',
    images: [{ url: SITE_URL + '/screenshots/10-dashboard-top.png', width: 1440, height: 900, alt: 'Contact Chatr' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact — Acquisition, Licensing & Partnerships',
    description:
      'Interested in acquiring Chatr, licensing the technology, or integrating it into your product? Let\'s talk business.',
    images: [SITE_URL + '/screenshots/10-dashboard-top.png'],
  },
  alternates: { canonical: SITE_URL + '/contact' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
