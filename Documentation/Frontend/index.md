# Frontend Overview

## Structure

The frontend is a Next.js 15 application using the App Router. All authenticated pages live under `/app/app/` and are wrapped by `AppLayout` which enforces authentication.

```
src/
├── app/
│   ├── layout.tsx              # Root layout (providers)
│   ├── page.tsx                # Landing page (login/register)
│   └── app/
│       ├── layout.tsx          # AppLayout — auth guard
│       ├── template.tsx        # Page transition animation
│       ├── test/page.tsx       # Developer test lab
│       └── docs/page.tsx       # Documentation viewer
│
├── components/
│   ├── form-controls/          # Input, Button, Select, Checkbox, etc.
│   ├── dialogs/                # Modal, BottomSheet, ConfirmationDialog
│   ├── image-manip/            # ProfileImageUploader, CoverImageUploader
│   ├── panels/                 # PanelContainer, AuthPanel
│   ├── MessageBubble/          # Message rendering component
│   ├── MessageAudioPlayer/     # Audio player with waveform
│   ├── VoiceRecorder/          # Recording modal with live waveform
│   ├── Lightbox/               # Full-screen image viewer
│   ├── AppLayout/              # Auth guard wrapper
│   ├── MobileLayout/           # Mobile-specific auth wrapper
│   ├── ToastContainer/         # Notification system
│   ├── ThemeToggle/            # Light/dark mode switch
│   └── Logo/                   # Brand logo
│
├── contexts/
│   ├── WebSocketContext.tsx    # Socket.io connection, event bus
│   ├── ThemeContext.tsx        # Light/dark theme state
│   └── ToastContext.tsx        # Toast notification state
│
├── lib/
│   └── authUtils.ts            # Token storage, auth helpers
│
└── utils/
    └── extractWaveform.ts      # Client-side audio waveform analysis
```

## Contexts

### WebSocketContext
Manages the Socket.io connection lifecycle. Provides:
- `socket` — the Socket.io instance
- `connected` — boolean connection state
- `connecting` — boolean pending state

Automatically reconnects on token change. Exposes the socket instance to all components via `useWebSocket()`.

### ThemeContext
Persists light/dark preference to `localStorage`. Provides `theme` and `toggleTheme`.

### ToastContext
Queue-based notification system. Provides `showToast(message, type)` where type is `success | error | warning | info`.

## Authentication Guard

`AppLayout` reads `token` and `user` from `localStorage` on mount. If either is missing or the user JSON is invalid, the user is redirected to `/` (landing page). Profile images are loaded from the stored user object.

## Key Components

### MessageBubble
Renders a single message. Handles all types: text, image, file, audio, voice. Shows sender avatar, timestamp, and delivery status. Groups consecutive messages visually.

Props:
- `message` — Message object
- `isOwn` — whether the message belongs to the current user
- `onImageClick` — callback for lightbox
- `showAvatar` — grouping control

### MessageAudioPlayer
Renders an audio message with waveform visualisation. Handles:
- Loading audio from URL
- Play/pause state
- Position tracking and animated scrub on waveform
- Emitting `audio:listening` and `audio:listened` events
- Displaying `listening` / `listened` status

### VoiceRecorder
A modal that activates the microphone and renders a live waveform while recording. On stop, assembles a Blob and hands it to the parent for upload. Emits `recording:start` / `recording:stop` Socket.io events.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | REST API base URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL |
| `NEXT_PUBLIC_PRODUCT_NAME` | App display name |

These are set at build time. In production they are written to `frontend/.env.production` by the deploy script.

## Versioning

The current app version is stored in `src/version.ts` and auto-incremented by `scripts/increment-version.js` on every commit via a git pre-commit hook.

## Theme System

CSS custom properties are applied to `:root` based on the active theme. Components read the theme from `ThemeContext` and apply inline styles or CSS module overrides accordingly. Dark mode background is `#0f172a`, light mode is `#f8fafc`.

