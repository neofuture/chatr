# Hooks

Custom React hooks used throughout the Chatr frontend.

---

Shared audio utilities live in `src/utils/audio.ts` (e.g. `getAudioDurationFromBlob`), used by hooks and components for waveform/voice handling.

---

## `useConversationView`

**Location:** `src/hooks/useConversationView.ts`

Manages all state for a single open conversation panel — message list, socket listeners, typing/recording indicators, lightbox, reply, and edit.

### Parameters

| Param           | Type     | Description                         |
|-----------------|----------|-------------------------------------|
| `recipientId`   | `string` | The ID of the other user            |
| `currentUserId` | `string` | The current authenticated user's ID |

### Returns

| Value                    | Type                    | Description                                          |
|--------------------------|-------------------------|------------------------------------------------------|
| `messages`               | `Message[]`             | Current message list                                 |
| `messagesEndRef`         | `RefObject`             | Ref attached to the bottom of the message list       |
| `isRecipientTyping`      | `boolean`               | Recipient is currently typing                        |
| `isRecipientRecording`   | `boolean`               | Recipient is currently recording a voice note        |
| `lightboxUrl`            | `string \| null`        | URL for the lightbox, null if closed                 |
| `lightboxName`           | `string`                | File name for the lightbox                           |
| `replyingTo`             | `Message \| null`       | Message being replied to                             |
| `editingMessage`         | `Message \| null`       | Message being edited                                 |
| `addMessage`             | `(msg: Message) => void` | Add an optimistic message to the list               |
| `handleEditSaved`        | `(id, content) => void` | Apply a confirmed edit to the list                   |
| `editLastSentMessage`    | `() => void`            | Set the last sent message as the editing target      |
| `handleAudioPlayStatusChange` | `fn`             | Manage the global active audio player                |
| `handleReaction`         | `fn`                    | Toggle an emoji reaction                             |
| `handleUnsend`           | `(id) => void`          | Soft-delete a message (emits `message:unsend`)       |
| `openLightbox`           | `fn`                    | Open the image lightbox                              |
| `closeLightbox`          | `fn`                    | Close the image lightbox                             |
| `setReplyingTo`          | `fn`                    | Set reply-to context                                 |
| `setEditingMessage`      | `fn`                    | Set editing context                                  |
| `cancelReply`            | `fn`                    | Clear reply-to context                               |
| `cancelEdit`             | `fn`                    | Clear editing context                                |

### WebSocket events handled

| Event              | Action                                                         |
|--------------------|----------------------------------------------------------------|
| `message:received` | Append to list (deduped), cache locally                        |
| `message:sent`     | Replace optimistic temp message with confirmed record          |
| `message:status`   | Update `status` on matching message                            |
| `message:edited`   | Update `content` and set `edited: true`                        |
| `message:unsent`   | Set `unsent: true`, clear `content`                            |
| `message:reaction` | Toggle reaction in reactions array                             |
| `typing:status`    | Set `isRecipientTyping`, auto-reset after 5 s                  |
| `audio:recording`  | Set `isRecipientRecording`, auto-reset after 30 s              |
| `audio:waveform`   | Update `waveformData` and `duration` on matching message       |

---

## `useMessageInput`

**Location:** `src/hooks/useMessageInput.ts`

Manages text input, file selection, voice recording, typing indicators, send/edit/reply logic. Accepts an optional `conversationStatus` to support message request auto-acceptance on reply.

### Parameters

| Param               | Type       | Description                              |
|----------------------|------------|------------------------------------------|
| `recipientId`        | `string`   | Conversation recipient                   |
| `currentUserId`      | `string`   | Authenticated user ID                    |
| `conversationStatus` | `string?`  | `'pending'` or `'accepted'`              |
| `replyingTo`         | `Message?` | Active reply context                     |
| `editingMessage`     | `Message?` | Active edit context                      |
| `onMessageSent`      | `fn`       | Called with optimistic message on send   |
| `onEditSaved`        | `fn`       | Called when an edit is confirmed         |
| `onTypingStart`      | `fn`       | Called when typing starts                |
| `onTypingStop`       | `fn`       | Called when typing stops                 |
| `onCancelReply`      | `fn`       | Called after a reply is sent             |
| `onCancelEdit`       | `fn`       | Called after an edit is sent             |

