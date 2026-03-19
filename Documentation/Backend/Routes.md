# Routes

All Express route files live in `backend/src/routes/`.

| File | Mount | Description |
|---|---|---|
| `auth.ts` | `/api/auth` | Register, login, 2FA, email/SMS verification, password reset |
| `users.ts` | `/api/users` | Profile, search, username check, profile/cover image upload |
| `messages.ts` | `/api/messages` | Message history, conversations list |
| `groups.ts` | `/api/groups` | Group CRUD, membership, group messages |
| `file-upload.ts` | `/api/messages/upload` | File, image, and video upload (with optional caption) |
| `dashboard.ts` | `/api/dashboard` | Developer dashboard metrics |
| `friends.ts` | `/api/friends` | Friend requests, friend list, search, accept/decline, block/unblock |
| `conversations.ts` | `/api/conversations` | Message request management (accept, decline, nuke) |

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

## Friends Routes — `/api/friends`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✅ | List accepted friends |
| `GET` | `/requests/incoming` | ✅ | Incoming friend requests |
| `GET` | `/requests/outgoing` | ✅ | Outgoing friend requests |
| `GET` | `/search` | ✅ | Search users to add as friends |
| `GET` | `/blocked` | ✅ | List blocked users |
| `POST` | `/request` | ✅ | Send a friend request |
| `POST` | `/:friendshipId/accept` | ✅ | Accept a friend request |
| `POST` | `/:friendshipId/decline` | ✅ | Decline or cancel a request |
| `DELETE` | `/:friendshipId` | ✅ | Remove a friend |
| `POST` | `/:targetUserId/block` | ✅ | Block a user |
| `POST` | `/:targetUserId/unblock` | ✅ | Unblock a user |

---

## Conversation Routes — `/api/conversations`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/:id/accept` | ✅ | Accept a message request |
| `POST` | `/:id/decline` | ✅ | Decline a message request (deletes messages) |
| `POST` | `/:id/nuke` | ✅ | Full conversation reset (deletes conversation + messages) |
| `POST` | `/nuke-by-user/:recipientId` | ✅ | Nuke by participant IDs |

---

## Dashboard Route — `/api/dashboard`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ❌ | Full developer dashboard (git stats, LOC, architecture, health gauges, code churn, commit streaks, code ownership, stale files, untested components, Prisma complexity, contribution heatmap) |
| `POST` | `/invalidate` | ❌ | Force-clear the 5-minute dashboard cache |

The dashboard endpoint runs multiple `git` commands (`log`, `branch`, `tag`, `diff`), reads the filesystem (`du`, `find`, `wc`), and parses `schema.prisma` to build a comprehensive project metrics payload. Results are cached in-memory for 5 minutes.

---

## Test Cleanup Routes — `/api/test`

These endpoints are only available when the server is running in test mode (enabled via `POST /api/test/enable`). They are used by E2E tests to manage test data.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/enable` | ❌ | Enable test mode |
| `POST` | `/disable` | ❌ | Disable test mode |
| `POST` | `/cleanup` | ❌ | Clean up test groups and messages for a specific user |
| `POST` | `/cleanup-all` | ❌ | Aggressive cleanup of all groups matching E2E prefixes |
| `DELETE` | `/user/:userId` | ❌ | Delete a test user and all related data (messages, groups, friendships, conversations) |

### Contact Route — `/api/contact`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/contact` | ❌ | Submit a contact form message (stored in database) |

---

## See Also

- [Authentication](./Authentication.md)
- [File Upload](./File_Upload.md)
- [API Reference](../API/REST_API.md)
- [Middleware](./Middleware.md)

