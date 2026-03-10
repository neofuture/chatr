# REST API Reference

Base URL: `http://localhost:3001/api` (development) · `https://api.chatr-app.online/api` (production)

All authenticated endpoints (🔒) require:
```
Authorization: Bearer <jwt_token>
```

---

## Health

### GET `/api/health`
Returns server status. No authentication required.

**Response `200`**
```json
{ "status": "ok", "timestamp": "2026-02-21T12:00:00Z" }
```

---

## Authentication — `/api/auth`

### POST `/api/auth/register`
Register a new user account.

**Body**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass1!",
  "phoneNumber": "+447911123456"
}
```

**Validation rules**
- `email` or `phoneNumber` — at least one required
- `password`: min 8 chars, 1 uppercase, 1 special character
- `username`: alphanumeric + underscores, 3–20 chars (auto-prefixed with `@`)

**Response `201`**
```json
{ "message": "Registration successful. Please verify your email/phone." }
```

---

### POST `/api/auth/login`
Initiate login. Sends a one-time verification code via email or SMS.

**Body**
```json
{ "email": "user@example.com", "password": "SecurePass1!" }
```

**Response `200`**
```json
{
  "message": "Verification code sent",
  "verificationMethod": "email",
  "userId": "uuid"
}
```

---

### POST `/api/auth/verify-email`
Verify email address with OTP sent at registration.

**Body**
```json
{ "userId": "uuid", "code": "123456" }
```

---

### POST `/api/auth/verify-phone`
Verify phone number with SMS OTP sent at registration.

**Body**
```json
{ "userId": "uuid", "code": "123456" }
```

---

### POST `/api/auth/forgot-password`
Request a password reset code via email.

**Body**
```json
{ "email": "user@example.com" }
```

---

### POST `/api/auth/2fa/setup` 🔒
Generate a TOTP secret and QR code for 2FA setup.

**Response `200`**
```json
{
  "secret": "BASE32SECRET",
  "qrCode": "data:image/png;base64,..."
}
```

---

### POST `/api/auth/2fa/verify` 🔒
Verify a TOTP code and enable 2FA on the account.

**Body**
```json
{ "token": "123456" }
```

---

### POST `/api/auth/logout`
Invalidate the current session.

---

## Users — `/api/users`

### GET `/api/users` 🔒
Returns all verified users (excluding the authenticated user).

**Response `200`**
```json
[
  {
    "id": "uuid",
    "username": "@johndoe",
    "email": "user@example.com",
    "profileImage": "/uploads/profiles/...",
    "coverImage": "/uploads/covers/..."
  }
]
```

---

### GET `/api/users/conversations` 🔒
Returns the authenticated user's conversation list with partner details and friendship status.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "username": "@johndoe",
    "email": "user@example.com",
    "profileImage": "/uploads/profiles/...",
    "coverImage": "/uploads/covers/...",
    "conversationId": "uuid",
    "conversationStatus": "accepted",
    "isInitiator": true,
    "isFriend": true
  }
]
```

---

### GET `/api/users/check-username?username=johndoe`
Check if a username is available.

**Response `200`**
```json
{ "available": true }
```

---

### GET `/api/users/suggest-username?username=johndoe`
Returns an array of available username suggestions based on the provided name.

---

