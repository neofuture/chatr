# File Upload

## Overview

File, image, and audio uploads are handled by the `file-upload.ts` route, mounted at `POST /api/messages/upload`. It uses [Multer](https://github.com/expressjs/multer) for multipart form parsing and disk storage.

---

## Upload Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant M as Multer middleware
    participant R as Route handler
    participant DB as PostgreSQL
    participant WS as Socket.io
    participant RCP as Recipient

    C->>M: POST /api/messages/upload (multipart/form-data)
    M->>M: Validate MIME type (allowedMimes list)
    M->>M: Validate file size (max 10MB)
    M->>M: Save to /uploads/audio/ or /uploads/messages/
    M->>R: req.file populated
    R->>R: Build fileUrl = BACKEND_URL/uploads/{subfolder}/{filename}
    alt Audio file with no waveform provided
        R->>R: generatePlaceholderWaveform(filename)
        R->>R: needsWaveformGeneration = true
    end
    R->>DB: prisma.message.create { fileUrl, type, waveform... }
    R-->>C: { messageId, fileUrl, waveform, needsWaveformGeneration }
    Note over C: Client now emits message:send via Socket.io
    C->>WS: message:send { messageId, recipientId }
    WS-->>RCP: message:received { fileUrl, type, waveform }
    alt needsWaveformGeneration = true
        Note over R: setImmediate async — non-blocking
        R->>R: generateWaveformFromFile (reads metadata only)
        R->>DB: update audioWaveform, audioDuration
        R->>WS: emit audio:waveform to sender + recipient
    end
```

---

## Storage Layout

```
backend/uploads/
├── messages/    # Images and document files
│   └── {originalName}-{timestamp}-{random}{ext}
└── audio/       # Audio and voice messages
    └── {originalName}-{timestamp}-{random}{ext}
```

Directories are created automatically on server start if they don't exist.

---

## Multer Configuration

### Storage

`multer.diskStorage` — files are written directly to disk.

**Destination:** determined by MIME type:
- `audio/*` → `uploads/audio/`
- everything else → `uploads/messages/`

**Filename:** `{originalName}-{Date.now()}-{random9digits}{ext}`  
Prevents collisions and preserves the original extension.

### File Size Limit

**10 MB** per upload. Returns `400` if exceeded.

### Allowed MIME Types

| Category | Types |
|----------|-------|
| Images | `image/jpeg`, `image/png`, `image/gif`, `image/webp` |
| Audio | `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/x-m4a` |
| Documents | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain` |

Unrecognised MIME types are rejected with `400`.

---

## Request Format

`Content-Type: multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The file to upload |
| `recipientId` | String | Yes | Target user UUID |
| `type` | String | No | `image`, `file`, or `audio` — used for non-audio type classification |
| `waveform` | String (JSON) | No | Pre-computed waveform array (from VoiceRecorder) |

---

## Response

```json
{
  "success": true,
  "messageId": "uuid",
  "fileUrl": "https://api.chatr-app.online/uploads/audio/voice-1740123456-987654321.webm",
  "fileName": "voice.webm",
  "fileSize": 48200,
  "fileType": "audio/webm",
  "waveform": [0.08, 0.12, 0.20, ...],
  "needsWaveformGeneration": true
}
```

`needsWaveformGeneration: true` tells the client it should decode the audio client-side and call `PATCH /api/messages/:id/waveform` with the real waveform data.

---

## Waveform Strategy

```mermaid
flowchart TD
    A{Was waveform\nprovided in request?} -- Yes --> B[Use provided waveform\nfrom VoiceRecorder]
    A -- No --> C{Is it audio?}
    C -- No --> D[No waveform needed]
    C -- Yes --> E[generatePlaceholderWaveform\ninstant response]
    E --> F[needsWaveformGeneration = true]
    F --> G[Client receives placeholder]
    G --> H[Client: OfflineAudioContext.decodeAudioData]
    H --> I[Client: PATCH /api/messages/:id/waveform]
    I --> J[Server: update DB + emit audio:waveform]
```

**VoiceRecorder uploads** (recorded in the browser) include a pre-computed waveform in the request — no further processing needed.

**MP3/audio file uploads** receive a deterministic placeholder waveform immediately, then the real waveform is generated asynchronously client-side.

---

## Static File Serving

Uploaded files are served statically from `/uploads`:

```
GET /uploads/audio/voice-1740123456.webm
GET /uploads/messages/photo-1740123457.jpg
```

CORS headers are set explicitly on the `/uploads` route to allow cross-origin image/audio loading in the browser:

```
Access-Control-Allow-Origin: {FRONTEND_URL}
Cross-Origin-Resource-Policy: cross-origin
```

---

## Error Handling

| Scenario | Response |
|----------|----------|
| No file in request | `400 No file uploaded` |
| Missing `recipientId` | `400 Recipient ID required` — file deleted from disk |
| Unauthenticated | `401 Unauthorized` — file deleted from disk |
| MIME type not allowed | `400` (Multer rejects before handler) |
| File too large | `400` (Multer rejects before handler) |
| Unexpected error | `500 File upload failed` — file deleted if it exists |

