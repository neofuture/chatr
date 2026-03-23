import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chatr.emberlyn.co.uk';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: '2026-03-22', changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/features`, lastModified: '2026-03-22', changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/widget`, lastModified: '2026-03-22', changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/pricing`, lastModified: '2026-03-22', changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/technology`, lastModified: '2026-03-22', changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/product`, lastModified: '2026-03-22', changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: '2026-03-22', changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/docs`, lastModified: '2026-03-22', changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/dashboard`, lastModified: '2026-03-22', changeFrequency: 'weekly', priority: 0.6 },
  ];
}
