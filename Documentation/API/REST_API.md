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

### GET `/api/users/search?q=john`
Search users by username. *(Note: currently a stub — returns 501)*

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
    "recipientId": "uuid",
    "content": "Hello",
    "type": "text",
    "status": "delivered",
    "isRead": true,
    "readAt": "2026-02-21T12:00:00Z",
    "createdAt": "2026-02-21T11:59:00Z",
    "fileUrl": null,
    "fileName": null,
    "fileSize": null,
    "fileType": null,
    "audioWaveform": null,
    "audioDuration": null
  }
]
```

---

### GET `/api/messages/conversations`
Get a list of recent conversations. *(Note: currently a stub — returns 501)*

---

### POST `/api/messages/upload` 🔒
Upload a file, image or audio attachment and create a message record.

**Form data**

| Field | Type | Description |
|-------|------|-------------|
| file | File | The attachment |
| recipientId | String | Target user UUID |
| senderId | String | Sender UUID |
| type | String | `image`, `file`, or `audio` |

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

---

## Misc

### GET `/api/email-preview`
Renders email templates for visual preview (dev/admin use).

### GET `/api/docs`
Swagger UI for interactive API exploration.
