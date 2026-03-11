import { getAudioDurationFromBlob } from './audio';

describe('getAudioDurationFromBlob', () => {
  const mockClose = jest.fn().mockResolvedValue(undefined);
  const mockDecodeAudioData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).AudioContext = jest.fn().mockImplementation(() => ({
      decodeAudioData: mockDecodeAudioData,
      close: mockClose,
    }));
  });

  it('should return duration from decoded audio', async () => {
    mockDecodeAudioData.mockResolvedValue({ duration: 42.5 });
    const blob = new Blob(['audio'], { type: 'audio/mp3' });
    blob.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
    const duration = await getAudioDurationFromBlob(blob);
    expect(duration).toBe(42.5);
    expect(mockClose).toHaveBeenCalled();
  });

  it('should return 0 on decode error', async () => {
    mockDecodeAudioData.mockRejectedValue(new Error('bad audio'));
    const blob = new Blob(['bad'], { type: 'audio/mp3' });
    blob.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
    const duration = await getAudioDurationFromBlob(blob);
    expect(duration).toBe(0);
  });
});
