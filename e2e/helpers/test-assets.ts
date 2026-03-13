import fs from 'fs';
import path from 'path';

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

/**
 * Creates minimal valid test files for upload tests.
 * Call once from global-setup; files persist across test runs.
 */
export function ensureTestAssets() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  // 1x1 red PNG (68 bytes)
  const pngPath = path.join(ASSETS_DIR, 'test-image.png');
  if (!fs.existsSync(pngPath)) {
    const png = Buffer.from(
      '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de' +
      '0000000c4944415408d763f8cfc000000002000160e7274a0000000049454e44ae426082',
      'hex',
    );
    fs.writeFileSync(pngPath, png);
  }

  // 200x100 red PNG for cover images (wider aspect ratio)
  const coverPath = path.join(ASSETS_DIR, 'test-cover.png');
  if (!fs.existsSync(coverPath)) {
    // Reuse the 1x1 PNG — croppers will handle it
    fs.copyFileSync(pngPath, coverPath);
  }

  // Minimal valid WAV file (~1 second of silence, 8kHz mono 8-bit)
  const wavPath = path.join(ASSETS_DIR, 'test-audio.wav');
  if (!fs.existsSync(wavPath)) {
    const sampleRate = 8000;
    const numSamples = sampleRate; // 1 second
    const dataSize = numSamples;
    const fileSize = 44 + dataSize - 8;

    const buf = Buffer.alloc(44 + dataSize);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(fileSize, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);       // chunk size
    buf.writeUInt16LE(1, 20);        // PCM
    buf.writeUInt16LE(1, 22);        // mono
    buf.writeUInt32LE(sampleRate, 24);
    buf.writeUInt32LE(sampleRate, 28); // byte rate
    buf.writeUInt16LE(1, 32);        // block align
    buf.writeUInt16LE(8, 34);        // bits per sample
    buf.write('data', 36);
    buf.writeUInt32LE(dataSize, 40);
    // Silence (128 = zero for 8-bit unsigned PCM)
    buf.fill(128, 44);
    fs.writeFileSync(wavPath, buf);
  }

  // Small text file for generic file upload
  const txtPath = path.join(ASSETS_DIR, 'test-file.txt');
  if (!fs.existsSync(txtPath)) {
    fs.writeFileSync(txtPath, 'E2E test file content\n');
  }

  return { pngPath, coverPath, wavPath, txtPath };
}

export function getAssetPath(name: string) {
  return path.join(ASSETS_DIR, name);
}
