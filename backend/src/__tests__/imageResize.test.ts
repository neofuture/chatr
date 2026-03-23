import fs from 'fs';

const mockSharpInstance = {
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
};

jest.mock('sharp', () => jest.fn(() => mockSharpInstance));

const mockS3Send = jest.fn().mockResolvedValue({});
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn((args: any) => args),
  DeleteObjectCommand: jest.fn((args: any) => args),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

import {
  processImageVariants,
  deleteImageVariants,
  getVariantUrl,
  PROFILE_VARIANTS,
  COVER_VARIANTS,
  ImageVariant,
} from '../lib/imageResize';

describe('imageResize', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'test', BACKEND_URL: 'http://localhost:3001' };

    // Re-establish mock implementations after resetMocks
    const sharp = require('sharp');
    sharp.mockImplementation(() => mockSharpInstance);
    mockSharpInstance.resize.mockReturnThis();
    mockSharpInstance.jpeg.mockReturnThis();
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('fake-image'));

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ── Constants ──────────────────────────────────────────────────────────────

  describe('PROFILE_VARIANTS', () => {
    it('should have three variants with expected suffixes', () => {
      expect(PROFILE_VARIANTS).toHaveLength(3);
      const suffixes = PROFILE_VARIANTS.map((v) => v.suffix);
      expect(suffixes).toEqual(['', '-md', '-sm']);
    });

    it('should have width and height for each variant', () => {
      for (const v of PROFILE_VARIANTS) {
        expect(v.width).toBeGreaterThan(0);
        expect(v.height).toBeGreaterThan(0);
      }
    });
  });

  describe('COVER_VARIANTS', () => {
    it('should have two variants with expected suffixes', () => {
      expect(COVER_VARIANTS).toHaveLength(2);
      const suffixes = COVER_VARIANTS.map((v) => v.suffix);
      expect(suffixes).toEqual(['', '-sm']);
    });

    it('should have width and height for each variant', () => {
      for (const v of COVER_VARIANTS) {
        expect(v.width).toBeGreaterThan(0);
        expect(v.height).toBeGreaterThan(0);
      }
    });
  });

  // ── getVariantUrl ──────────────────────────────────────────────────────────

  describe('getVariantUrl', () => {
    it('should return original URL for empty suffix', () => {
      expect(getVariantUrl('http://example.com/img.jpg', '')).toBe(
        'http://example.com/img.jpg',
      );
    });

    it('should insert suffix before .jpg', () => {
      expect(getVariantUrl('http://example.com/img.jpg', '-sm')).toBe(
        'http://example.com/img-sm.jpg',
      );
    });

    it('should preserve query parameters', () => {
      expect(getVariantUrl('http://example.com/img.jpg?v=1', '-md')).toBe(
        'http://example.com/img-md.jpg?v=1',
      );
    });
  });

  // ── processImageVariants ───────────────────────────────────────────────────

  describe('processImageVariants', () => {
    const buffer = Buffer.from('test-image-data');
    const variants: ImageVariant[] = [
      { suffix: '', width: 400, height: 400 },
      { suffix: '-sm', width: 96, height: 96 },
    ];

    it('should create a variant for each size', async () => {
      await processImageVariants(buffer, 'avatar.png', 'profiles', variants);

      const sharp = require('sharp');
      expect(sharp).toHaveBeenCalledTimes(2);
    });

    it('should return the base URL (full-size variant)', async () => {
      const url = await processImageVariants(buffer, 'avatar.png', 'profiles', variants);

      expect(url).toBe('/uploads/profiles/avatar.jpg');
    });

    it('should write to local filesystem in dev mode', async () => {
      await processImageVariants(buffer, 'photo.jpg', 'covers', variants);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      const firstCallPath = (fs.writeFileSync as jest.Mock).mock.calls[0][0];
      expect(firstCallPath).toContain('covers');
      expect(firstCallPath).toContain('photo.jpg');
    });

    it('should create directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await processImageVariants(buffer, 'img.png', 'profiles', variants);

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should strip original extension and use .jpg', async () => {
      const url = await processImageVariants(buffer, 'photo.webp', 'uploads', [
        { suffix: '', width: 200, height: 200 },
      ]);

      expect(url).toContain('photo.jpg');
      expect(url).not.toContain('.webp');
    });

    it('should handle single variant', async () => {
      const singleVariant: ImageVariant[] = [{ suffix: '', width: 100, height: 100 }];
      const url = await processImageVariants(buffer, 'test.png', 'dir', singleVariant);

      expect(url).toBe('/uploads/dir/test.jpg');
      const sharp = require('sharp');
      expect(sharp).toHaveBeenCalledTimes(1);
    });
  });

  // ── deleteImageVariants ────────────────────────────────────────────────────

  describe('deleteImageVariants', () => {
    const variants: ImageVariant[] = [
      { suffix: '', width: 400, height: 400 },
      { suffix: '-sm', width: 96, height: 96 },
    ];

    it('should remove files from local filesystem', async () => {
      await deleteImageVariants('http://localhost:3001/uploads/profiles/avatar.jpg', variants);

      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    });

    it('should do nothing when URL is empty', async () => {
      await deleteImageVariants('', variants);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should not throw when file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(
        deleteImageVariants('http://localhost:3001/uploads/profiles/avatar.jpg', variants),
      ).resolves.toBeUndefined();

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(
        deleteImageVariants('http://localhost:3001/uploads/profiles/avatar.jpg', variants),
      ).resolves.toBeUndefined();
    });
  });

  // ── S3 Production Mode ──────────────────────────────────────────────────────

  describe('S3 production mode', () => {
    const singleVariant: ImageVariant[] = [{ suffix: '', width: 400, height: 400 }];
    const twoVariants: ImageVariant[] = [
      { suffix: '', width: 400, height: 400 },
      { suffix: '-sm', width: 96, height: 96 },
    ];

    beforeEach(() => {
      mockS3Send.mockReset().mockResolvedValue({});
      const s3Mod = require('@aws-sdk/client-s3');
      s3Mod.S3Client.mockImplementation(() => ({ send: mockS3Send }));
      s3Mod.PutObjectCommand.mockImplementation((args: any) => args);
      s3Mod.DeleteObjectCommand.mockImplementation((args: any) => args);

      const sharp = require('sharp');
      sharp.mockImplementation(() => mockSharpInstance);
      mockSharpInstance.resize.mockReturnThis();
      mockSharpInstance.jpeg.mockReturnThis();
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('fake-image'));
    });

    it('should upload variants to S3 and return S3 URL', async () => {
      process.env.NODE_ENV = 'production';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.AWS_REGION = 'us-east-1';

      let prodProcess: typeof processImageVariants;
      jest.isolateModules(() => {
        prodProcess = require('../lib/imageResize').processImageVariants;
      });

      process.env.NODE_ENV = 'test';

      const url = await prodProcess!(Buffer.from('test'), 'img.png', 'profiles', singleVariant);

      expect(url).toContain('test-bucket');
      expect(url).toContain('s3.');
      expect(mockS3Send).toHaveBeenCalled();
    });

    it('should delete variants from S3', async () => {
      process.env.NODE_ENV = 'production';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.AWS_REGION = 'us-east-1';

      let prodDelete: typeof deleteImageVariants;
      jest.isolateModules(() => {
        prodDelete = require('../lib/imageResize').deleteImageVariants;
      });

      process.env.NODE_ENV = 'test';

      await prodDelete!(
        'https://test-bucket.s3.us-east-1.amazonaws.com/uploads/profiles/avatar.jpg',
        twoVariants,
      );

      expect(mockS3Send).toHaveBeenCalledTimes(2);
    });

    it('should handle S3 delete errors gracefully', async () => {
      process.env.NODE_ENV = 'production';
      process.env.S3_BUCKET = 'test-bucket';
      process.env.AWS_REGION = 'us-east-1';
      mockS3Send.mockRejectedValue(new Error('S3 error'));

      let prodDelete: typeof deleteImageVariants;
      jest.isolateModules(() => {
        prodDelete = require('../lib/imageResize').deleteImageVariants;
      });

      process.env.NODE_ENV = 'test';

      await expect(
        prodDelete!(
          'https://test-bucket.s3.us-east-1.amazonaws.com/uploads/profiles/avatar.jpg',
          singleVariant,
        ),
      ).resolves.toBeUndefined();
    });
  });
});
