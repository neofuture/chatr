import { Router } from 'express';
import { load } from 'cheerio';
import { authenticateToken } from '../middleware/auth';

const router = Router();

interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

const cache = new Map<string, { data: LinkPreview; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000;
const FETCH_TIMEOUT = 10_000;

function resolveUrl(relative: string | undefined, base: string): string | null {
  if (!relative) return null;
  try {
    return new URL(relative, base).href;
  } catch {
    return null;
  }
}

// oEmbed providers for sites that ship OG tags deep in JS-heavy pages
const OEMBED_ENDPOINTS: Array<{ test: RegExp; url: (u: string) => string; siteName: string }> = [
  {
    test: /^https?:\/\/(www\.)?youtube\.com\/watch/,
    url: (u) => `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`,
    siteName: 'YouTube',
  },
  {
    test: /^https?:\/\/youtu\.be\//,
    url: (u) => `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`,
    siteName: 'YouTube',
  },
  {
    test: /^https?:\/\/(www\.)?vimeo\.com\/\d+/,
    url: (u) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`,
    siteName: 'Vimeo',
  },
  {
    test: /^https?:\/\/(open\.)?spotify\.com\//,
    url: (u) => `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`,
    siteName: 'Spotify',
  },
  {
    test: /^https?:\/\/(www\.)?twitter\.com\/|^https?:\/\/x\.com\//,
    url: (u) => `https://publish.twitter.com/oembed?url=${encodeURIComponent(u)}`,
    siteName: 'X',
  },
];

async function fetchViaOembed(url: string, endpoint: typeof OEMBED_ENDPOINTS[0]): Promise<LinkPreview | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(endpoint.url(url), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return {
      url,
      title: data.title || null,
      description: data.author_name ? `By ${data.author_name}` : null,
      image: data.thumbnail_url || null,
      siteName: data.provider_name || endpoint.siteName,
      favicon: null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaHtml(url: string): Promise<LinkPreview> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('xhtml') && !contentType.includes('text/plain')) {
      throw new Error('Not HTML');
    }

    const html = await res.text();

    // Parse only <head> if possible to speed things up
    const headEnd = html.indexOf('</head>');
    const parseChunk = headEnd > 0 ? html.slice(0, headEnd + 7) : html.slice(0, 800_000);

    const $ = load(parseChunk);

    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDesc = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogSiteName = $('meta[property="og:site_name"]').attr('content');
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const twitterDesc = $('meta[name="twitter:description"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');

    const title = ogTitle || twitterTitle || $('title').text().trim() || null;
    const description = ogDesc || twitterDesc || $('meta[name="description"]').attr('content') || null;
    const image = resolveUrl(ogImage || twitterImage || undefined, url);
    const siteName = ogSiteName || new URL(url).hostname.replace(/^www\./, '') || null;

    const faviconHref =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      $('link[rel="apple-touch-icon"]').attr('href');
    const favicon = resolveUrl(faviconHref, url) || resolveUrl('/favicon.ico', url);

    return { url, title, description, image, siteName, favicon };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPreview(url: string): Promise<LinkPreview> {
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  // Try oEmbed first for known providers
  const oembedProvider = OEMBED_ENDPOINTS.find(e => e.test.test(url));
  if (oembedProvider) {
    const result = await fetchViaOembed(url, oembedProvider);
    if (result && (result.title || result.image)) {
      cache.set(url, { data: result, expiresAt: Date.now() + CACHE_TTL });
      return result;
    }
  }

  // Fall back to HTML scraping
  const data = await fetchViaHtml(url);
  cache.set(url, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
}

/**
 * @swagger
 * /api/link-preview:
 *   get:
 *     summary: Fetch Open Graph preview for a URL
 *     tags: [Link Preview]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link preview metadata
 */
router.get('/', authenticateToken, async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url query parameter is required' });
  }

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const hostname = new URL(url).hostname;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[::1\])/.test(hostname)) {
      return res.status(400).json({ error: 'Private URLs are not allowed' });
    }
  } catch /* istanbul ignore next */ {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const preview = await fetchPreview(url);
    res.json(preview);
  } catch (error: any) {
    console.error('Link preview fetch error for', url, ':', error?.message);
    res.json({
      url,
      title: null,
      description: null,
      image: null,
      siteName: (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; } })(),
      favicon: null,
    });
  }
});

export default router;
