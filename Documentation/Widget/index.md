# Chatr Embeddable Widget

A drop-in chat widget that connects website visitors to a Chatr support agent via WebSocket.

## Overview

The widget is a self-contained vanilla JavaScript IIFE (~37 kB minified, ~12 kB gzipped) that injects a floating chat button and panel into any webpage. It supports:

- Real-time text, file, image, video, and audio messaging
- Code block syntax highlighting with copy-to-clipboard
- Collapsible long messages ("Read more")
- Dark/light/auto theme support
- Session persistence (24h TTL) via localStorage
- Audio waveform visualization (Canvas API)
- External SVG icons loaded on demand

## Directory Structure

```
widget-src/                     # Source (not publicly served)
├── chatr.js                    # Full widget source (~75 kB)
├── build.js                    # Build script (Terser + string shortening)
├── jest.config.js              # Widget test config
└── __tests__/
    └── widget.test.js          # 54 unit + build pipeline tests

widget/                         # Output (served at /widget/)
├── chatr.js                    # Minified widget (~37 kB, ~12 kB gz)
└── icons/                      # SVG icons
    ├── chat.svg                # Chat bubble (UI)
    ├── send.svg                # Send button (UI)
    ├── attach.svg              # Paperclip (UI)
    ├── play.svg                # Play button (UI)
    ├── pause.svg               # Pause button (UI)
    ├── file.svg                # Generic file type
    ├── img.svg                 # Image file type
    ├── audio.svg               # Audio file type
    ├── video.svg               # Video file type
    ├── pdf.svg                 # PDF file type
    ├── doc.svg                 # Word document type
    ├── xls.svg                 # Spreadsheet type
    └── zip.svg                 # Archive type
```

## Embedding

### Simplest — data attributes on the script tag

```html
<script
  src="https://api.chatr-app.online/widget/chatr.js"
  data-accent-color="#f97316"
  data-title="Support Chat"
  data-greeting="Hi there! How can we help?"
></script>
```

### Alternative — config object

```html
<script>
  window.ChatrWidgetConfig = {
    apiUrl: 'https://api.chatr-app.online',
    accentColor: '#f97316',
    accentColor2: '#e85d04',
    title: 'Support Chat',
    greeting: 'Hi there! How can we help you today?',
    theme: 'auto',
    devMode: false,
  };
</script>
<script src="https://api.chatr-app.online/widget/chatr.js"></script>
```

### Config options

| Option | Data attribute | Default | Description |
|--------|---------------|---------|-------------|
| `apiUrl` | — | Auto-detected from script src | Backend API base URL |
| `accentColor` | `data-accent-color` | `#f97316` | Primary brand colour |
| `accentColor2` | `data-accent-color-2` | Auto-derived | Secondary gradient colour |
| `title` | `data-title` | `Support Chat` | Chat panel header title |
| `greeting` | `data-greeting` | `Hi there...` | Welcome message text |
| `theme` | `data-theme` | `auto` | `dark`, `light`, or `auto` |
| `devMode` | — | `false` | Clears session on every load (for testing) |

**Priority:** `ChatrWidgetConfig` > `data-*` attribute > built-in default

## Build Pipeline

### Commands

```bash
npm run widget:build    # One-off build
npm run widget:watch    # Watch mode (also started by dev.sh)
```

### Build process

1. **Source** (`widget-src/chatr.js`) is read
2. **DOM aliases** injected — `document.createElement` → `_$ce`, etc.
3. **Terser** minifies with 3 compression passes, toplevel mangling
4. **String shortening** — internal CSS class names, custom properties, and data attributes are replaced with short tokens via `REPLACE_MAP`
5. **Banner** prepended with version and copyright
6. **Output** written to `widget/chatr.js`

### What gets shortened

| Category | Example | Shortened |
|----------|---------|-----------|
| CSS classes | `chatr-msg-bubble` | `_Mb` |
| CSS IDs | `chatr-w-send` | `_Se` |
| Custom properties | `--cw-shadow` | `--m` |
| Data attributes | `data-msg-id` | `data-mi` |

**Preserved** (externally referenced): `chatr-widget-btn`, `chatr-widget-panel`, `chatr-app`, all `data-accent-*` and `data-theme` attributes, all `ChatrWidgetConfig` property names.

## Icon System

UI icons (chat, send, attach, play, pause) use CSS `mask-image` for dynamic colouring:

```css
.chatr-ico {
  display: inline-block;
  background: currentColor;
  mask-image: url(/widget/icons/chat.svg);
  mask-size: contain;
}
```

File type icons (file, img, audio, video, pdf, doc, xls, zip) are coloured SVGs with baked-in MIME type labels, loaded as `<img>` elements.

The widget has **no dependency on Font Awesome** — all icons are either external SVGs or Unicode characters.

## Widget API Routes

All widget API routes are defined in `backend/src/routes/widget.ts`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/widget/guest-session` | No | Create/resume a guest session |
| GET | `/api/widget/history` | JWT | Fetch chat history |
| POST | `/api/widget/upload` | JWT | Upload file attachment (50MB limit) |
| POST | `/api/widget/end-chat` | JWT | End the chat session |
| GET | `/api/widget/support-agent` | No | Get support agent info |

File uploads use the same MIME type whitelist as the main app (images, audio, video, documents, archives).

## Session Lifecycle

```
[Visitor loads page]
     │
     ▼
[Check localStorage for existing session]
     │
     ├── Found + valid → Resume chat (reconnect WebSocket)
     │
     └── Not found → Show intro form (name + first message)
                          │
                          ▼
                    POST /api/widget/guest-session
                          │
                          ▼
                    Connect Socket.io with JWT
                          │
                          ▼
                    [Chat active — messages via WebSocket]
                          │
                          ▼
                    [End Chat] → POST /api/widget/end-chat
                          │
                          ▼
                    Clear localStorage → Show intro form
```

Sessions expire after 24 hours. In `devMode`, sessions use `sessionStorage` instead and are cleared on every widget load.

## Testing

54 tests in `widget-src/__tests__/widget.test.js`:

- **Source sync checks** — verify test implementations match widget source signatures
- **Pure function tests** — `escHtml`, `firstName`, `formatFileSize`, `formatTime`, `fmtSecs`, `hexToHsl`, `hslToHex`, `deriveAccent2`, `tokeniseCode`, `parseCodeBlocks`, `normaliseMsg`
- **Build pipeline tests** — output size, Font Awesome removal, class name shortening, gzip budget, SVG icons

```bash
npm run test:widget
```

## Demo Page

The Next.js app includes a widget demo at `/widget-demo` (`frontend/src/app/widget-demo/page.tsx`). The embed snippet dynamically uses the current API URL so it works in both local development and production.
