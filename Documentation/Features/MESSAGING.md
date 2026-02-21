# Messaging

## Message Types

| Type | Description | Storage Path |
|------|-------------|--------------|
| `text` | Plain text content | — |
| `image` | JPEG, PNG, GIF, WebP | `/uploads/messages/` |
| `file` | Any document/binary | `/uploads/messages/` |
| `audio` | MP3 or uploaded audio | `/uploads/audio/` |
| `voice` | WebM/Opus browser recording | `/uploads/audio/` |

---

## Message Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> sent : created in DB
    sent --> delivered : recipient online
    delivered --> read : read emitted
    delivered --> listening : listening start
    listening --> listened : playback ended
    read --> [*]
    listened --> [*]
```

| Status | Trigger | Message Types |
|--------|---------|---------------|
| `sent` | Message saved to DB | All |
| `delivered` | Recipient socket online and acknowledged | All |
| `read` | Recipient explicitly marks as read | text, image, file |
| `listening` | Recipient starts playback | audio, voice |
| `listened` | Recipient finishes playback (100%) | audio, voice |

Status is displayed below the sender's last consecutive message bubble.

---

## Direct Messaging Flow

```mermaid
sequenceDiagram
    participant S as Sender
    participant SV as Server
    participant R as Recipient

    S->>SV: "message:send { recipientId, content, type }"
    SV->>SV: prisma.message.create status=sent
    alt Recipient online
        SV-->>R: "message:received { id, content, status: delivered }"
        SV->>SV: update status = delivered
        SV-->>S: "message:sent { status: delivered }"
    else Recipient offline
        SV-->>S: "message:sent { status: sent }"
    end

    R->>SV: message:read "messageId"
    SV->>SV: update status = read, readAt = now
    SV-->>S: "message:status { status: read }"
```

---

## File & Audio Upload Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as REST API
    participant DB as Database
    participant WS as Socket.io
    participant R as Recipient

    C->>API: POST /api/messages/upload (multipart/form-data)
    Note over API: Multer middleware
    API->>API: Save file to /uploads/ or S3
    API->>DB: "prisma.message.create { fileUrl, type, senderId, recipientId }"
    API-->>C: "{ messageId, fileUrl, needsWaveformGeneration: true }"
    C->>WS: "message:send { messageId, recipientId, content: filename }"
    WS-->>R: "message:received { fileUrl, type }"
    Note over C,API: Audio/Voice only — waveform extraction
    C->>C: OfflineAudioContext.decodeAudioData(blob)
    C->>C: Extract 100-bar RMS waveform array
    C->>API: "PATCH /api/messages/:id/waveform { waveform[], duration }"
    API->>DB: update audioWaveform, audioDuration
    API->>WS: emit audio:waveform to sender + recipient rooms
```

---

## Voice Recording

Voice messages are recorded in the browser using the `MediaRecorder` API.

**Codec selection:**
- Chrome/Edge: WebM/Opus
- Safari: MP4/AAC

```mermaid
flowchart TD
    A[User presses Record] --> B[navigator.mediaDevices.getUserMedia audio]
    B --> C[MediaRecorder.start]
    C --> D[socket.emit audio:recording isRecording=true]
    D --> E[AnalyserNode feeds real-time waveform bars]
    E --> F[User presses Stop]
    F --> G[MediaRecorder.stop]
    G --> H[ondataavailable chunks assembled into Blob]
    H --> I[socket.emit audio:recording isRecording=false]
    I --> J[POST /api/messages/upload type=voice]
    J --> K[OfflineAudioContext.decodeAudioData]
    K --> L[Extract 100-bar normalised RMS waveform]
    L --> M[PATCH /api/messages/:id/waveform]
```

**Real-time waveform** uses the Web Audio API `AnalyserNode`:
1. `audioContext.createAnalyser()` → `analyser.fftSize = 256`
2. `analyser.getByteTimeDomainData(dataArray)` at 60fps via `requestAnimationFrame`
3. RMS values normalised to `[0, 1]` and rendered as 40–60 live bars in the UI

---

## Audio Player

`MessageAudioPlayer` renders audio messages with a 100-bar SVG waveform.

**Waveform data flow:**
1. `audioWaveform` array (100 values, `0–1`) stored in DB
2. Fetched with message history
3. Rendered as SVG `<rect>` elements, height proportional to amplitude
4. Playback progress overlays bars with a brighter colour using `currentTime / duration`

**Listening status events:**
```
Play button pressed     → socket.emit('audio:listening', { isListening: true })
Pause button pressed    → socket.emit('audio:listening', { isListening: false })
Audio ended (100%)      → socket.emit('audio:listening', { isEnded: true })
                          → server updates status = 'read' in DB
                          → server emits message:status to sender
```

---

## Ghost Typing

Ghost typing sends the sender's keystrokes in real-time to the recipient before the message is sent. The recipient sees the text appearing live in a ghost bubble above the input area.

```mermaid
sequenceDiagram
    participant S as Sender
    participant SV as Server
    participant R as Recipient

    S->>SV: "ghost:typing { recipientId, text: Hello }"
    SV-->>R: "ghost:typing { userId, username, text: Hello }"
    S->>SV: "ghost:typing { recipientId, text: Hello wor }"
    SV-->>R: "ghost:typing { text: Hello wor }"
    S->>SV: "message:send { content: Hello world }"
    Note over R: Ghost text replaced by real message
```

---

## Typing Indicators

Standard typing indicator (no text content, just a visual "..." animation).

```
Client emits:  typing:start { recipientId }
Server emits:  typing:status { userId, isTyping: true, type: "direct" }

Client emits:  typing:stop { recipientId }
Server emits:  typing:status { userId, isTyping: false, type: "direct" }
```

Also supports group typing with `groupId` instead of `recipientId`.

---

## Presence System

User presence is stored in-memory on the server in two Maps:

```typescript
userPresence: Map<userId, { userId, socketId, status, lastSeen }>
userSockets:  Map<userId, socketId>
```

On connect: status set to `online`, broadcast to all.
On disconnect: status set to `offline`, `lastSeen` updated in DB.

```mermaid
flowchart LR
    A[User connects] --> B[userPresence.set online]
    B --> C[broadcast user:status online to all]
    C --> D[emit presence:update to self]

    E[User disconnects] --> F[userPresence.set offline]
    F --> G[broadcast user:status offline to all]
    G --> H[prisma.user.update lastSeen=now]
```

Clients can request presence for specific users:
```
client → presence:request [userId1, userId2]
server → presence:response [{ userId, status, lastSeen }]
```

> ⚠️ The in-memory presence Maps are per-process. In a multi-instance deployment this should be moved to Redis.
