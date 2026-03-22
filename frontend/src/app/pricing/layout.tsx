import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export const metadata: Metadata = {
  title: 'Pricing & Support — Free Code, Expert Help from £15/hr',
  description:
    'Chatr is free and open source (MIT). Need help with setup, deployment, or customisation? Paid support starts at £15/hour with monthly plans from £99. Replaces Intercom at a fraction of the cost.',
  openGraph: {
    type: 'website',
    title: 'Pricing & Support — Free Code, Expert Help from £15/hr',
    description:
      'Chatr is free and open source (MIT). Need help with setup, deployment, or customisation? Paid support starts at £15/hour with monthly plans from £99. Replaces Intercom at a fraction of the cost.',
    url: SITE_URL + '/pricing',
    images: [{ url: SITE_URL + '/screenshots/10-dashboard-top.png', width: 1440, height: 900, alt: 'Chatr Pricing — Zero Cost, Full Ownership' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing & Support — Free Code, Expert Help from £15/hr',
    description:
      'Chatr is free and open source (MIT). Need help with setup, deployment, or customisation? Paid support starts at £15/hour with monthly plans from £99. Replaces Intercom at a fraction of the cost.',
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
    {
      '@type': 'Question',
      name: 'Do you offer paid support?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes. The code is free and always will be. Expert support for setup, deployment, customisation, and troubleshooting is available from £15/hour pay-as-you-go, or from £99/month with a Starter plan that includes 8 hours of support.' },
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
