const mockParseFile = jest.fn();

jest.mock('music-metadata', () => ({
  parseFile: mockParseFile,
}), { virtual: true });

import { generatePlaceholderWaveform, getAudioDuration, generateWaveformFromFile } from '../services/waveform';

describe('Waveform Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePlaceholderWaveform', () => {
    it('should return an array of 100 bars', () => {
      const waveform = generatePlaceholderWaveform();
      expect(waveform).toHaveLength(100);
    });

    it('should return values between 0 and 1', () => {
      const waveform = generatePlaceholderWaveform('test-seed');
      for (const val of waveform) {
        expect(val).toBeGreaterThanOrEqual(0.04);
        expect(val).toBeLessThanOrEqual(0.90);
      }
    });

    it('should produce deterministic output for same seed', () => {
      const a = generatePlaceholderWaveform('same-seed');
      const b = generatePlaceholderWaveform('same-seed');
      expect(a).toEqual(b);
    });

    it('should produce different output for seeds of different lengths', () => {
      const a = generatePlaceholderWaveform('short');
      const b = generatePlaceholderWaveform('a-much-longer-seed-string');
      expect(a).not.toEqual(b);
    });

    it('should work with empty seed', () => {
      const waveform = generatePlaceholderWaveform('');
      expect(waveform).toHaveLength(100);
    });
  });

  describe('getAudioDuration', () => {
    it('should return duration from metadata', async () => {
      mockParseFile.mockResolvedValue({ format: { duration: 42.5 } });

      const duration = await getAudioDuration('/path/to/audio.mp3');
      expect(duration).toBe(42.5);
      expect(mockParseFile).toHaveBeenCalledWith('/path/to/audio.mp3');
    });

    it('should return 0 when duration is missing', async () => {
      mockParseFile.mockResolvedValue({ format: {} });

      const duration = await getAudioDuration('/path/to/audio.mp3');
      expect(duration).toBe(0);
    });

    it('should return 0 on parse error', async () => {
      mockParseFile.mockRejectedValue(new Error('Cannot read file'));

      const duration = await getAudioDuration('/nonexistent.mp3');
      expect(duration).toBe(0);
    });
  });

  describe('generateWaveformFromFile', () => {
    it('should return placeholder waveform and duration', async () => {
      mockParseFile.mockResolvedValue({ format: { duration: 30.0 } });

      const result = await generateWaveformFromFile('/path/to/audio.mp3');
      expect(result.duration).toBe(30.0);
      expect(result.waveform).toHaveLength(100);
      expect(result.waveform[0]).toBeGreaterThan(0);
    });

    it('should return 0 duration on error', async () => {
      mockParseFile.mockRejectedValue(new Error('fail'));

      const result = await generateWaveformFromFile('/bad.mp3');
      expect(result.duration).toBe(0);
      expect(result.waveform).toHaveLength(100);
    });
  });
});
