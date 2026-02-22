# Routes

All Express route files live in `backend/src/routes/`.

| File | Mount | Description |
|---|---|---|
| `auth.ts` | `/api/auth` | Register, login, 2FA, email/SMS verification, password reset |
| `users.ts` | `/api/users` | Profile, search, username check, profile/cover image upload |
| `messages.ts` | `/api/messages` | Message history, conversations list |
| `groups.ts` | `/api/groups` | Group CRUD, membership, group messages |
| `file-upload.ts` | `/api/messages/upload` | File and image message upload |

---

## Auth Routes — `/api/auth`

See [Authentication](./Authentication.md) for full detail.

| Method | Path | Description |
|---|---|---|
| `POST` | `/register` | Register new user |
| `POST` | `/login` | Initiate login (returns verification code) |
| `POST` | `/login/verify` | Complete login with verification code |
| `POST` | `/2fa/setup` | Set up TOTP 2FA |
| `POST` | `/2fa/verify` | Verify TOTP code |
| `POST` | `/forgot-password` | Request password reset email |
| `POST` | `/reset-password` | Complete password reset |
| `POST` | `/verify-email` | Verify email address |
| `POST` | `/resend-verification` | Resend email verification |

---

## User Routes — `/api/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/check-username` | ❌ | Check if username is available |
| `GET` | `/suggest-username` | ❌ | Suggest usernames from display name |
| `GET` | `/search` | ✅ | Search users by query |
| `GET` | `/me` | ✅ | Get own profile |
| `GET` | `/:username` | ❌ | Get user profile by username |
| `PUT` | `/me` | ✅ | Update own profile |
| `POST` | `/profile-image` | ✅ | Upload profile image (Multer → S3 or local) |
| `DELETE` | `/profile-image` | ✅ | Delete profile image |
| `POST` | `/cover-image` | ✅ | Upload cover image |
| `DELETE` | `/cover-image` | ✅ | Delete cover image |
| `POST` | `/phone/request` | ✅ | Request phone verification SMS |
| `POST` | `/phone/verify` | ✅ | Verify phone number |

---

## Message Routes — `/api/messages`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/history` | ✅ | Paginated message history between two users |
| `GET` | `/conversations` | ✅ | List of recent conversations with last message |
| `POST` | `/` | ✅ | Send a text message (REST fallback) |
| `POST` | `/upload` | ✅ | Upload file/image/audio message |

### `/history` query params

| Param | Type | Description |
|---|---|---|
| `otherUserId` | `string` | Required — the other user's ID |
| `limit` | `number` | Max messages (default 50) |
| `before` | `string` | Message ID cursor for pagination |

---

## Group Routes — `/api/groups`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | ✅ | Create group |
| `GET` | `/` | ✅ | List all groups |
| `GET` | `/:id` | ✅ | Get group by ID |
| `PUT` | `/:id` | ✅ | Update group (owner only) |
| `DELETE` | `/:id` | ✅ | Delete group (owner only) |
| `POST` | `/:id/join` | ✅ | Join group |
| `POST` | `/:id/leave` | ✅ | Leave group |
| `GET` | `/:id/messages` | ✅ | Get group message history |
| `POST` | `/:id/messages` | ✅ | Send message to group |

---

## File Upload — `/api/messages/upload`

See [File Upload](./File_Upload.md) for full detail.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/upload` | ✅ | Upload file, image or audio — returns URL + waveform data for audio |

---

## See Also

- [Authentication](./Authentication.md)
- [File Upload](./File_Upload.md)
- [API Reference](../API/Rest_Api.md)
- [Middleware](./Middleware.md)

