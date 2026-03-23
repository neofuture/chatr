import { db } from './db';
import { resolveAssetUrl } from '@/lib/imageUrl';

/**
 * Get a cached audio blob URL for a voice note, or null if not cached.
 */
export async function getCachedAudioURL(messageId: string): Promise<string | null> {
  try {
    const entry = await db.audioCache.get(messageId);
    if (!entry) return null;
    return URL.createObjectURL(entry.audioData);
  } catch {
    return null;
  }
}

/**
 * Download a voice note from the server, cache it in IndexedDB,
 * and return an object URL for immediate playback.
 */
export async function cacheAudio(
  messageId: string,
  serverUrl: string,
  duration: number,
): Promise<string | null> {
  try {
    const fullUrl = resolveAssetUrl(serverUrl) || serverUrl;
    const res = await fetch(fullUrl);
    if (!res.ok) return null;

    const blob = await res.blob();

    await db.audioCache.put({
      messageId,
      audioData: blob,
      mimeType: blob.type || 'audio/webm',
      duration,
      cachedAt: Date.now(),
      size: blob.size,
    });

    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('[AudioCache] Failed to cache', messageId, err);
    return null;
  }
}

/**
 * Get cached URL if available, otherwise download and cache.
 * Returns { url, fromCache }.
 */
export async function getOrCacheAudio(
  messageId: string,
  serverUrl: string,
  duration: number,
): Promise<{ url: string; fromCache: boolean }> {
  const cached = await getCachedAudioURL(messageId);
  if (cached) return { url: cached, fromCache: true };

  const freshUrl = await cacheAudio(messageId, serverUrl, duration);
  if (freshUrl) return { url: freshUrl, fromCache: false };

  // Fallback to server URL directly
  const fullUrl = resolveAssetUrl(serverUrl) || serverUrl;
  return { url: fullUrl, fromCache: false };
}
