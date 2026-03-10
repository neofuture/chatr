# MessageInput

**File:** `src/components/messaging/MessageInput/MessageInput.tsx`

Full-featured chat input bar. Handles text entry, emoji insertion, multi-file attachments, voice recording, typing indicators, reply mode, and edit mode. Used as the footer component inside `ConversationView`.

## Props

```typescript
export interface MessageInputProps {
  isDark: boolean;
  recipientId: string;
  replyingTo?: Message | null;
  editingMessage?: Message | null;
  onMessageSent?: (msg: Message) => void;
  onEditSaved?: (messageId: string, newContent: string) => void;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  onEditLastSent?: () => void;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isDark` | `boolean` | required | Dark/light theme flag |
| `recipientId` | `string` | required | Target user ID for the conversation |
| `replyingTo` | `Message \| null` | `null` | When set, shows a reply-to banner above the input |
| `editingMessage` | `Message \| null` | `null` | When set, populates the input with the message content for editing |
| `onMessageSent` | `(msg) => void` | — | Called after a message is successfully sent |
| `onEditSaved` | `(id, content) => void` | — | Called after an edited message is saved |
| `onCancelReply` | `() => void` | — | Called when the reply banner is dismissed |
| `onCancelEdit` | `() => void` | — | Called when edit mode is cancelled |
| `onEditLastSent` | `() => void` | — | Triggered when the ↑ arrow key is pressed with an empty input — caller should enter edit mode on the last sent message |

## Features

### Text Entry
Auto-resizing text input. Press **Enter** to send (Shift+Enter for newline). Press **↑** with empty input to trigger `onEditLastSent`.

### Emoji Picker
Emoji button opens `EmojiPicker` overlay. Selected emoji is inserted at the cursor position.

### File Attachments
Paperclip button opens a file picker supporting: images, PDFs, Word docs, Excel sheets, PowerPoints, text files, videos (`video/mp4`, `video/quicktime`, `video/webm`), audio, and ZIP archives. Multiple files can be selected. The file size limit is 50MB. Each file shows a preview chip with a dismiss button.

Special file previews:
- **Images**: thumbnail preview
- **Video**: `<video>` thumbnail preview
- **Audio (MP3/WAV/OGG)**: waveform icon
- **PDF/ZIP/Other**: generic file icon

### Voice Recording
Microphone button opens `VoiceRecorder`. Completed recordings are attached as audio files.

### Typing Indicators
Emits `typing:start` via WebSocket on input; emits `typing:stop` after 3 seconds of inactivity.

### Reply Mode
When `replyingTo` is set, a reply banner is shown above the input. Cancelled via the × button or `onCancelReply`.

### Edit Mode
When `editingMessage` is set, the existing content is loaded into the input. On submit, `onEditSaved` is called with the message ID and new content.

## Logic Hook

All WebSocket + state logic is encapsulated in `src/hooks/useMessageInput.ts`.

## Storybook

`Messaging/MessageInput` — Default, InReplyMode, InEditMode, LightTheme stories.

