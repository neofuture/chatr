# ConversationView

**File:** `src/components/messaging/ConversationView/ConversationView.tsx`

Composite component that combines `ChatView` (scrollable message list) and `MessageInput` (footer input bar) with a `Lightbox` overlay into a complete conversation panel. Manages its own WebSocket event listeners via `useConversationView`.

## Props

```typescript
export interface ConversationViewProps {
  recipientId: string;
  isDark: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `recipientId` | `string` | The other party's user ID |
| `isDark` | `boolean` | Dark/light theme flag |

## Composition

```
ConversationView
├── ChatView              ← scrollable message list
│   ├── MessageBubble[]   ← individual messages
│   ├── TypingIndicator   ← animated dots when recipient types
│   └── RecordingIndicator← pulsing mic when recipient records
├── MessageInput          ← footer input bar
│   ├── EmojiPicker
│   └── VoiceRecorder
└── Lightbox              ← full-screen image viewer
```

## Logic Hook

All state and WebSocket subscriptions are in `src/hooks/useConversationView.ts`:

- Loads message history from the REST API on mount
- Listens for `message:received`, `message:edited`, `message:unsent`, `message:reaction`
- Listens for `typing:start/stop` and `recording:start/stop`
- Scrolls to bottom on new messages

## Storybook

`Messaging/ConversationView` — Default, LightTheme stories.

