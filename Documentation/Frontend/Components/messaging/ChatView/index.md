# ChatView

**File:** `src/components/messaging/ChatView/ChatView.tsx`

Reusable message thread view. Renders a scrollable list of `MessageBubble` components with typing/recording indicators. Extracted from the Test Lab to be used in the main chat UI.

---

## Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `messages` | `Message[]` | ✅ | Messages to display |
| `isDark` | `boolean` | ✅ | Theme flag |
| `messagesEndRef` | `RefObject<HTMLDivElement>` | ✅ | Scroll-to-bottom anchor ref |
| `isRecipientTyping` | `boolean` | ✅ | Show typing indicator |
| `isRecipientRecording` | `boolean` | ✅ | Show recording indicator |
| `recipientGhostText` | `string` | ✅ | Live ghost typing text |
| `listeningMessageIds` | `Set<string>` | ✅ | IDs of audio messages currently playing |
| `onImageClick` | `(url, name) => void` | ✅ | Image bubble click handler (opens Lightbox) |
| `onAudioPlayStatusChange` | `(id, senderId, playing, ended?) => void` | ✅ | Audio play state callback |
| `showClearButton` | `boolean` | ❌ | Show a clear button in the header |
| `onClear` | `() => void` | ❌ | Clear handler |
| `queuedCount` | `number` | ❌ | Number of messages queued offline (shows badge) |

---

## Features

- Auto-scrolls to bottom when new messages arrive
- Shows typing indicator (animated dots) when `isRecipientTyping`
- Shows recording indicator when `isRecipientRecording`
- Shows ghost text preview when `recipientGhostText` is non-empty
- Shows offline queue badge when `queuedCount > 0`

---

## See Also

- [MessageBubble](../MessageBubble/index.md)
- [useConversation hook](../../Hooks/useConversation.md)
- [Test Lab](../test/index.md)

