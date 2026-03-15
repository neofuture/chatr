import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Contact Us — Enterprise Licensing & Custom Development',
  description:
    'Interested in deploying Chatr for your organisation? Get in touch about enterprise licensing, custom development, support packages, and tailored deployments.',
  openGraph: {
    type: 'website',
    title: 'Contact Us — Enterprise Licensing & Custom Development',
    description:
      'Interested in deploying Chatr for your organisation? Get in touch about enterprise licensing, custom development, support packages, and tailored deployments.',
    url: SITE_URL + '/contact',
    images: [{ url: SITE_URL + '/screenshots/10-dashboard-top.png', width: 1440, height: 900, alt: 'Contact Chatr' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us — Enterprise Licensing & Custom Development',
    description:
      'Interested in deploying Chatr for your organisation? Get in touch about enterprise licensing, custom development, support packages, and tailored deployments.',
    images: [SITE_URL + '/screenshots/10-dashboard-top.png'],
  },
  alternates: { canonical: SITE_URL + '/contact' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
