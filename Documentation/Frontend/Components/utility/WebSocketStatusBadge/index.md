# WebSocketStatusBadge *(deprecated)*

> ⚠️ **Removed** — The `WebSocketStatusBadge` floating overlay has been removed from the application. Connection and presence status is now handled by the Test Lab (`/app/test`) which uses `useConversation` and displays live presence per user. This file is kept for historical reference only.

A draggable developer badge that showed WebSocket connection status and a live log of all Socket.io events. For development and testing only.

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
