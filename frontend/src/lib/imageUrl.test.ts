import { imageUrl, profileUrl, coverUrl, ImageSize } from './imageUrl';

describe('imageUrl', () => {
  describe('imageUrl()', () => {
    it('should return null for null input', () => {
      expect(imageUrl(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(imageUrl(undefined)).toBeNull();
    });

    it('should return the original URL unchanged for "full" size', () => {
      const url = 'http://example.com/uploads/user1-12345.jpg';
      expect(imageUrl(url, 'full')).toBe(url);
    });

    it('should return the original URL unchanged when size is omitted (default full)', () => {
      const url = 'http://example.com/uploads/user1-12345.jpg';
      expect(imageUrl(url)).toBe(url);
    });

    it('should replace extension with -md.jpg for "md" size', () => {
      const url = 'http://example.com/uploads/user1-12345.jpg';
      expect(imageUrl(url, 'md')).toBe('http://example.com/uploads/user1-12345-md.jpg');
    });

    it('should replace extension with -sm.jpg for "sm" size', () => {
      const url = 'http://example.com/uploads/user1-12345.jpg';
      expect(imageUrl(url, 'sm')).toBe('http://example.com/uploads/user1-12345-sm.jpg');
    });

    it('should handle .jpeg extension', () => {
      const url = 'http://example.com/uploads/user1-12345.jpeg';
      expect(imageUrl(url, 'md')).toBe('http://example.com/uploads/user1-12345-md.jpg');
    });

    it('should handle .png extension', () => {
      const url = 'http://example.com/uploads/user1-12345.png';
      expect(imageUrl(url, 'sm')).toBe('http://example.com/uploads/user1-12345-sm.jpg');
    });

    it('should handle .webp extension', () => {
      const url = 'http://example.com/uploads/user1-12345.webp';
      expect(imageUrl(url, 'md')).toBe('http://example.com/uploads/user1-12345-md.jpg');
    });

    it('should preserve query string parameters', () => {
      const url = 'http://example.com/uploads/user1-12345.jpg?v=1234';
      expect(imageUrl(url, 'sm')).toBe('http://example.com/uploads/user1-12345-sm.jpg?v=1234');
    });

    it('should not transform URLs without /uploads/ path', () => {
      const url = 'http://example.com/static/default-avatar.jpg';
      expect(imageUrl(url, 'md')).toBe(url);
    });

    it('should not transform URLs without a recognised image extension', () => {
      const url = 'http://example.com/uploads/file.pdf';
      expect(imageUrl(url, 'md')).toBe(url);
    });

    it('should not transform blob URLs', () => {
      const url = 'blob:http://localhost:3000/abc-123';
      expect(imageUrl(url, 'md')).toBe(url);
    });

    it('should be case-insensitive for extensions', () => {
      const url = 'http://example.com/uploads/user1-12345.JPG';
      expect(imageUrl(url, 'md')).toBe('http://example.com/uploads/user1-12345-md.jpg');
    });
  });

  describe('profileUrl()', () => {
    it('should delegate to imageUrl', () => {
      expect(profileUrl(null)).toBeNull();
      expect(profileUrl('http://example.com/uploads/p.jpg', 'sm'))
        .toBe('http://example.com/uploads/p-sm.jpg');
    });

    it('should default to full size', () => {
      const url = 'http://example.com/uploads/p.jpg';
      expect(profileUrl(url)).toBe(url);
    });
  });

  describe('coverUrl()', () => {
    it('should delegate to imageUrl', () => {
      expect(coverUrl(null)).toBeNull();
      expect(coverUrl('http://example.com/uploads/c.png', 'md'))
        .toBe('http://example.com/uploads/c-md.jpg');
    });

    it('should default to full size', () => {
      const url = 'http://example.com/uploads/c.jpg';
      expect(coverUrl(url)).toBe(url);
    });
  });
});
