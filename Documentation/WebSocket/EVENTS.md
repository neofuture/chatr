# WebSocket Events

Chatr uses Socket.io for all real-time communication. The server runs on the same port as the REST API.

## Connection

### Client connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: '<jwt>' }
});
```

The JWT token is validated on every connection attempt. Invalid or expired tokens result in a `connect_error` event.

### Room assignment

On successful connection, the server places the socket into a personal room:
```
user:{userId}
```

All targeted events are emitted to this room, ensuring delivery to all active sessions for a user.

---

## Event Reference

### Client → Server (Emit)

#### `message:send`
Send a direct message.

```json
{
  "recipientId": "uuid",
  "content": "Hello",
  "type": "text"
}
```

---

#### `message:delivered`
Acknowledge receipt of a message.

```json
{ "messageId": "uuid", "senderId": "uuid" }
```

---

#### `message:read`
Mark a message as read.

```json
{ "messageId": "uuid", "senderId": "uuid" }
```

---

#### `typing:start`
Notify recipient that the user has started typing.

```json
{ "recipientId": "uuid" }
```

---

#### `typing:stop`
Notify recipient that the user has stopped typing.

```json
{ "recipientId": "uuid" }
```

---

#### `recording:start`
Notify recipient that the user has started recording a voice message.

```json
{ "recipientId": "uuid" }
```

---

#### `recording:stop`
Notify recipient that recording has ended.

```json
{ "recipientId": "uuid" }
```

---

#### `audio:listening`
Notify the sender that their audio message is being played.

```json
{ "messageId": "uuid", "senderId": "uuid" }
```

---

#### `audio:listened`
Notify the sender that their audio message has been fully listened to (≥ 95% played).

```json
{ "messageId": "uuid", "senderId": "uuid" }
```

---

#### `presence:update`
Broadcast online/offline status change.

```json
{ "status": "online" }
```

---

#### `presence:request`
Request current presence status of a list of users.

```json
["uuid1", "uuid2"]
```

---

### Server → Client (On)

#### `message:received`
A new message has arrived.

```json
{
  "id": "uuid",
  "senderId": "uuid",
  "senderUsername": "johndoe",
  "senderProfileImage": "/uploads/...",
  "recipientId": "uuid",
  "content": "Hello",
  "type": "text",
  "status": "sent",
  "createdAt": "2026-02-20T12:00:00Z",
  "fileUrl": null,
  "fileName": null,
  "fileSize": null,
  "fileType": null,
  "waveform": null,
  "duration": null
}
```

---

#### `message:status`
Status update for a previously sent message.

```json
{
  "messageId": "uuid",
  "status": "delivered"
}
```

Possible values: `delivered`, `read`, `listening`, `listened`

---

#### `typing:indicator`
The other user is typing.

```json
{ "userId": "uuid", "isTyping": true }
```

---

#### `recording:indicator`
The other user is recording a voice message.

```json
{ "userId": "uuid", "isRecording": true }
```

---

#### `audio:waveform`
Real waveform data is available for an audio message (sent after client-side analysis completes).

```json
{
  "messageId": "uuid",
  "waveform": [0.04, 0.12, 0.55, ...],
  "duration": 12.4
}
```

---

#### `presence:status`
Presence update for one or more users.

```json
[
  { "userId": "uuid", "status": "online", "lastSeen": "2026-02-20T12:00:00Z" }
]
```

---

## Connection Lifecycle

```
Client                          Server
  │                               │
  ├── connect (JWT in auth) ──────▶│
  │                               ├── validate JWT
  │                               ├── load user from DB
  │                               ├── socket.userId = user.id
  │                               ├── socket.join(`user:${userId}`)
  │                               ├── emit presence:status (online) to contacts
  │◀──────────── connected ───────┤
  │                               │
  ├── [events...] ───────────────▶│
  │◀──────────── [events...] ─────┤
  │                               │
  ├── disconnect ─────────────────▶│
  │                               ├── update lastSeen in DB
  │                               └── emit presence:status (offline) to contacts
```

## Error Handling

| Event | Cause |
|-------|-------|
| `connect_error` | Invalid or expired JWT |
| `message:error` | Message not found, DB error, or unauthorised recipient |

The client's `WebSocketContext` handles reconnection automatically using Socket.io's built-in backoff strategy.

