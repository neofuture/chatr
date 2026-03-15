import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Pricing — Zero Cost, Full Ownership',
  description:
    'Stop paying per-seat fees for chat software. Chatr replaces expensive SaaS subscriptions like Intercom (£39-99/seat/month) with a production-ready platform you deploy once and keep forever.',
  openGraph: {
    type: 'website',
    title: 'Pricing — Zero Cost, Full Ownership',
    description:
      'Stop paying per-seat fees for chat software. Chatr replaces expensive SaaS subscriptions like Intercom (£39-99/seat/month) with a production-ready platform you deploy once and keep forever.',
    url: SITE_URL + '/pricing',
    images: [{ url: SITE_URL + '/screenshots/10-dashboard-top.png', width: 1440, height: 900, alt: 'Chatr Pricing — Zero Cost, Full Ownership' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — Zero Cost, Full Ownership',
    description:
      'Stop paying per-seat fees for chat software. Chatr replaces expensive SaaS subscriptions like Intercom (£39-99/seat/month) with a production-ready platform you deploy once and keep forever.',
    images: [SITE_URL + '/screenshots/10-dashboard-top.png'],
  },
  alternates: { canonical: SITE_URL + '/pricing' },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How much does Chatr cost?',
      acceptedAnswer: { '@type': 'Answer', text: 'Chatr is completely free. You get the full source code with zero per-seat fees, no recurring costs, and full ownership forever.' },
    },
    {
      '@type': 'Question',
      name: 'How does Chatr compare to Intercom?',
      acceptedAnswer: { '@type': 'Answer', text: 'Intercom charges £39–99 per seat per month with vendor lock-in. Chatr delivers comparable features (live chat, widget, voice, file sharing) at zero cost with full source code ownership and no recurring fees.' },
    },
    {
      '@type': 'Question',
      name: 'What features are included?',
      acceptedAnswer: { '@type': 'Answer', text: 'All 50+ features are included: real-time messaging, voice notes, video, file sharing, AI chatbot, embeddable support widget, typing indicators, read receipts, group chats, dark/light themes, and enterprise authentication.' },
    },
    {
      '@type': 'Question',
      name: 'Can I deploy Chatr on my own servers?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes. Chatr runs on your own infrastructure — AWS, DigitalOcean, or any server with Node.js, PostgreSQL, and Redis. You have full control of your data.' },
    },
    {
      '@type': 'Question',
      name: 'How long does it take to deploy?',
      acceptedAnswer: { '@type': 'Answer', text: 'Chatr can be deployed in under an hour. The platform comes with automated deployment scripts, Docker support, and comprehensive documentation.' },
    },
  ],
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {children}
    </>
  );
}
