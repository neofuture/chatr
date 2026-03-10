/**
 * Decode a Blob to get its exact audio duration in seconds.
 * Much more reliable than waveformData.length / 10 for long recordings.
 */
export async function getAudioDurationFromBlob(blob: Blob): Promise<number> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer.duration;
    } finally {
      audioContext.close();
    }
  } catch {
    return 0;
  }
}
