# WebSocket Events

Chatr uses [Socket.IO](https://socket.io) for all real-time communication. All connections are authenticated via JWT.

## Connection

```js
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
  auth: { token: '<jwt>' }
});
```

JWT is validated on every connection attempt via middleware. Invalid or expired tokens result in a `connect_error` event.

On successful connection the server:
1. Adds the socket to the user's personal room: `user:{userId}`
2. Stores the user's presence in Redis
3. Computes `getConnectedUserIds()` to determine which users should receive this user's presence updates (friends, accepted conversations, and both sides of pending conversations)
4. Broadcasts `user:status` (online) only to connected users (scoped, not global) — unless the user has hidden their online status
5. Sends `presence:update` back to the connecting client with the current online user list

> **Presence suppression:** The initiator of a pending message request does NOT receive presence updates for the recipient until the request is accepted. The recipient CAN see the initiator's status.

---

## Client → Server Events

### `message:send`
Send a direct message or deliver a pre-created file/audio message. The server calls `getOrCreateConversation` to ensure a `Conversation` record exists. If the conversation is pending and the sender is NOT the initiator (i.e. replying to a message request), the conversation is auto-accepted.

```json
{
  "recipientId": "uuid",
  "content": "Hello",
  "type": "text | image | file | audio | video",
  "fileUrl": "/uploads/...",
  "fileName": "voice.webm",
  "fileSize": 48200,
  "fileType": "audio/webm",
  "waveform": [0.1, 0.4, 0.9],
  "duration": 12.4,
  "messageId": "uuid",
  "replyTo": {
    "id": "uuid",
    "content": "Original message",
    "senderDisplayName": "Alice",
    "senderUsername": "alice",
    "type": "text",
    "duration": null
  }
}
```

> `messageId` is optional — pass it when the message was already created via `POST /api/messages/upload` to avoid duplicate DB records.

> `message:status` (delivered/read) is suppressed when the conversation status is `pending`.

---

### `message:unsend`
Soft-delete a sent message. Only the sender may unsend. Pass the `messageId` as a plain string.

```
"uuid"
```

---

### `message:edit`
Edit the content of a sent message. Only the sender may edit. Edit history is preserved in the database for legal/audit purposes.

```json
{
  "messageId": "uuid",
  "content": "Updated text",
  "recipientId": "uuid"
}
```

---

### `message:react`
Toggle an emoji reaction on a message.

```json
{
  "messageId": "uuid",
  "emoji": "👍"
}
```

---

### `typing:start`
Notify the recipient that the current user has started typing.

```json
{
  "recipientId": "uuid"
}
```

---

### `typing:stop`
Notify the recipient that the current user has stopped typing.

```json
{
  "recipientId": "uuid"
}
```

---

### `audio:recording`
Notify the recipient that the current user is recording (or has stopped recording) a voice note.

```json
{
  "recipientId": "uuid",
  "isRecording": true
}
```

---

### `audio:listening`
Notify the sender that the recipient is listening to (or has finished) a voice message.

```json
{
  "senderId": "uuid",
  "messageId": "uuid",
  "isListening": true,
  "isEnded": false
}
```

---

### `presence:update`
Update the current user's presence status.

```json
"online" | "away"
```

---

### `presence:request`
Request the presence data for a list of users.

```json
["uuid", "uuid", "uuid"]
```

---

### `settings:update`
Persist a user setting change (e.g. show/hide online status).

```json
{
  "showOnlineStatus": true
}
```

---

### `ghost:typing`
Send a "ghost typing" preview — the typed text is shown live on the recipient's screen without being sent. Suppressed if the conversation is pending.

```json
{
  "recipientId": "uuid",
  "text": "I'm typing this..."
}
```

---

### `profile:imageUpdated`
Notify the server that the current user has uploaded a new profile image. Updates the server-side profile image reference for subsequent outgoing messages.

```json
{
  "profileImage": "/uploads/profiles/new-image.jpg"
}
```

---

## Server → Client Events

### `message:received`
Delivered to the **recipient** when a new direct message arrives.

```json
{
  "id": "uuid",
  "senderId": "uuid",
  "recipientId": "uuid",
  "senderUsername": "alice",
  "senderDisplayName": "Alice",
  "senderProfileImage": "/profile/alice.jpg",
  "content": "Hello",
  "type": "text | image | file | audio | video",
  "timestamp": "2026-02-25T12:00:00Z",
  "status": "delivered",
  "fileUrl": null,
  "fileName": null,
  "fileSize": null,
  "fileType": null,
  "waveform": null,
  "duration": null,
  "replyTo": null
}
```

---

### `message:sent`
Delivered to the **sender** as confirmation after a message is saved to the database.

```json
{
  "id": "uuid",
  "senderId": "uuid",
  "recipientId": "uuid",
  "content": "Hello",
  "type": "text",
  "timestamp": "2026-02-25T12:00:00Z",
  "status": "delivered | sent",
  "fileUrl": null,
  "waveform": null,
  "duration": null,
  "replyTo": null
}
```

---

### `message:status`
Notifies the sender of a status change on one of their messages.

```json
{
  "messageId": "uuid",
  "status": "delivered | read | listening | listened"
}
```

---

### `message:unsent`
Notifies **both parties** that a message has been soft-deleted.

```json
{
  "messageId": "uuid",
  "senderDisplayName": "Alice"
}
```

---

### `message:edited`
Notifies **both parties** that a message has been edited.

```json
{
  "messageId": "uuid",
  "content": "Updated text",
  "editedAt": "2026-02-25T12:05:00Z"
}
```

---

### `message:reaction`
Notifies **both parties** of a reaction change.

```json
{
  "messageId": "uuid",
  "userId": "uuid",
  "username": "alice",
  "emoji": "👍",
  "reactions": [
    { "userId": "uuid", "username": "alice", "emoji": "👍" }
  ]
}
```

---

### `typing:status`
Notifies the recipient that the other user's typing state has changed.

```json
{
  "userId": "uuid",
  "username": "alice",
  "isTyping": true,
  "type": "direct"
}
```

---

### `audio:recording`
Notifies the recipient that the other user has started or stopped recording a voice note.

```json
{
  "userId": "uuid",
  "username": "alice",
  "isRecording": true
}
```

---

### `audio:waveform`
Pushed to **both parties** after a voice message's waveform has been analysed and stored.

```json
{
  "messageId": "uuid",
  "waveform": [0.1, 0.4, 0.9, 0.3],
  "duration": 12.4
}
```

---

### `audio:listening`
Notifies the sender that the recipient has started or finished listening to a voice message.

```json
{
  "listenerId": "uuid",
  "messageId": "uuid",
  "isListening": true,
  "isEnded": false
}
```

---

### `user:status`
Broadcast to **connected users only** (friends, accepted conversations, pending conversation participants) when someone connects or disconnects. Only sent if the user has not hidden their online status. The initiator of a pending message request will NOT receive this event for the recipient.

```json
{
  "userId": "uuid",
  "username": "alice",
  "status": "online | offline",
  "timestamp": "2026-02-25T12:00:00Z"
}
```

---

### `presence:update`
Sent to the connecting client on login, and to all clients when a user's status changes.

```json
{
  "status": "online",
  "onlineUsers": [
    { "userId": "uuid", "status": "online" }
  ]
}
```

---

### `presence:data`
Response to a `presence:request`, containing requested users' presence data.

```json
{
  "users": [
    {
      "userId": "uuid",
      "status": "online | offline",
      "lastSeen": "2026-02-25T12:00:00Z",
      "hideOnlineStatus": false
    }
  ]
}
```

---

### `ghost:typing`
Delivers a live text preview from the sender to the recipient.

```json
{
  "senderId": "uuid",
  "senderUsername": "alice",
  "text": "I'm typing this..."
}
```

---

### `conversation:accepted`
Sent to the **initiator** when their message request is accepted (either by the recipient clicking Accept or by the recipient replying).

```json
{
  "conversationId": "uuid",
  "acceptedBy": "uuid"
}
```

---

### `conversation:declined`
Sent when a conversation is declined or nuked. For decline, sent to the **initiator**. For nuke, sent to **both participants**. `conversationId` may be `null` when nuking by participant IDs.

```json
{
  "conversationId": "uuid | null",
  "declinedBy": "uuid",
  "otherUserId": "uuid"
}
```

---

### `friend:notify`
Sent to the relevant user when a friend request action occurs (request sent, accepted, etc.).

```json
{
  "type": "request | accepted | declined",
  "friendship": {
    "id": "uuid",
    "requesterId": "uuid",
    "addresseeId": "uuid",
    "status": "pending | accepted"
  }
}
```

---

### `user:profileUpdate`
Broadcast to connected users when someone updates their profile image.

```json
{
  "userId": "uuid",
  "profileImage": "/uploads/profiles/new-image.jpg"
}
```

---

### `error`
Emitted to the client when a socket operation fails.

```json
{
  "message": "Error description"
}
```

---

## Voice Call Events

See [Voice Calls](../Features/VOICE_CALLS.md) for the full feature overview and sequence diagram.

### Client → Server

#### `call:initiate`
Start an outbound call. Server creates a `Call` record and notifies the receiver.

```json
{ "receiverId": "uuid" }
```

Acknowledgement returns `{ "callId": "uuid" }` on success or `{ "error": "reason" }` on failure (user offline, blocked, already in a call).

#### `call:accept`
Receiver accepts an incoming call. Server updates the call to `active` and notifies the caller.

```json
{ "callId": "uuid" }
```

#### `call:reject`
Receiver declines an incoming call. Server updates the call to `rejected`.

```json
{ "callId": "uuid" }
```

#### `call:hangup`
Either party ends an active or ringing call.

```json
{ "callId": "uuid" }
```

#### `call:offer`
Relay an SDP offer to the target user (WebRTC signaling).

```json
{ "callId": "uuid", "targetUserId": "uuid", "sdp": { "type": "offer", "sdp": "..." } }
```

#### `call:answer`
Relay an SDP answer to the target user (WebRTC signaling).

```json
{ "callId": "uuid", "targetUserId": "uuid", "sdp": { "type": "answer", "sdp": "..." } }
```

#### `call:ice-candidate`
Relay an ICE candidate to the target user (WebRTC connectivity).

```json
{ "callId": "uuid", "targetUserId": "uuid", "candidate": { "candidate": "...", "sdpMid": "...", "sdpMLineIndex": 0 } }
```

### Server → Client

#### `call:incoming`
Sent to the receiver when someone initiates a call.

```json
{ "callId": "uuid", "caller": { "id": "uuid", "username": "@alice", "displayName": "Alice", "profileImage": "/uploads/profiles/..." } }
```

#### `call:accepted`
Sent to the caller when the receiver accepts.

```json
{ "callId": "uuid" }
```

#### `call:offer`
Relayed SDP offer from the caller.

```json
{ "callId": "uuid", "fromUserId": "uuid", "sdp": { "type": "offer", "sdp": "..." } }
```

#### `call:answer`
Relayed SDP answer from the receiver.

```json
{ "callId": "uuid", "fromUserId": "uuid", "sdp": { "type": "answer", "sdp": "..." } }
```

#### `call:ice-candidate`
Relayed ICE candidate from the other party.

```json
{ "callId": "uuid", "fromUserId": "uuid", "candidate": { "candidate": "...", "sdpMid": "...", "sdpMLineIndex": 0 } }
```

#### `call:ended`
Sent to both parties when a call ends for any reason.

```json
{ "callId": "uuid", "reason": "hangup | rejected | no_answer | missed | disconnect", "duration": 42 }
```
