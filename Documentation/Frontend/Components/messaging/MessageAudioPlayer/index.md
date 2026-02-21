# MessageAudioPlayer

**File:** `src/components/MessageAudioPlayer/MessageAudioPlayer.tsx`

Renders an audio message bubble with SVG waveform visualisation, play/pause control, elapsed/total time display, and real-time listening status reporting via Socket.io callbacks.

## Exported Types

```typescript
export interface MessageAudioPlayerProps {
  audioUrl:          string;
  duration:          number;
  waveformData:      number[];
  timestamp:         Date;
  isSent:            boolean;
  messageId?:        string;
  senderId?:         string;
  onPlayStatusChange?: (messageId: string, senderId: string, isPlaying: boolean, isEnded?: boolean) => void;
  status?:           'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isListening?:      boolean;
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `audioUrl` | `string` | Path or URL to the audio file |
| `duration` | `number` | Duration in seconds — used before audio metadata loads |
| `waveformData` | `number[]` | Array of 100 amplitude values in range `[0..1]` |
| `timestamp` | `Date` | Message creation time shown inside the player |
| `isSent` | `boolean` | `true` for sent messages (right-aligned); `false` for received (left-aligned) |
| `messageId` | `string` | Passed through to `onPlayStatusChange` |
| `senderId` | `string` | Passed through to `onPlayStatusChange` |
| `onPlayStatusChange` | `function` | Called with `(messageId, senderId, isPlaying, isEnded)` when play state changes |
| `status` | `string` | Delivery status — rendered as text label below the player |
| `isListening` | `boolean` | When `true`, shows a pulsing indicator that the recipient is currently listening |

## Waveform Rendering

- Rendered as an SVG element with 100 vertical bars
- Bar heights correspond to amplitude values in `waveformData`
- A lighter coloured fill tracks the current playback position
- Bars stretch to fill the full fixed width of the player
- While waveform data is being computed (post-upload), a generated placeholder pattern is shown

## Status Display

The `status` prop is shown as a text label below the player on sent messages:

| Value | Label |
|-------|-------|
| `sent` | Sent |
| `delivered` | Delivered |
| `listening` | Listening... |
| `listened` | Listened |
| `read` | Read |

## Usage

```tsx
<MessageAudioPlayer
  audioUrl="/uploads/audio/voice-abc123.webm"
  duration={12.4}
  waveformData={[0.1, 0.4, 0.8, 0.6, ...]}
  timestamp={new Date()}
  isSent={true}
  messageId="uuid"
  senderId="uuid"
  status="delivered"
  onPlayStatusChange={(id, sender, playing, ended) => {
    if (playing) emitListening(id, sender);
    if (ended)   emitListened(id, sender);
  }}
/>
```

