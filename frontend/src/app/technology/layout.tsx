import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Technology — Architecture & Stack',
  description:
    'Built on Next.js 16, React 19, Node.js, PostgreSQL, Redis, Socket.IO, and AWS. 70+ REST endpoints, 40+ WebSocket events, 1,300+ automated tests across three tiers.',
  openGraph: {
    title: 'Technology — Architecture & Stack',
    description:
      'Built on Next.js 16, React 19, Node.js, PostgreSQL, Redis, Socket.IO, and AWS. 70+ REST endpoints, 40+ WebSocket events, 1,300+ automated tests across three tiers.',
    url: SITE_URL + '/technology',
    images: [{ url: SITE_URL + '/screenshots/10-dashboard-top.png', width: 1200, height: 630 }],
  },
  twitter: {
    title: 'Technology — Architecture & Stack',
    description:
      'Built on Next.js 16, React 19, Node.js, PostgreSQL, Redis, Socket.IO, and AWS. 70+ REST endpoints, 40+ WebSocket events, 1,300+ automated tests across three tiers.',
    images: [SITE_URL + '/screenshots/10-dashboard-top.png'],
  },
  alternates: { canonical: SITE_URL + '/technology' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
