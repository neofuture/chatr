# WebSocketStatusBadge

**File:** `src/components/WebSocketStatusBadge/WebSocketStatusBadge.tsx`

A draggable developer badge that shows WebSocket connection status and a live log of all Socket.io events. For development and testing only.

## Props

None. Reads from `WebSocketContext` and `ThemeContext`.

## Features

- Draggable — position saved to `localStorage`
- Collapsed: shows colour-coded connection dot
- Expanded: shows scrollable live event log with sent/received entries
- Logs all Socket.io events with timestamp and payload
- Position persists across page refreshes

## Internal Types

```typescript
interface MessageLog {
  type:      'sent' | 'received';
  event:     string;
  data:      any;
  timestamp: Date;
}
```

## Usage

```tsx
// Render conditionally in dev mode
{process.env.NODE_ENV === 'development' && <WebSocketStatusBadge />}
```

