# REST API Reference

Base URL: `http://localhost:3001/api` (development) · `https://api.chatr-app.online/api` (production)

All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
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
- `password`: min 8 chars, 1 uppercase, 1 special character
- `username`: alphanumeric + underscores, 3–20 chars
- `email`: valid format, unique
- `phoneNumber`: optional, E.164 format

**Response `201`**
```json
{ "message": "Registration successful. Please verify your email." }
```

---

### POST `/api/auth/login`
Initiate login. Sends a verification code via email or SMS.

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

### POST `/api/auth/verify-login`
Complete login with the OTP received.

**Body**
```json
{
  "userId": "uuid",
  "code": "123456"
}
```

**Response `200`**
```json
{
  "token": "<jwt>",
  "user": { "id": "uuid", "username": "johndoe", "email": "user@example.com" }
}
```

---

### POST `/api/auth/verify-email`
Verify email address with OTP.

**Body**
```json
{ "userId": "uuid", "code": "123456" }
```

---

### POST `/api/auth/verify-phone`
Verify phone number with SMS OTP.

**Body**
```json
{ "userId": "uuid", "code": "123456" }
```

---

### POST `/api/auth/forgot-password`
Request a password reset code.

**Body**
```json
{ "email": "user@example.com" }
```

---

### POST `/api/auth/reset-password`
Reset password using the code.

**Body**
```json
{ "email": "user@example.com", "code": "123456", "newPassword": "NewPass1!" }
```

---

## Users — `/api/users`

### GET `/api/users` 🔒
Returns all users (excluding the authenticated user).

**Response `200`**
```json
[
  { "id": "uuid", "username": "johndoe", "email": "user@example.com", "profileImage": "/uploads/profiles/..." }
]
```

---

### GET `/api/users/search?q=john` 🔒
Search users by username or email.

---

### GET `/api/users/check-username?username=johndoe`
Check if a username is available.

**Response `200`**
```json
{ "available": true }
```

---

### GET `/api/users/suggest-username?displayName=John+Doe`
Returns an array of available username suggestions.

---

### GET `/api/users/:username` 🔒
Get a user's public profile.

---

### POST `/api/users/profile-image` 🔒
Upload a profile image. Accepts `multipart/form-data` with field `image`.

---

### DELETE `/api/users/profile-image` 🔒
Remove profile image.

---

### POST `/api/users/cover-image` 🔒
Upload a cover image.

---

### DELETE `/api/users/cover-image` 🔒
Remove cover image.

---

## Messages — `/api/messages`

### GET `/api/messages/history?userId=uuid&recipientId=uuid` 🔒
Retrieve message history between two users. Automatically marks messages as read.

**Query params**

| Param | Required | Description |
|-------|----------|-------------|
| userId | Yes | Authenticated user ID |
| recipientId | Yes | Other participant |
| limit | No | Default 50 |
| before | No | Cursor: ISO timestamp for pagination |

**Response `200`**
```json
[
  {
    "id": "uuid",
    "senderId": "uuid",
    "senderUsername": "johndoe",
    "recipientId": "uuid",
    "content": "Hello",
    "type": "text",
    "status": "delivered",
    "isRead": true,
    "readAt": "2026-02-20T12:00:00Z",
    "createdAt": "2026-02-20T11:59:00Z",
    "fileUrl": null,
    "fileName": null,
    "fileSize": null,
    "fileType": null,
    "waveform": null,
    "duration": null
  }
]
```

---

### GET `/api/messages/conversations` 🔒
Returns a list of recent conversations with last message and unread count.

---

### POST `/api/messages/upload` 🔒
Upload a file/image/audio attachment and create a message.

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
Update waveform data after client-side audio analysis.

**Body**
```json
{
  "waveform": [0.12, 0.34, 0.87, ...],
  "duration": 12.4
}
```

Triggers `audio:waveform` Socket.io event to both sender and recipient.

---

## Groups — `/api/groups`

### POST `/api/groups` 🔒
Create a new group.

**Body**
```json
{ "name": "My Group", "description": "Optional description" }
```

---

### GET `/api/groups/:id` 🔒
Get group details and member list.

---

### POST `/api/groups/:id/join` 🔒
Join a group.

---

### POST `/api/groups/:id/leave` 🔒
Leave a group.

---

### GET `/api/groups/:id/messages` 🔒
Get message history for a group.

---

## Health

### GET `/api/health`
Returns server status. No authentication required.

**Response `200`**
```json
{ "status": "ok", "timestamp": "2026-02-20T12:00:00Z" }
```

