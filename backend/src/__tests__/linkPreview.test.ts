import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../lib/redis', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 999, retryAfter: 0 }),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
}));

const redisModule = require('../lib/redis');

import linkPreviewRouter from '../routes/link-preview';

const app = express();
app.use(express.json());
app.use('/api/link-preview', linkPreviewRouter);

const originalFetch = global.fetch;

describe('Link Preview Routes', () => {
  let authToken: string;
  const testUserId = 'user-me-123';

  beforeAll(() => {
    authToken = jwt.sign(
      { userId: testUserId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (redisModule.isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ── GET /api/link-preview ─────────────────────────────────────────────────

  describe('GET /api/link-preview', () => {
    // ── Auth ────────────────────────────────────────────────────────────────

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/link-preview?url=https://example.com');
      expect(response.status).toBe(401);
    });

    it('should return 401/403 with invalid token', async () => {
      const response = await request(app)
        .get('/api/link-preview?url=https://example.com')
        .set('Authorization', 'Bearer invalid-token');
      expect([401, 403]).toContain(response.status);
    });

    // ── Validation ──────────────────────────────────────────────────────────

    it('should return 400 without url param', async () => {
      const response = await request(app)
        .get('/api/link-preview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('url');
    });

    it('should return 400 for invalid URL', async () => {
      const response = await request(app)
        .get('/api/link-preview?url=not-a-url')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Invalid URL');
    });

    it('should return 400 for localhost URL', async () => {
      const response = await request(app)
        .get('/api/link-preview?url=http://localhost:3000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Private');
    });

    it('should return 400 for 127.0.0.1 URL', async () => {
      const response = await request(app)
        .get('/api/link-preview?url=http://127.0.0.1/admin')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Private');
    });

    it('should return 400 for 10.x.x.x private URL', async () => {
      const response = await request(app)
        .get('/api/link-preview?url=http://10.0.0.1/secret')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Private');
    });

    it('should return 400 for 192.168.x.x private URL', async () => {
      const response = await request(app)
        .get('/api/link-preview?url=http://192.168.1.1/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Private');
    });

    it('should return 400 for 0.0.0.0 URL', async () => {
      const response = await request(app)
        .get('/api/link-preview?url=http://0.0.0.0/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Private');
    });

    // ── HTML scraping success ───────────────────────────────────────────────

    it('should return preview data from HTML with OG tags', async () => {
      const html = `
        <html>
          <head>
            <title>Example Page</title>
            <meta property="og:title" content="OG Title" />
            <meta property="og:description" content="OG Description" />
            <meta property="og:image" content="https://example.com/image.png" />
            <meta property="og:site_name" content="Example" />
            <link rel="icon" href="/favicon.ico" />
          </head>
          <body></body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html; charset=utf-8' },
        text: () => Promise.resolve(html),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://example.com/page')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.url).toBe('https://example.com/page');
      expect(response.body.title).toBe('OG Title');
      expect(response.body.description).toBe('OG Description');
      expect(response.body.image).toBe('https://example.com/image.png');
      expect(response.body.siteName).toBe('Example');
      expect(response.body.favicon).toBe('https://example.com/favicon.ico');
    });

    it('should fall back to twitter meta tags', async () => {
      const html = `
        <html>
          <head>
            <meta name="twitter:title" content="Twitter Title" />
            <meta name="twitter:description" content="Twitter Desc" />
            <meta name="twitter:image" content="https://example.com/tw-image.jpg" />
          </head>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(html),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://example.com/article')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.title).toBe('Twitter Title');
      expect(response.body.description).toBe('Twitter Desc');
      expect(response.body.image).toBe('https://example.com/tw-image.jpg');
    });

    it('should fall back to <title> tag and meta description', async () => {
      const html = `
        <html>
          <head>
            <title>Plain Title</title>
            <meta name="description" content="Meta description" />
          </head>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(html),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://example.com/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.title).toBe('Plain Title');
      expect(response.body.description).toBe('Meta description');
    });

    it('should resolve relative image URLs against base URL', async () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="Test" />
            <meta property="og:image" content="/images/hero.png" />
          </head>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(html),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://relative-img.example.com/page')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.image).toBe('https://relative-img.example.com/images/hero.png');
    });

    it('should derive siteName from hostname when og:site_name missing', async () => {
      const html = `
        <html>
          <head><title>Test</title></head>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(html),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://www.example.com/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.siteName).toBe('example.com');
    });

    it('should resolve favicon from shortcut icon link', async () => {
      const html = `
        <html>
          <head>
            <title>Test</title>
            <link rel="shortcut icon" href="/static/icon.ico" />
          </head>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(html),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://shortcut-icon.example.com/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.favicon).toBe('https://shortcut-icon.example.com/static/icon.ico');
    });

    it('should default to /favicon.ico when no icon link present', async () => {
      const html = `<html><head><title>No Icon</title></head></html>`;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(html),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://example.com/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.favicon).toBe('https://example.com/favicon.ico');
    });

    // ── Null fields ─────────────────────────────────────────────────────────

    it('should return null fields when HTML has no meta tags', async () => {
      const html = `<html><head></head><body>Just text</body></html>`;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(html),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://bare.example.com/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.title).toBeNull();
      expect(response.body.description).toBeNull();
      expect(response.body.image).toBeNull();
    });

    // ── Error handling ──────────────────────────────────────────────────────

    it('should return fallback preview on fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get('/api/link-preview?url=https://down.example.com/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.url).toBe('https://down.example.com/');
      expect(response.body.title).toBeNull();
      expect(response.body.description).toBeNull();
      expect(response.body.image).toBeNull();
      expect(response.body.siteName).toBe('down.example.com');
      expect(response.body.favicon).toBeNull();
    });

    it('should return fallback preview on non-OK HTTP response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => 'text/html' },
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://missing.example.com/gone')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.url).toBe('https://missing.example.com/gone');
      expect(response.body.title).toBeNull();
    });

    it('should return fallback when content-type is not HTML', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"key":"value"}'),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://api.example.com/data')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.url).toBe('https://api.example.com/data');
      expect(response.body.title).toBeNull();
    });

    // ── oEmbed providers ────────────────────────────────────────────────────

    it('should use oEmbed endpoint for YouTube URLs', async () => {
      const oembedResponse = {
        title: 'Cool Video',
        author_name: 'Creator',
        thumbnail_url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
        provider_name: 'YouTube',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(oembedResponse),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://www.youtube.com/watch?v=abc123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.title).toBe('Cool Video');
      expect(response.body.description).toBe('By Creator');
      expect(response.body.image).toBe('https://i.ytimg.com/vi/abc/hqdefault.jpg');
      expect(response.body.siteName).toBe('YouTube');
    });

    it('should use oEmbed endpoint for youtu.be short URLs', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ title: 'Short Link Vid', thumbnail_url: 'https://i.ytimg.com/thumb.jpg' }),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://youtu.be/abc123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.title).toBe('Short Link Vid');
    });

    it('should fall back to HTML scraping when oEmbed fails', async () => {
      const htmlContent = `
        <html><head>
          <meta property="og:title" content="Fallback Title" />
        </head></html>
      `;

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'text/html' },
          text: () => Promise.resolve(htmlContent),
        });

      const response = await request(app)
        .get('/api/link-preview?url=https://www.youtube.com/watch?v=broken')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.title).toBe('Fallback Title');
    });

    // ── Additional oEmbed providers ──────────────────────────────────────────

    it('should use oEmbed endpoint for Vimeo URLs', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          title: 'Vimeo Video',
          author_name: 'Director',
          thumbnail_url: 'https://i.vimeocdn.com/thumb.jpg',
          provider_name: 'Vimeo',
        }),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://vimeo.com/123456789')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.title).toBe('Vimeo Video');
      expect(response.body.description).toBe('By Director');
      expect(response.body.siteName).toBe('Vimeo');
    });

    it('should use oEmbed endpoint for Spotify URLs', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          title: 'Cool Song',
          thumbnail_url: 'https://i.scdn.co/thumb.jpg',
          provider_name: 'Spotify',
        }),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://open.spotify.com/track/abc123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.title).toBe('Cool Song');
      expect(response.body.siteName).toBe('Spotify');
    });

    it('should use oEmbed endpoint for Twitter/X URLs', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          title: 'A Tweet',
          author_name: 'Tweeter',
          provider_name: 'X',
        }),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://x.com/user/status/123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.title).toBe('A Tweet');
      expect(response.body.siteName).toBe('X');
    });

    it('should fall back to HTML when oEmbed fetch throws (network error)', async () => {
      const htmlContent = `<html><head>
        <meta property="og:title" content="Fallback After Throw" />
      </head></html>`;

      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'text/html' },
          text: () => Promise.resolve(htmlContent),
        });

      const response = await request(app)
        .get('/api/link-preview?url=https://www.youtube.com/watch?v=err_case')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.title).toBe('Fallback After Throw');
    });

    // ── resolveUrl error path ────────────────────────────────────────────────

    it('should return null image when OG image is an invalid absolute URL', async () => {
      const html = `<html><head>
        <meta property="og:title" content="Bad Image" />
        <meta property="og:image" content="http://[invalid" />
      </head></html>`;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve(html),
      });

      const response = await request(app)
        .get('/api/link-preview?url=https://badimg.example.com/page')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.title).toBe('Bad Image');
      expect(response.body.image).toBeNull();
    });

  });
});
