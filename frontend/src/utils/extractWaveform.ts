const WAVEFORM_BARS = 100;

/**
 * Decode an audio file (MP3, WebM, WAV, M4A etc.) using the browser's
 * OfflineAudioContext and extract a 100-bar RMS waveform.
 */
export async function extractWaveformFromFile(file: File): Promise<{ waveform: number[]; duration: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0); // first channel
    const totalSamples = channelData.length;
    const duration = audioBuffer.duration;

    const waveform: number[] = [];

    for (let i = 0; i < WAVEFORM_BARS; i++) {
      const start = Math.floor((i / WAVEFORM_BARS) * totalSamples);
      const end = Math.floor(((i + 1) / WAVEFORM_BARS) * totalSamples);

      // RMS energy per bar
      let sumSquares = 0;
      const count = end - start;
      for (let j = start; j < end; j++) {
        sumSquares += channelData[j] * channelData[j];
      }
      const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
      waveform.push(rms);
    }

    // Normalise to peak
    const peak = Math.max(...waveform);
    if (peak === 0) return { waveform: Array(WAVEFORM_BARS).fill(0.05), duration };

    // sqrt curve boosts quiet parts for visual variety
    const scaled = waveform.map(v => 0.04 + Math.pow(v / peak, 0.5) * 0.91);

    return { waveform: scaled, duration };
  } finally {
    audioContext.close();
  }
}