### Returns

| Value                      | Description                                           |
|----------------------------|-------------------------------------------------------|
| `message`                  | Current text input value                              |
| `selectedFiles`            | Array of files staged for upload                      |
| `filePreviews`             | Array of data URLs for image previews                 |
| `uploadingFile`            | `true` while an upload is in progress                 |
| `effectivelyOnline`        | `true` when WebSocket is connected                    |
| `handleMessageChange`      | Input `onChange` handler, fires `typing:start/stop`   |
| `handleSend`               | Send or save-edit on Enter / send button              |
| `handleEmojiInsert`        | Append emoji to the text input                        |
| `handleFileSelect`         | `<input type="file">` onChange handler                |
| `cancelFileSelection`      | Remove one or all staged files                        |
| `sendFiles`                | Upload staged files and emit `message:send`           |
| `handleVoiceRecording`     | Called by VoiceRecorder with blob + waveform          |
| `handleVoiceRecordingStart`| Emits `audio:recording { isRecording: true }`         |
| `handleVoiceRecordingStop` | Emits `audio:recording { isRecording: false }`        |

---

### `useGroupMessageInput`

Group-specific version of `useMessageInput`, handling text, file, voice, and video input with group-aware socket events. Shares the same 50MB file size limit and supports the same MIME types.

**Location:** `hooks/useGroupMessageInput.ts`

---

## `useConversationList`

**Location:** `src/hooks/useConversationList.ts`

Manages the conversation list for the main `/app` page. Fetches conversations from the server, provides tabbed views (Chats / Message Requests), local search by message content, and real-time updates.

### Key responsibilities

- Fetches conversation data from `GET /api/users/conversations` with `conversationId`, `conversationStatus`, `isInitiator`, and `isFriend`.
- Separates conversations into "chats" (accepted) and "requests" (pending incoming).
- Provides local search filtering on `lastMessage.content`.
- Listens for `message:received` to add new conversations and update unread counts.
- Listens for `conversation:accepted` and `conversation:declined` to update status in real time.
- Listens for `user:profileUpdate` to refresh profile images.
- Dispatches `chatr:unread-changed` custom events for the `BottomNav` badge.

---

## `useFriends`

**Location:** `src/hooks/useFriends.ts`

Manages friendship state — friend list, incoming/outgoing requests, accept/decline/cancel actions.

### Key responsibilities

- Fetches friend data from `GET /api/friends`.
- Provides `sendRequest`, `acceptRequest`, `declineRequest`, `cancelRequest` actions via REST API.
- Listens for `friend:notify` socket events for real-time updates.

---

## `useMessageToast`

**Location:** `src/hooks/useMessageToast.ts`

Displays toast notifications for incoming messages. Uses the `newmessage` toast type with orange styling. Sets the sender's name as the toast title and message content as the body. For pending message requests, the title shows "Message Request from [name]".

---

## `useConversation`

**Location:** `src/hooks/useConversation.ts`

Full messaging state machine used by the `/app/test` developer page. Manages messages, presence, socket event listeners, file/voice sending, typing indicators, ghost typing, reactions, edit/unsend, manual offline mode, and conversation summaries.

See [useConversation detail](./useConversation.md).

---

## `useAuth`

**Location:** `src/hooks/useAuth.ts`

Reads `token` and `user` from `localStorage`, validates them, and redirects to `/` if invalid.

---

## `useOfflineSync`

**Location:** `src/hooks/useOfflineSync.ts`

IndexedDB-backed message cache. Persists messages locally and syncs them on reconnect. Provides `cacheMessage`, `cacheMessages`, `updateCachedMessage`, `replaceCachedMessageId`.

---

## `useTTS`

**Location:** `src/hooks/useTTS.ts`

Text-to-speech synthesis using the Web Speech API. Provides controls for reading message content aloud.
