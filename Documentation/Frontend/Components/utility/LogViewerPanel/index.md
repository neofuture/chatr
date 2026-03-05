# LogViewerPanel

**File:** `src/components/LogViewerPanel/LogViewerPanel.tsx`

Real-time WebSocket event log viewer. Displays a colour-coded, auto-scrolling stream of all socket events (sent, received, info, error). Accessible from the Settings page via a "View Logs" button.

## Usage

```tsx
// Opened via the panel system from Settings
openPanel('logs', <LogViewerPanel />, 'Event Logs', 'right');
```

No props — reads from `LogContext` and `ThemeContext`.

## Log Entry Types

| Type | Icon | Colour | Meaning |
|------|------|--------|---------|
| `sent` | ↑ | Blue | Message or event emitted by this client |
| `received` | ↓ | Green | Event received from the server |
| `info` | ℹ | Grey | Informational lifecycle event |
| `error` | ⚠ | Red | WebSocket or application error |

## Controls

- **Clear**: empties the log buffer
- **Copy**: copies the full log as plain text to the clipboard

## Auto-scroll

Automatically scrolls to the newest entry as new logs arrive.

## LogContext

The `LogProvider` (in `src/contexts/LogContext.tsx`) wraps the entire app. Any code can call `addLog(type, event, data)` to append an entry.

## Storybook

`Utility/LogViewerPanel` — Default story (empty log, interact via the app to populate).

