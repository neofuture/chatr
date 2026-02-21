# VoiceRecorder

**File:** `src/components/VoiceRecorder/VoiceRecorder.tsx`

A microphone trigger button that opens a full-screen recording modal. Captures audio via the Web Audio API and generates a live waveform visualisation while recording. On completion, returns the audio `Blob` and the captured waveform data.

## Props

```typescript
interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, waveformData: number[]) => void;
  onRecordingStart?:   () => void;
  onRecordingStop?:    () => void;
  disabled?:           boolean;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onRecordingComplete` | `function` | required | Called with `(blob, waveformData)` when the user taps Stop & Send |
| `onRecordingStart` | `function` | — | Called after mic initialisation succeeds and recording begins |
| `onRecordingStop` | `function` | — | Called when recording ends for any reason (send or cancel) |
| `disabled` | `boolean` | `false` | Disables the microphone trigger button |

## Recording Flow

```
1. User taps microphone button
   └─ Modal opens

2. getUserMedia({ audio: true }) called
   └─ On permission denied → shows error state
   └─ Initialisation beep plays (~500ms)

3. MediaRecorder.start()
   └─ onRecordingStart() called
   └─ AnalyserNode samples at ~60fps → waveformData[] grows left to right
   └─ Timer increments in UI

4a. User taps Stop & Send
    └─ MediaRecorder.stop()
    └─ Blob assembled from chunks
    └─ onRecordingComplete(blob, waveformData) called
    └─ Modal closes

4b. User taps Cancel
    └─ Recording discarded
    └─ onRecordingStop() called
    └─ Modal closes, nothing sent
```

## Audio Format

| Browser | Format |
|---------|--------|
| Chrome / Edge | WebM / Opus |
| Safari | MP4 / AAC |

## Waveform Data

`waveformData` is an array of RMS amplitude values sampled during recording, normalised to `[0..1]`. This array is passed directly to `MessageAudioPlayer` after upload for accurate waveform display.

## Usage

```tsx
<VoiceRecorder
  onRecordingComplete={async (blob, waveform) => {
    socket.emit('recording:stop', { recipientId });
    const messageId = await uploadAudio(blob);
    await patchWaveform(messageId, waveform);
  }}
  onRecordingStart={() => {
    socket.emit('recording:start', { recipientId });
  }}
  onRecordingStop={() => {
    socket.emit('recording:stop', { recipientId });
  }}
/>
```

