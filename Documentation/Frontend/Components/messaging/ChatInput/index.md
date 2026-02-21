# ChatInput

**File:** `src/components/ChatInput/ChatInput.tsx`

A text composition bar for sending direct messages. Automatically emits typing indicators via Socket.io and auto-resizes the textarea to fit content.

## Props

```typescript
interface ChatInputProps {
  recipientId:    string;
  onMessageSent?: () => void;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `recipientId` | `string` | Target user UUID — used for `typing:start/stop` events and `message:send` |
| `onMessageSent` | `function` | Optional callback invoked after a message is successfully sent |

## Behaviour

- Auto-resizes textarea height as the user types
- Emits `typing:start` on first keystroke
- Emits `typing:stop` automatically after 3 seconds of inactivity
- Emits `typing:stop` when the input is cleared
- Sends on Enter key (without Shift) or clicking the send button
- Disabled when WebSocket is not connected

## Socket.io Events Emitted

| Event | Payload | When |
|-------|---------|------|
| `typing:start` | `{ recipientId }` | First keystroke |
| `typing:stop` | `{ recipientId }` | 3s inactivity or input cleared |
| `message:send` | `{ recipientId, content, type: 'text' }` | On send |

## Usage

```tsx
<ChatInput
  recipientId={selectedUserId}
  onMessageSent={() => scrollToBottom()}
/>
```

