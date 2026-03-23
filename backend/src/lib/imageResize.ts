import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const S3_BUCKET = process.env.S3_BUCKET || '';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-2';

const s3 = IS_PRODUCTION ? new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
}) : null;

const JPEG_QUALITY = 70;

export interface ImageVariant {
  suffix: string;   // e.g. '' (full), '-md', '-sm'
  width: number;
  height: number;
}

export const PROFILE_VARIANTS: ImageVariant[] = [
  { suffix: '',    width: 400, height: 400 },
  { suffix: '-md', width: 320, height: 320 },
  { suffix: '-sm', width: 96,  height: 96  },
];

export const COVER_VARIANTS: ImageVariant[] = [
  { suffix: '',    width: 1200, height: 600 },
  { suffix: '-sm', width: 600,  height: 300 },
];

/**
 * Process an uploaded image buffer into multiple JPEG size variants.
 * Returns the full-size URL (the one to store in the database).
 */
export async function processImageVariants(
  buffer: Buffer,
  baseFilename: string,
  subfolder: string,
  variants: ImageVariant[],
): Promise<string> {
  const baseName = baseFilename.replace(/\.[^.]+$/, '');
  let fullUrl = '';

  for (const variant of variants) {
    const filename = `${baseName}${variant.suffix}.jpg`;
    const resized = await sharp(buffer)
      .resize(variant.width, variant.height, { fit: 'cover' })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    if (IS_PRODUCTION && s3) {
      const key = `uploads/${subfolder}/${filename}`;
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET, Key: key, Body: resized, ContentType: 'image/jpeg',
      }));
      const url = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
      if (variant.suffix === '') fullUrl = url;
    } else {
      const dir = path.join(__dirname, '../../uploads', subfolder);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, filename), resized);
      const url = `/uploads/${subfolder}/${filename}`;
      if (variant.suffix === '') fullUrl = url;
    }
  }

  return fullUrl;
}

/**
 * Delete all size variants for a given image URL.
 */
export async function deleteImageVariants(
  fullUrl: string,
  variants: ImageVariant[],
): Promise<void> {
  if (!fullUrl) return;

  for (const variant of variants) {
    const variantUrl = getVariantUrl(fullUrl, variant.suffix);

    if (IS_PRODUCTION && s3) {
      try {
        const key = variantUrl.replace(`https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/`, '');
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
      } catch { /* best effort */ }
    } else {
      try {
        const urlPath = variantUrl.startsWith('http') ? new URL(variantUrl).pathname : variantUrl;
        const filePath = path.join(__dirname, '../..', urlPath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch { /* best effort */ }
    }
  }
}

/**
 * Given a full-size URL, return the URL for a specific variant.
 * e.g. getVariantUrl('http://…/img.jpg', '-sm') → 'http://…/img-sm.jpg'
 */
export function getVariantUrl(fullUrl: string, suffix: string): string {
  if (!suffix) return fullUrl;
  return fullUrl.replace(/\.jpg(\?.*)?$/, `${suffix}.jpg$1`);
}