### GET `/api/users/search?q=john` 🔒
Search users by username. Results are sorted with friends first. Each result includes friendship status.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "username": "@johndoe",
    "email": "user@example.com",
    "profileImage": "/uploads/profiles/...",
    "isFriend": true,
    "friendship": {
      "id": "uuid",
      "status": "ACCEPTED",
      "iRequested": false
    }
  },
  {
    "id": "uuid",
    "username": "@janedoe",
    "email": "jane@example.com",
    "profileImage": null,
    "isFriend": false,
    "friendship": null
  }
]
```

---

### GET `/api/users/me` 🔒
Get the currently authenticated user's full profile.

> ⚠️ This route is registered after `/:username` in the router. Ensure your client calls this with the `Authorization` header so it hits the authenticated handler.

---

### GET `/api/users/:username`
Get a user's public profile by username (include the `@` prefix).

---

### POST `/api/users/profile-image` 🔒
Upload a profile image. Accepts `multipart/form-data` with field `profileImage`.

Invalidates the Redis conversation cache for all conversations involving the user and broadcasts a `user:profileUpdate` event via Socket.io to all connected users.

---

### DELETE `/api/users/profile-image` 🔒
Remove the authenticated user's profile image.

---

### POST `/api/users/cover-image` 🔒
Upload a cover image. Accepts `multipart/form-data` with field `coverImage`.

---

### DELETE `/api/users/cover-image` 🔒
Remove the authenticated user's cover image.

---

## Friends — `/api/friends`

All friends endpoints require authentication (🔒).

### GET `/api/friends` 🔒
Get the authenticated user's accepted friends list.

**Response `200`**
```json
{
  "friends": [
    {
      "friendshipId": "uuid",
      "since": "2026-03-01T10:00:00Z",
      "user": {
        "id": "uuid",
        "username": "@johndoe",
        "profileImage": "/uploads/profiles/..."
      }
    }
  ]
}
```

---

### GET `/api/friends/requests/incoming` 🔒
Get incoming (pending) friend requests.

**Response `200`**
```json
{
  "requests": [
    {
      "friendshipId": "uuid",
      "createdAt": "2026-03-01T10:00:00Z",
      "user": {
        "id": "uuid",
        "username": "@janedoe",
        "profileImage": "/uploads/profiles/..."
      }
    }
  ]
}
```

---

### GET `/api/friends/requests/outgoing` 🔒
Get outgoing (pending) friend requests sent by the authenticated user.

**Response `200`**
```json
{
  "requests": [
    {
      "friendshipId": "uuid",
      "createdAt": "2026-03-01T10:00:00Z",
      "user": {
        "id": "uuid",
        "username": "@bobsmith",
        "profileImage": null
      }
    }
  ]
}
```

---

### GET `/api/friends/search?q=john` 🔒
Search users to add as friends. Requires a minimum of 2 characters. Returns users with their friendship status attached.

---

### POST `/api/friends/request` 🔒
Send a friend request. If the target user has already sent a request to the authenticated user, the friendship is automatically accepted.

**Body**
```json
{ "addresseeId": "uuid" }
```

**Response `201`**
```json
{ "friendship": { "id": "uuid", "status": "PENDING" } }
```

---

### POST `/api/friends/:friendshipId/accept` 🔒
Accept a pending friend request. Only the addressee (the user who received the request) may accept.

**Response `200`**
```json
{ "friendship": { "id": "uuid", "status": "ACCEPTED" } }
```

---

### POST `/api/friends/:friendshipId/decline` 🔒
Decline or cancel a pending friend request. Either party (requester or addressee) can call this. Deletes the friendship row.

**Response `200`**
```json
{ "success": true }
```

---

### DELETE `/api/friends/:friendshipId` 🔒
Remove an accepted friend. Deletes the friendship row.

**Response `200`**
```json
{ "success": true }
```

---

### POST `/api/friends/:targetUserId/block` 🔒
Block a user. If an existing friendship exists it is removed, and a blocked friendship row is created.

**Response `200`**
```json
{ "success": true }
```

---

### POST `/api/friends/:targetUserId/unblock` 🔒
Unblock a previously blocked user.

**Response `200`**
```json
{ "success": true }
```

---

### GET `/api/friends/blocked` 🔒
Get the authenticated user's list of blocked users.

**Response `200`**
```json
{
  "blocked": [
    {
      "friendshipId": "uuid",
      "user": {
        "id": "uuid",
        "username": "@blockeduser",
        "profileImage": null
      }
    }
  ]
}
```

---

## Messages — `/api/messages`

### GET `/api/messages/history` 🔒
Retrieve message history between two users.

**Query params**

| Param | Required | Description |
|-------|----------|-------------|
| otherUserId | Yes | The other participant's UUID |
| limit | No | Default 50 |
| before | No | Message ID cursor for pagination |

**Response `200`** — array of Message objects
```json
[
  {
    "id": "uuid",
    "senderId": "uuid",
    "senderUsername": "@johndoe",
    "senderDisplayName": "John Doe",
    "senderProfileImage": "/profile/johndoe.jpg",
    "recipientId": "uuid",
    "content": "Hello",
    "unsent": false,
    "edited": false,
    "editedAt": null,
    "type": "text",
    "status": "delivered",
    "isRead": true,
    "readAt": "2026-02-21T12:00:00Z",
    "createdAt": "2026-02-21T11:59:00Z",
    "fileUrl": null,
    "fileName": null,
    "fileSize": null,
    "fileType": null,
    "waveform": null,
    "duration": null,
    "reactions": [],
    "replyTo": null
  }
]
```

> For **unsent** messages: `content` is `""`, `unsent` is `true`, file/audio fields are `null`, `edited` is `false`.
> For **edited** messages: `edited` is `true`, `editedAt` is an ISO timestamp.

---

### GET `/api/messages/:id/edits` 🔒
Retrieve the full edit-history audit trail for a message. Only the sender or recipient may access this endpoint. Rows are immutable — never deleted — to satisfy legal/compliance retention requirements.

**Response `200`**
```json
{
  "messageId": "uuid",
  "edits": [
    {
      "id": "uuid",
      "previousContent": "Original text before first edit",
      "editedAt": "2026-02-23T10:00:00Z",
      "editedBy": {
        "id": "uuid",
        "username": "@johndoe",
        "displayName": "John Doe"
      }
    },
    {
      "id": "uuid",
      "previousContent": "Text after first edit, before second",
      "editedAt": "2026-02-23T10:05:00Z",
      "editedBy": {
        "id": "uuid",
        "username": "@johndoe",
        "displayName": "John Doe"
      }
    }
  ]
}
```

**Errors**

| Status | Reason |
|--------|--------|
| 401 | No / invalid auth token |
| 403 | Caller is neither sender nor recipient |
| 404 | Message ID not found |

---

### POST `/api/messages/upload` 🔒
Upload a file, image or audio attachment and create a message record.

**Form data**

| Field | Type | Description |
|-------|------|-------------|
| file | File | The attachment |
| recipientId | String | Target user UUID |
| senderId | String | Sender UUID |
| type | String | `image`, `file`, `audio`, or `video` |

**Response `200`**
```json
{
  "messageId": "uuid",
  "fileUrl": "/uploads/audio/voice-...",
  "needsWaveformGeneration": true
}
```

---

### PATCH `/api/messages/:id/waveform` 🔒
Update waveform data after client-side audio analysis. Triggers `audio:waveform` Socket.io event to both sender and recipient.

**Body**
```json
{
  "waveform": [0.12, 0.34, 0.87],
  "duration": 12.4
}
```

---

## Conversations — `/api/conversations`

All conversations endpoints require authentication (🔒).

### POST `/api/conversations/:id/accept` 🔒
Accept a message request (pending conversation). Invalidates the Redis conversation cache for both participants and emits a `conversation:accepted` Socket.io event to the initiator.

**Response `200`**
```json
{ "success": true }
```

---

### POST `/api/conversations/:id/decline` 🔒
Decline a message request. Deletes all messages between the two participants, invalidates the Redis conversation cache, and emits a `conversation:declined` Socket.io event to the initiator.

**Response `200`**
```json
{ "success": true }
```

---

### POST `/api/conversations/:id/nuke` 🔒
Full reset of a conversation. Deletes the conversation record and all associated messages, invalidates the Redis conversation cache, and emits a `conversation:declined` Socket.io event to both participants.

**Response `200`**
```json
{ "success": true }
```

---

### POST `/api/conversations/nuke-by-user/:recipientId` 🔒
Nuke a conversation by participant IDs. Used when the `conversationId` is not known on the client. Performs the same cleanup as the `/nuke` endpoint. Emits `conversation:declined` with `conversationId: null`.

**Response `200`**
```json
{ "success": true }
```

---

## Groups — `/api/groups`

> ⚠️ Group REST endpoints are currently stubs — they return `501 Not Implemented`. Group functionality is handled over WebSocket.

### POST `/api/groups`
Create a new group.

### GET `/api/groups/:id`
Get group details and member list.

### POST `/api/groups/:id/join`
Join a group.

### POST `/api/groups/:id/leave`
Leave a group.

### GET `/api/groups/:id/messages`
Get message history for a group.

## Widget — `/api/widget`

### POST `/api/widget/guest-session`
Create or resume a guest chat session. No authentication required.

**Body**
```json
{
  "guestName": "John",
  "guestId": "existing-guest-uuid-or-null"
}
```

**Response `200`**
```json
{
  "token": "jwt-token",
  "guestId": "uuid",
  "guestName": "John",
  "supportAgentId": "uuid"
}
```

---

### GET `/api/widget/history` 🔒
Retrieve chat history for the current widget guest session.

**Response `200`**
```json
{
  "messages": [
    { "id": "uuid", "senderId": "uuid", "content": "Hello", "type": "text", "createdAt": "..." }
  ]
}
```

---

### POST `/api/widget/upload` 🔒
Upload a file attachment from the widget. Uses the same MIME type whitelist and 50MB limit as the main app.

**Form data**

| Field | Type | Description |
|-------|------|-------------|
| file | File | The attachment |

**Response `200`**
```json
{
  "message": {
    "id": "uuid",
    "senderId": "uuid",
    "content": "file content or URL",
    "type": "image",
    "fileName": "photo.jpg",
    "fileSize": 12345,
    "fileType": "image/jpeg",
    "createdAt": "..."
  }
}
```

---

### POST `/api/widget/end-chat` 🔒
End the current widget chat session.

**Response `200`**
```json
{ "success": true }
```

---

### GET `/api/widget/support-agent`
Retrieve the designated support agent's info. No authentication required.

**Response `200`**
```json
{
  "id": "uuid",
  "displayName": "Support",
  "username": "@support"
}
```

---

## Misc

### GET `/api/email-preview`
Renders email templates for visual preview (dev/admin use).

### GET `/api/docs`
Swagger UI for interactive API exploration.
