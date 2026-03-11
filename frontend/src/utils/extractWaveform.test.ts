import { extractWaveformFromFile } from './extractWaveform';

describe('extractWaveformFromFile', () => {
  const mockClose = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    const channelData = new Float32Array(1000);
    for (let i = 0; i < 1000; i++) channelData[i] = Math.sin(i / 10) * 0.5;

    (global as any).AudioContext = jest.fn().mockImplementation(() => ({
      decodeAudioData: jest.fn().mockResolvedValue({
        duration: 10.0,
        getChannelData: () => channelData,
        numberOfChannels: 1,
      }),
      close: mockClose,
    }));
  });

  it('should return 100-bar waveform and duration', async () => {
    const file = new File(['audio data'], 'test.mp3', { type: 'audio/mp3' });
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
    const result = await extractWaveformFromFile(file);
    expect(result.waveform).toHaveLength(100);
    expect(result.duration).toBe(10.0);
    expect(mockClose).toHaveBeenCalled();
  });

  it('should have waveform values between 0 and 1', async () => {
    const file = new File(['audio data'], 'test.mp3', { type: 'audio/mp3' });
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
    const result = await extractWaveformFromFile(file);
    for (const v of result.waveform) {
      expect(v).toBeGreaterThanOrEqual(0.04);
      expect(v).toBeLessThan(1.0);
    }
  });

  it('should handle silent audio', async () => {
    (global as any).AudioContext = jest.fn().mockImplementation(() => ({
      decodeAudioData: jest.fn().mockResolvedValue({
        duration: 5.0,
        getChannelData: () => new Float32Array(1000),
        numberOfChannels: 1,
      }),
      close: mockClose,
    }));
    const file = new File(['silent'], 'silent.mp3', { type: 'audio/mp3' });
    file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
    const result = await extractWaveformFromFile(file);
    expect(result.waveform).toHaveLength(100);
    expect(result.duration).toBe(5.0);
  });
});
