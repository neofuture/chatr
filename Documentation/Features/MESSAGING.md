# Messaging

## Message Types

| Type | Description | File Storage |
|------|-------------|--------------|
| `text` | Plain text content | None |
| `image` | JPEG, PNG, GIF, WebP | `/uploads/images/` |
| `file` | Any document/binary | `/uploads/files/` |
| `audio` | MP3 or other audio files | `/uploads/audio/` |
| `voice` | WebM/Opus voice recording | `/uploads/audio/` |

## Message Status Lifecycle

### Text, Image, File
```
sent → delivered → read
```

### Audio, Voice
```
sent → delivered → listening → listened
```

| Status | Trigger |
|--------|---------|
| `sent` | Message created in DB |
| `delivered` | Recipient's socket acknowledges via `message:delivered` |
| `listening` | Recipient emits `audio:listening` |
| `listened` | Recipient emits `audio:listened` (≥ 95% playback) |

Status is displayed below the message bubble on the sender's view.

## Direct Messaging Flow

```
Sender emits: message:send { recipientId, content, type }
     │
     ▼
handlers.ts
  └─ Save Message to DB (status: "sent")
  └─ Emit message:received → room user:{recipientId}
  └─ Emit message:status { messageId, status: "sent" } → room user:{senderId}

Recipient receives: message:received
  └─ Displays message in UI
  └─ Emits message:delivered { messageId, senderId }

Server handles message:delivered
  └─ Update Message.status = "delivered" in DB
  └─ Emit message:status { status: "delivered" } → room user:{senderId}
```

## File & Audio Upload Flow

```
1. Client POST /api/messages/upload (multipart/form-data)
   └─ Multer saves file to disk / S3
   └─ Message created in DB with fileUrl, fileName, fileSize, fileType
   └─ Server emits message:received to recipient via Socket.io
   └─ Response includes { messageId, needsWaveformGeneration }

2. [Audio/Voice only] Client decodes audio via OfflineAudioContext
   └─ Extracts 100-bar RMS waveform
   └─ PATCH /api/messages/:id/waveform { waveform, duration }
   └─ Server updates DB
   └─ Server emits audio:waveform to both sender and recipient
```

## Voice Recording

Voice messages are recorded in the browser using the `MediaRecorder` API with WebM/Opus codec (Chrome) or MP4/AAC (Safari). The recording flow:

```
User taps Record
  └─ getUserMedia({ audio: true })
  └─ MediaRecorder starts
  └─ Emits recording:start → server → recipient sees recording indicator
  └─ Audio chunks accumulated in memory
  └─ Waveform visualised in real-time via AnalyserNode (Web Audio API)

User taps Stop & Send
  └─ MediaRecorder.stop()
  └─ Blob assembled from chunks
  └─ Emits recording:stop → server → recipient indicator cleared
  └─ POST /api/messages/upload with type=voice
  └─ Client decodes Blob via OfflineAudioContext
  └─ PATCH /api/messages/:id/waveform with real waveform data
```

## Audio Player

The `MessageAudioPlayer` component renders audio messages with:

- Waveform visualisation (100 bars, SVG)
- Play/pause toggle
- Elapsed time display
- Total duration display
- Animated playback position on waveform
- Listening/Listened status reporting via Socket.io

Waveform data is stored as a `Json` array in the `Message.audioWaveform` field. While waveform analysis is pending (immediately after upload), a deterministic placeholder pattern is shown.

## Typing Indicators

Typing indicators are emitted via Socket.io and auto-expire:

- Client emits `typing:start` on first keystroke
- Client emits `typing:stop` when input is cleared or after 3 seconds of inactivity
- Server forwards to `user:{recipientId}` room
- Recipient UI shows animated dots under the message list

## Message Grouping

Consecutive messages from the same sender within a 5-minute window are visually grouped — only the first shows the avatar/timestamp, subsequent messages are indented.

## Ghost Typing Mode

A developer feature (test lab only) that simulates the recipient typing pre-defined phrases to test the typing indicator UI without a second client.

