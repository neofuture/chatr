const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock('./db', () => ({
  db: {
    audioCache: {
      get: (...args: any[]) => mockGet(...args),
      put: (...args: any[]) => mockPut(...args),
    },
  },
}));

import { getCachedAudioURL, cacheAudio, getOrCacheAudio } from './audioCacheService';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockCreateObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;

describe('audioCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCachedAudioURL', () => {
    it('should return an object URL when audio is cached', async () => {
      const blob = new Blob(['audio'], { type: 'audio/webm' });
      mockGet.mockResolvedValue({ messageId: 'msg1', audioData: blob });
      mockCreateObjectURL.mockReturnValue('blob:http://localhost/abc');

      const result = await getCachedAudioURL('msg1');

      expect(mockGet).toHaveBeenCalledWith('msg1');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(result).toBe('blob:http://localhost/abc');
    });

    it('should return null when audio is not cached', async () => {
      mockGet.mockResolvedValue(undefined);

      const result = await getCachedAudioURL('msg1');
      expect(result).toBeNull();
    });

    it('should return null when db.get throws', async () => {
      mockGet.mockRejectedValue(new Error('DB error'));

      const result = await getCachedAudioURL('msg1');
      expect(result).toBeNull();
    });
  });

  describe('cacheAudio', () => {
    it('should fetch audio, store in db, and return object URL', async () => {
      const blob = new Blob(['audio'], { type: 'audio/webm' });
      Object.defineProperty(blob, 'size', { value: 500 });
      mockFetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });
      mockCreateObjectURL.mockReturnValue('blob:http://localhost/xyz');
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

      const result = await cacheAudio('msg1', '/uploads/audio.webm', 5);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/uploads/audio.webm');
      expect(mockPut).toHaveBeenCalledWith(expect.objectContaining({
        messageId: 'msg1',
        audioData: blob,
        duration: 5,
        cachedAt: 1700000000000,
      }));
      expect(result).toBe('blob:http://localhost/xyz');

      jest.restoreAllMocks();
    });

    it('should use full URL directly when it starts with http', async () => {
      const blob = new Blob(['audio']);
      mockFetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });
      mockCreateObjectURL.mockReturnValue('blob:url');

      await cacheAudio('msg1', 'http://cdn.example.com/audio.webm', 3);

      expect(mockFetch).toHaveBeenCalledWith('http://cdn.example.com/audio.webm');
    });

    it('should return null when fetch fails', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await cacheAudio('msg1', '/uploads/audio.webm', 5);
      expect(result).toBeNull();
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('should return null when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await cacheAudio('msg1', '/uploads/audio.webm', 5);
      expect(result).toBeNull();
    });
  });

  describe('getOrCacheAudio', () => {
    it('should return cached URL with fromCache: true when cached', async () => {
      const blob = new Blob(['audio']);
      mockGet.mockResolvedValue({ messageId: 'msg1', audioData: blob });
      mockCreateObjectURL.mockReturnValue('blob:cached');

      const result = await getOrCacheAudio('msg1', '/uploads/a.webm', 3);

      expect(result).toEqual({ url: 'blob:cached', fromCache: true });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should download and cache when not cached, return fromCache: false', async () => {
      mockGet.mockResolvedValue(undefined);
      const blob = new Blob(['audio']);
      mockFetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });
      mockCreateObjectURL.mockReturnValue('blob:fresh');

      const result = await getOrCacheAudio('msg1', '/uploads/a.webm', 3);

      expect(result).toEqual({ url: 'blob:fresh', fromCache: false });
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should fall back to direct server URL when both cache and fetch fail', async () => {
      mockGet.mockResolvedValue(undefined);
      mockFetch.mockResolvedValue({ ok: false });

      const result = await getOrCacheAudio('msg1', '/uploads/a.webm', 3);

      expect(result).toEqual({
        url: 'http://localhost:3001/uploads/a.webm',
        fromCache: false,
      });
    });

    it('should fall back with full URL when serverUrl starts with http', async () => {
      mockGet.mockResolvedValue(undefined);
      mockFetch.mockResolvedValue({ ok: false });

      const result = await getOrCacheAudio('msg1', 'http://cdn.example.com/a.webm', 3);

      expect(result).toEqual({
        url: 'http://cdn.example.com/a.webm',
        fromCache: false,
      });
    });
  });
});
