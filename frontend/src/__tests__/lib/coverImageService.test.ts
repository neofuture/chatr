const mockGet = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();
const mockToArray = jest.fn();

jest.mock('../../lib/db', () => ({
  db: {
    coverImages: {
      get: (...args: any[]) => mockGet(...args),
      put: (...args: any[]) => mockPut(...args),
      delete: (...args: any[]) => mockDelete(...args),
      update: (...args: any[]) => mockUpdate(...args),
      where: () => ({
        equals: () => ({ toArray: () => mockToArray() }),
      }),
    },
  },
}));

import {
  saveCoverImageLocally,
  getCoverImageLocally,
  getCoverImageURL,
  uploadCoverImageToServer,
  deleteCoverImageLocally,
  deleteCoverImage,
  getUnsyncedCoverImages,
  syncCoverImages,
  syncCoverImageFromServer,
  validateCoverImage,
} from '../../lib/coverImageService';

// Global mocks
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockCreateObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;

// Mock Image class for createThumbnail
const OriginalImage = global.Image;
beforeAll(() => {
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  (globalThis as any).API = 'http://localhost:3001';

  (global as any).Image = class MockImage {
    width = 800;
    height = 600;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private _src = '';
    get src() { return this._src; }
    set src(val: string) {
      this._src = val;
      Promise.resolve().then(() => this.onload?.());
    }
  };

  const origCreate = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation((tag: string, opts?: any) => {
    if (tag === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: jest.fn() }),
        toBlob: (cb: (b: Blob | null) => void, _type?: string) => {
          cb(new Blob(['thumb'], { type: _type || 'image/jpeg' }));
        },
      } as any;
    }
    return origCreate(tag, opts);
  });
});

