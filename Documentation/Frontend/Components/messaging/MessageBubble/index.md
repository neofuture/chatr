# MessageBubble

**File:** `src/components/MessageBubble/MessageBubble.tsx`

Renders a complete message thread. Accepts an array of `Message` objects and displays them grouped by sender, with support for all message types, delivery status, typing indicators, and recording indicators.

## Exported Types

```typescript
export interface Message {
  id:            string;
  content:       string;
  senderId:      string;
  recipientId:   string;
  direction:     'sent' | 'received';
  status:        'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp:     Date;
  type?:         'text' | 'image' | 'file' | 'audio';
  fileUrl?:      string;
  fileName?:     string;
  fileSize?:     number;
  fileType?:     string;
  waveformData?: number[];
  duration?:     number;
}
```

## Props

```typescript
interface MessageBubbleProps {
  messages:                Message[];
  isRecipientTyping?:      boolean;
  isRecipientRecording?:   boolean;
  recipientGhostText?:     string;
  onImageClick?:           (imageUrl: string, imageName: string) => void;
  messagesEndRef?:         React.RefObject<HTMLDivElement | null>;
  onAudioPlayStatusChange?: (messageId: string, senderId: string, isPlaying: boolean, isEnded?: boolean) => void;
  listeningMessageIds?:    Set<string>;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `messages` | `Message[]` | required | Full list of messages to render |
| `isRecipientTyping` | `boolean` | `false` | Shows animated typing dots indicator |
| `isRecipientRecording` | `boolean` | `false` | Shows pulsing microphone indicator |
| `recipientGhostText` | `string` | `''` | Ghost text shown in recipient typing indicator (dev only) |
| `onImageClick` | `function` | — | Called with `(url, name)` when an image message is tapped — use to open Lightbox |
| `messagesEndRef` | `RefObject` | — | External ref for scroll-to-bottom anchor |
| `onAudioPlayStatusChange` | `function` | — | Called when audio play state changes — used to emit Socket.io listening events |
| `listeningMessageIds` | `Set<string>` | `new Set()` | IDs of messages the recipient is currently listening to |

## Message Grouping

Consecutive messages from the same sender within a 5-minute window are visually grouped. Only the first message in a group shows the sender avatar and timestamp. Subsequent messages are indented without metadata.

## Status Icons

| Status | Display |
|--------|---------|
| `queued` / `sending` | Clock icon |
| `sent` | Single tick |
| `delivered` | Double tick |
| `read` / `listened` | Blue filled double tick |
| `listening` | Pulsing ear icon |
| `failed` | Red error icon |

## Message Type Rendering

| Type | Renderer |
|------|----------|
| `text` | Plain text with markdown-safe display |
| `image` | Thumbnail with click-to-open lightbox |
| `file` | Filename + size + download link |
| `audio` | `MessageAudioPlayer` component |
| `voice` | `MessageAudioPlayer` component |

## Usage

```tsx
<MessageBubble
  messages={messages}
  isRecipientTyping={isTyping}
  isRecipientRecording={isRecording}
  onImageClick={(url, name) => openLightbox(url, name)}
  onAudioPlayStatusChange={handleAudioStatus}
  listeningMessageIds={listeningIds}
  messagesEndRef={endRef}
/>
```

