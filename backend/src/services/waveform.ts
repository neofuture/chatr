import * as fs from 'fs';
import * as mm from 'music-metadata';

const WAVEFORM_BARS = 100;

/**
 * Deterministic placeholder waveform shown instantly before client-side analysis completes.
 */
export function generatePlaceholderWaveform(seed: string = ''): number[] {
  const pattern = [0.08, 0.12, 0.20, 0.35, 0.55, 0.45, 0.30, 0.18, 0.10, 0.07];
  return Array.from({ length: WAVEFORM_BARS }, (_, i) => {
    const base = pattern[i % pattern.length];
    const variation = Math.sin(i * 0.7 + seed.length * 0.1) * 0.06;
    return Math.max(0.04, Math.min(0.90, base + variation));
  });
}

/**
 * Get audio duration from file metadata only (no PCM decode on server).
 * Real waveform is generated client-side via OfflineAudioContext and sent back.
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const metadata = await mm.parseFile(filePath);
    return metadata.format.duration || 0;
  } catch (e) {
    console.warn('⚠️ Could not read audio metadata:', e);
    return 0;
  }
}

/**
 * Kept for backwards-compat — returns placeholder + duration.
 */
export async function generateWaveformFromFile(filePath: string): Promise<{ waveform: number[]; duration: number }> {
  const duration = await getAudioDuration(filePath);
  return { waveform: generatePlaceholderWaveform(filePath), duration };
}