afterAll(() => {
  global.Image = OriginalImage;
  (document.createElement as jest.Mock).mockRestore?.();
  delete (globalThis as any).API;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// Helpers
function makeFile(name: string, type: string, sizeBytes: number): File {
  const buf = new ArrayBuffer(sizeBytes);
  return new File([buf], name, { type });
}

describe('coverImageService', () => {
  // ───────────────────────────── validateCoverImage ─────────────────────────
  describe('validateCoverImage', () => {
    it('accepts a valid JPEG file', () => {
      const file = makeFile('photo.jpg', 'image/jpeg', 1024);
      expect(validateCoverImage(file)).toEqual({ valid: true });
    });

    it('accepts image/jpg', () => {
      const file = makeFile('photo.jpg', 'image/jpg', 1024);
      expect(validateCoverImage(file)).toEqual({ valid: true });
    });

    it('accepts a valid PNG file', () => {
      const file = makeFile('photo.png', 'image/png', 1024);
      expect(validateCoverImage(file)).toEqual({ valid: true });
    });

    it('accepts a valid WebP file', () => {
      const file = makeFile('photo.webp', 'image/webp', 1024);
      expect(validateCoverImage(file)).toEqual({ valid: true });
    });

    it('rejects an invalid file type', () => {
      const file = makeFile('doc.pdf', 'application/pdf', 1024);
      const result = validateCoverImage(file);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Invalid file type/);
    });

    it('rejects a GIF file', () => {
      const file = makeFile('anim.gif', 'image/gif', 1024);
      const result = validateCoverImage(file);
      expect(result.valid).toBe(false);
    });

    it('rejects a file larger than 10 MB', () => {
      const file = makeFile('huge.jpg', 'image/jpeg', 10 * 1024 * 1024 + 1);
      const result = validateCoverImage(file);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/too large/);
    });

    it('accepts a file exactly 10 MB', () => {
      const file = makeFile('big.jpg', 'image/jpeg', 10 * 1024 * 1024);
      expect(validateCoverImage(file)).toEqual({ valid: true });
    });
  });

  // ───────────────────────────── saveCoverImageLocally ──────────────────────
  describe('saveCoverImageLocally', () => {
    it('creates a thumbnail and stores the image in IndexedDB', async () => {
      const file = makeFile('cover.jpg', 'image/jpeg', 2048);
      mockCreateObjectURL.mockReturnValue('blob:local/123');

      await saveCoverImageLocally('user1', file);

      expect(mockPut).toHaveBeenCalledTimes(1);
      const saved = mockPut.mock.calls[0][0];
      expect(saved.userId).toBe('user1');
      expect(saved.imageData).toBe(file);
      expect(saved.mimeType).toBe('image/jpeg');
      expect(saved.synced).toBe(false);
      expect(saved.thumbnail).toBeInstanceOf(Blob);
    });
  });

  // ───────────────────────────── getCoverImageLocally ──────────────────────
  describe('getCoverImageLocally', () => {
    it('returns the stored cover image', async () => {
      const record = { userId: 'u1', imageData: new Blob(), synced: false };
      mockGet.mockResolvedValue(record);

      const result = await getCoverImageLocally('u1');
      expect(mockGet).toHaveBeenCalledWith('u1');
      expect(result).toBe(record);
    });

    it('returns undefined when no image exists', async () => {
      mockGet.mockResolvedValue(undefined);
      const result = await getCoverImageLocally('unknown');
      expect(result).toBeUndefined();
    });
  });

  // ───────────────────────────── getCoverImageURL ──────────────────────────
  describe('getCoverImageURL', () => {
    it('returns null when no cover image is stored', async () => {
      mockGet.mockResolvedValue(undefined);
      expect(await getCoverImageURL('u1')).toBeNull();
    });

    it('returns server URL directly when synced and URL has no /uploads/', async () => {
      mockGet.mockResolvedValue({
        synced: true,
        url: 'https://cdn.example.com/img.jpg',
      });

      const url = await getCoverImageURL('u1');
      expect(url).toBe('https://cdn.example.com/img.jpg');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('reconciles .png extension to .jpg for /uploads/ URLs', async () => {
      mockGet.mockResolvedValue({
        synced: true,
        url: '/uploads/covers/abc.png',
      });

      const url = await getCoverImageURL('u1');
      expect(url).toBe('/uploads/covers/abc.jpg');
      expect(mockUpdate).toHaveBeenCalledWith('u1', { url: '/uploads/covers/abc.jpg' });
    });

    it('reconciles .webp extension to .jpg for /uploads/ URLs', async () => {
      mockGet.mockResolvedValue({
        synced: true,
        url: '/uploads/covers/abc.webp?v=2',
      });

      const url = await getCoverImageURL('u1');
      expect(url).toBe('/uploads/covers/abc.jpg?v=2');
    });

    it('does not reconcile .jpg extension', async () => {
      mockGet.mockResolvedValue({
        synced: true,
        url: '/uploads/covers/abc.jpg',
      });

      const url = await getCoverImageURL('u1');
      expect(url).toBe('/uploads/covers/abc.jpg');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('returns blob URL from imageData when not synced', async () => {
      const blob = new Blob(['data'], { type: 'image/jpeg' });
      mockGet.mockResolvedValue({
        synced: false,
        imageData: blob,
        thumbnail: new Blob(['thumb']),
      });
      mockCreateObjectURL.mockReturnValue('blob:http://localhost/full');

      const url = await getCoverImageURL('u1');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(url).toBe('blob:http://localhost/full');
    });

    it('returns thumbnail blob URL when useThumbnail=true and thumbnail exists', async () => {
      const thumb = new Blob(['thumb']);
      mockGet.mockResolvedValue({
        synced: false,
        imageData: new Blob(['data']),
        thumbnail: thumb,
      });
      mockCreateObjectURL.mockReturnValue('blob:http://localhost/thumb');

      const url = await getCoverImageURL('u1', true);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(thumb);
      expect(url).toBe('blob:http://localhost/thumb');
    });

    it('falls back to imageData when useThumbnail=true but no thumbnail', async () => {
      const data = new Blob(['data']);
      mockGet.mockResolvedValue({
        synced: false,
        imageData: data,
        thumbnail: undefined,
      });
      mockCreateObjectURL.mockReturnValue('blob:http://localhost/data');

      const url = await getCoverImageURL('u1', true);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(data);
    });
  });

  // ──────────────────────── uploadCoverImageToServer ───────────────────────
  describe('uploadCoverImageToServer', () => {
    it('throws when no local image exists', async () => {
      mockGet.mockResolvedValue(undefined);
      await expect(uploadCoverImageToServer('u1', 'tok')).rejects.toThrow(
        'No cover image found locally'
      );
    });

    it('returns existing URL when already synced', async () => {
      mockGet.mockResolvedValue({ synced: true, url: 'http://server/img.jpg' });

      const url = await uploadCoverImageToServer('u1', 'tok');
      expect(url).toBe('http://server/img.jpg');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('uploads image and updates local record on success', async () => {
      const imageBlob = new Blob(['img'], { type: 'image/jpeg' });
      mockGet.mockResolvedValue({ synced: false, imageData: imageBlob });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: '/uploads/covers/new.jpg' }),
      });

      const url = await uploadCoverImageToServer('u1', 'mytoken');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/users/cover-image',
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: 'Bearer mytoken' },
        })
      );
      expect(mockUpdate).toHaveBeenCalledWith('u1', {
        synced: true,
        url: '/uploads/covers/new.jpg',
      });
      expect(url).toBe('/uploads/covers/new.jpg');
    });

    it('throws when server responds with an error', async () => {
      mockGet.mockResolvedValue({ synced: false, imageData: new Blob() });
      mockFetch.mockResolvedValue({ ok: false, statusText: 'Payload Too Large' });

      await expect(uploadCoverImageToServer('u1', 'tok')).rejects.toThrow(
        'Upload failed: Payload Too Large'
      );
    });
  });

  // ─────────────────────── deleteCoverImageLocally ─────────────────────────
  describe('deleteCoverImageLocally', () => {
    it('deletes the cover image from IndexedDB', async () => {
      await deleteCoverImageLocally('u1');
      expect(mockDelete).toHaveBeenCalledWith('u1');
    });
  });

  // ──────────────────────────── deleteCoverImage ───────────────────────────
  describe('deleteCoverImage', () => {
    it('deletes locally and from server', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await deleteCoverImage('u1', 'tok');

      expect(mockDelete).toHaveBeenCalledWith('u1');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/users/cover-image',
        expect.objectContaining({
          method: 'DELETE',
          headers: { Authorization: 'Bearer tok' },
        })
      );
    });

    it('throws when server delete fails', async () => {
      mockFetch.mockResolvedValue({ ok: false, statusText: 'Forbidden' });

      await expect(deleteCoverImage('u1', 'tok')).rejects.toThrow(
        'Delete failed: Forbidden'
      );
      // Local delete still happened (called first)
      expect(mockDelete).toHaveBeenCalledWith('u1');
    });
  });

  // ────────────────────── getUnsyncedCoverImages ───────────────────────────
  describe('getUnsyncedCoverImages', () => {
    it('returns unsynced images from the database', async () => {
      const images = [{ userId: 'u1' }, { userId: 'u2' }];
      mockToArray.mockResolvedValue(images);

      const result = await getUnsyncedCoverImages();
      expect(result).toEqual(images);
    });

    it('returns empty array when all images are synced', async () => {
      mockToArray.mockResolvedValue([]);
      const result = await getUnsyncedCoverImages();
      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────── syncCoverImages ────────────────────────────
  describe('syncCoverImages', () => {
    it('uploads each unsynced image', async () => {
      mockToArray.mockResolvedValue([
        { userId: 'u1', synced: false, imageData: new Blob() },
        { userId: 'u2', synced: false, imageData: new Blob() },
      ]);

      // uploadCoverImageToServer calls mockGet then fetch
      mockGet.mockImplementation((id: string) => {
        return Promise.resolve({ userId: id, synced: false, imageData: new Blob() });
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: '/uploads/covers/synced.jpg' }),
      });

      await syncCoverImages('tok');

      // Two uploads triggered
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('continues syncing if one upload fails', async () => {
      mockToArray.mockResolvedValue([
        { userId: 'u1', synced: false, imageData: new Blob() },
        { userId: 'u2', synced: false, imageData: new Blob() },
      ]);

      let callCount = 0;
      mockGet.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(undefined); // will cause throw
        return Promise.resolve({ userId: 'u2', synced: false, imageData: new Blob() });
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: '/uploads/covers/ok.jpg' }),
      });

      // Should not throw even though first image fails
      await syncCoverImages('tok');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────── syncCoverImageFromServer ────────────────────────────
  describe('syncCoverImageFromServer', () => {
    let dispatchSpy: jest.SpyInstance;

    beforeEach(() => {
      dispatchSpy = jest.spyOn(window, 'dispatchEvent').mockImplementation(() => true);
    });

    afterEach(() => {
      dispatchSpy.mockRestore();
    });

    it('returns immediately when serverUrl is undefined', async () => {
      await syncCoverImageFromServer('u1', undefined);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns immediately when serverUrl is null', async () => {
      await syncCoverImageFromServer('u1', null);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns immediately when serverUrl is empty string', async () => {
      await syncCoverImageFromServer('u1', '');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips sync when local image is already synced with same URL', async () => {
      mockGet.mockResolvedValue({ synced: true, url: '/uploads/covers/abc.jpg' });

      await syncCoverImageFromServer('u1', '/uploads/covers/abc.jpg');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fetches and stores image when not synced locally', async () => {
      mockGet.mockResolvedValue(undefined);
      mockCreateObjectURL.mockReturnValue('blob:local/thumb');

      const blob = new Blob(['image-data'], { type: 'image/jpeg' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(blob),
      });

      await syncCoverImageFromServer('u1', '/uploads/covers/abc.jpg');

      expect(mockFetch).toHaveBeenCalledWith('/uploads/covers/abc.jpg');
      expect(mockPut).toHaveBeenCalledTimes(1);
      const saved = mockPut.mock.calls[0][0];
      expect(saved.userId).toBe('u1');
      expect(saved.synced).toBe(true);
      expect(saved.url).toBe('/uploads/covers/abc.jpg');
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'coverImageSynced' })
      );
    });

    it('uses full URL directly when serverUrl starts with http', async () => {
      mockGet.mockResolvedValue(undefined);
      mockCreateObjectURL.mockReturnValue('blob:local/x');

      const blob = new Blob(['img']);
      mockFetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });

      await syncCoverImageFromServer('u1', 'https://cdn.example.com/cover.jpg');

      expect(mockFetch).toHaveBeenCalledWith('https://cdn.example.com/cover.jpg');
    });

    it('warns and returns when fetch fails', async () => {
      mockGet.mockResolvedValue(undefined);
      mockFetch.mockResolvedValue({ ok: false, status: 404 });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await syncCoverImageFromServer('u1', '/uploads/covers/missing.jpg');

      expect(mockPut).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('catches and warns on network errors', async () => {
      mockGet.mockResolvedValue(undefined);
      mockFetch.mockRejectedValue(new Error('Network error'));
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await syncCoverImageFromServer('u1', '/uploads/covers/x.jpg');

      expect(mockPut).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('re-syncs when local URL differs from server URL', async () => {
      mockGet.mockResolvedValue({ synced: true, url: '/uploads/covers/old.jpg' });
      mockCreateObjectURL.mockReturnValue('blob:local/x');

      const blob = new Blob(['img']);
      mockFetch.mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });

      await syncCoverImageFromServer('u1', '/uploads/covers/new.jpg');

      expect(mockFetch).toHaveBeenCalled();
      expect(mockPut).toHaveBeenCalledTimes(1);
    });
  });
});
