import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Technology — Architecture & Stack',
  description:
    'Built on Next.js 16, React 19, Node.js, PostgreSQL, Redis, Socket.IO, and AWS. 88 REST endpoints, 85+ WebSocket events, 2,800+ automated tests across three tiers.',
  openGraph: {
    type: 'website',
    title: 'Technology — Architecture & Stack',
    description:
      'Built on Next.js 16, React 19, Node.js, PostgreSQL, Redis, Socket.IO, and AWS. 88 REST endpoints, 85+ WebSocket events, 2,800+ automated tests across three tiers.',
    url: SITE_URL + '/technology',
    images: [{ url: SITE_URL + '/screenshots/09-dashboard-full.png', width: 1200, height: 630, alt: 'Chatr Technology Stack & Architecture' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Technology — Architecture & Stack',
    description:
      'Built on Next.js 16, React 19, Node.js, PostgreSQL, Redis, Socket.IO, and AWS. 88 REST endpoints, 85+ WebSocket events, 2,800+ automated tests across three tiers.',
    images: [SITE_URL + '/screenshots/09-dashboard-full.png'],
  },
  alternates: { canonical: SITE_URL + '/technology' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
