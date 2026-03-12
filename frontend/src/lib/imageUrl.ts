/**
 * Given a full-size image URL, return the URL for a specific size variant.
 * Variants are stored as siblings with a suffix before the extension:
 *   full:   userId-12345.jpg
 *   medium: userId-12345-md.jpg
 *   small:  userId-12345-sm.jpg
 *
 * Handles .jpg, .jpeg, .png, .webp extensions — all variants are .jpg.
 * If the URL has no recognised image extension, returns it unchanged.
 */

export type ImageSize = 'full' | 'md' | 'sm';

const SUFFIX_MAP: Record<ImageSize, string> = {
  full: '',
  md: '-md',
  sm: '-sm',
};

const IMG_EXT_RE = /\.(jpe?g|png|webp)(\?.*)?$/i;

export function imageUrl(url: string | null | undefined, size: ImageSize = 'full'): string | null {
  if (!url) return null;
  const suffix = SUFFIX_MAP[size];
  if (!suffix) return url;
  // Only transform uploaded images — leave static assets, defaults, and blob URLs alone
  if (!url.includes('/uploads/')) return url;
  if (!IMG_EXT_RE.test(url)) return url;
  return url.replace(IMG_EXT_RE, `${suffix}.jpg$2`);
}

export function profileUrl(url: string | null | undefined, size: ImageSize = 'full'): string | null {
  return imageUrl(url, size);
}

export function coverUrl(url: string | null | undefined, size: ImageSize = 'full'): string | null {
  return imageUrl(url, size);
}
