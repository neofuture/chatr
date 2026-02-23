# WebSocket Events

Chatr uses Socket.io for all real-time communication. The server runs on the same port as the REST API (`3001`).

## Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: '<jwt>' }
});
```

The JWT token is validated on every connection attempt via middleware. Invalid or expired tokens result in a `connect_error` event.

On successful connection the server:
1. Adds the socket to the user's personal room: `user:{userId}`
2. Broadcasts `user:status` (online) to all other connected users
3. Sends `presence:update` back to the connecting client with the current online user list

---

## Client → Server Events

### `message:send`
Send a direct message or deliver a pre-created file/audio message.

```json
{
  "recipientId": "uuid",
  "content": "Hello",
  "type": "text",
  "fileUrl": "/uploads/...",
  "fileName": "voice.webm",
  "fileSize": 48200,
  "fileType": "audio/webm",
  "waveform": [0.1, 0.4, 0.9],
  "duration": 12.4,
  "messageId": "uuid"
}
```

> `messageId` is optional — pass it when the message was already created via `POST /api/messages/upload` to avoid duplicate DB records.

---

### `message:received`
Acknowledge receipt of a message (triggers `delivered` status).

```json
"uuid"
```
*(passes the `messageId` string directly)*

---

### `message:unsend`
Soft-delete a sent message. Only the sender may unsend.

```json
"messageId"
```
*(passes the `messageId` string directly)*

---

### `message:edit`
Edit the content of a previously sent text message. Only the sender may edit; only `text` type; cannot edit an unsent message.

```json
{
  "messageId": "uuid",
  "content": "Corrected message text"
}
```

---

### `message:unsent`
Delivered to both sender and recipient when a message is unsent. Both clients render a placeholder.

```json
{
  "messageId": "uuid",
  "senderDisplayName": "John"
}
```

---

### `message:edited`
Delivered to both sender and recipient when a message is edited. Clients update the message content and show the `✏ edited` marker.

```json
{
  "messageId": "uuid",
  "content": "Corrected message text",
  "editedAt": "2026-02-23T10:00:00Z"
}
```

---

### `message:reaction`
Mark a message as read.

```json
"uuid"
```
*(passes the `messageId` string directly)*

---

### `typing:start`
Notify recipient that the user has started typing.

```json
{ "recipientId": "uuid" }
```
Or for a group:
```json
{ "groupId": "uuid" }
```

---

### `typing:stop`
Notify recipient that the user has stopped typing.

```json
{ "recipientId": "uuid" }
```
Or for a group:
```json
{ "groupId": "uuid" }
```

---

### `audio:recording`
Notify recipient that the user has started or stopped recording a voice note.

```json
{ "recipientId": "uuid", "isRecording": true }
```

---

### `audio:listening`
Notify sender that the recipient is listening to an audio message. When `isEnded: true` the message is automatically marked as read in the database.

```json
{
  "senderId": "uuid",
  "messageId": "uuid",
  "isListening": true,
  "isEnded": false
}
```

---

### `ghost:typing`
Send real-time keystroke text to recipient (ghost typing feature).

```json
{ "recipientId": "uuid", "text": "Hello wor..." }
```

---

### `presence:update`
Update the authenticated user's presence status.

```json
"online"
```
or `"away"` *(string value only)*

---

### `presence:request`
Request presence status for a list of user IDs.

```json
["uuid1", "uuid2", "uuid3"]
```

---

### `group:join`
Join a Socket.io group room (user must already be a DB member of the group).

```json
"groupId"
```
*(passes the `groupId` string directly)*

---

### `group:leave`
Leave a Socket.io group room.

```json
"groupId"
```

---

### `group:message:send`
Send a message to a group channel.

```json
{
  "groupId": "uuid",
  "content": "Hey everyone",
  "type": "text"
}
```

---

## Server → Client Events

### `message:received`
Delivered to the recipient when a new message arrives.

```json
{
  "id": "uuid",
  "senderId": "uuid",
  "senderUsername": "@johndoe",
  "content": "Hello",
  "type": "text",
  "timestamp": "2026-02-21T12:00:00Z",
  "status": "delivered",
  "fileUrl": null,
  "fileName": null,
  "fileSize": null,
  "fileType": null,
  "waveform": null,
  "duration": null
}
```

---

### `message:sent`
Confirmation to the sender that their message was processed.

```json
{
  "id": "uuid",
  "recipientId": "uuid",
  "content": "Hello",
  "timestamp": "2026-02-21T12:00:00Z",
  "status": "delivered"
}
```

---

### `message:status`
Delivered to the sender when a message status changes (delivered / read).

```json
{
  "messageId": "uuid",
  "status": "read",
  "timestamp": "2026-02-21T12:00:00Z"
}
```

---

### `typing:status`
Delivered to the recipient (or group members) when typing state changes.

```json
{
  "userId": "uuid",
  "username": "@johndoe",
  "isTyping": true,
  "type": "direct",
  "groupId": null
}
```

---

### `audio:recording`
Delivered to the recipient when the sender starts or stops recording a voice note.

```json
{
  "userId": "uuid",
  "username": "@johndoe",
  "isRecording": true
}
```

---

### `audio:listening`
Delivered to the sender when the recipient interacts with an audio message.

```json
{
  "userId": "uuid",
  "username": "@johndoe",
  "messageId": "uuid",
  "isListening": true,
  "isEnded": false
}
```

---

### `ghost:typing`
Delivered to the recipient with the sender's current typed text.

```json
{
  "userId": "uuid",
  "username": "@johndoe",
  "text": "Hello wor...",
  "type": "direct"
}
```

---

### `user:status`
Broadcast to all connected users when someone connects, disconnects, or changes status.

```json
{
  "userId": "uuid",
  "username": "@johndoe",
  "status": "online",
  "timestamp": "2026-02-21T12:00:00Z"
}
```

---

### `presence:update`
Sent to the connecting client on initial connection with the full online user list.

```json
{
  "status": "online",
  "onlineUsers": [
    { "userId": "uuid", "status": "online" }
  ]
}
```

---

### `presence:response`
Response to `presence:request` with presence data for the requested user IDs.

```json
[
  { "userId": "uuid", "status": "online", "lastSeen": "2026-02-21T12:00:00Z" },
  { "userId": "uuid2", "status": "offline", "lastSeen": "2026-02-21T11:30:00Z" }
]
```

---

### `group:message:received`
Delivered to all members of a group room when a new group message arrives.

```json
{
  "id": "uuid",
  "groupId": "uuid",
  "senderId": "uuid",
  "senderUsername": "@johndoe",
  "content": "Hey everyone",
  "type": "text",
  "timestamp": "2026-02-21T12:00:00Z"
}
```

---

### `group:user:joined`
Delivered to group room members when a user joins.

```json
{
  "groupId": "uuid",
  "userId": "uuid",
  "username": "@johndoe",
  "timestamp": "2026-02-21T12:00:00Z"
}
```

---

### `group:user:left`
Delivered to group room members when a user leaves.

```json
{
  "groupId": "uuid",
  "userId": "uuid",
  "username": "@johndoe",
  "timestamp": "2026-02-21T12:00:00Z"
}
```

---

### `error`
Delivered to the client when an operation fails.

```json
{ "message": "Failed to send message" }
```

---

## Authentication Flow

```
Client                         Server
  │                              │
  ├─ connect (auth.token=jwt) ──►│ validate JWT → find user in DB
  │◄─ connect_error ─────────────┤ (if invalid)
  │◄─ presence:update ───────────┤ (if valid) — sends online user list
  │◄─ [other clients get user:status: online]
  │
  ├─ disconnect ────────────────►│ marks user offline, updates lastSeen
  │◄─ [other clients get user:status: offline]
```

## Message Lifecycle

```
Sender                         Server                        Recipient
  │                              │                              │
  ├─ message:send ──────────────►│ save to DB                   │
  │                              ├─ message:received ──────────►│
  │◄─ message:sent ──────────────┤ (status: delivered)          │
  │                              │◄─ message:received ──────────┤
  │                              │ update status: delivered      │
  │◄─ message:status (delivered)─┤                              │
  │                              │◄─ message:read ──────────────┤
  │                              │ update status: read           │
  │◄─ message:status (read) ─────┤                              │
```
