# Lib

Utility and service modules in `frontend/src/lib/`.

---

## `api.ts`

Typed fetch wrapper for all REST API calls. Reads `NEXT_PUBLIC_API_URL` for the base URL.

```typescript
import { api } from '@/lib/api';

// Auth
await api.auth.register(email, username, password);
await api.auth.login(email, password, twoFactorCode?, verificationMethod?);
await api.auth.setup2FA(userId);
await api.auth.verify2FA(userId, code);

// Users
await api.users.search(query, token);
await api.users.getProfile(username, token);
await api.users.updateProfile(data, token);
```

All methods throw on non-2xx responses with the server's `error` message.

---

## `db.ts`

Dexie (IndexedDB) database definition. Stores offline data for use when the network is unavailable.

```typescript
import { db } from '@/lib/db';
```

### Tables

| Table | Key | Description |
|---|---|---|
| `messages` | `id` | Offline-queued messages waiting to sync |
| `users` | `id` | Cached user records |
| `groups` | `id` | Cached group records |
| `profileImages` | `userId` | Profile image blobs |
| `coverImages` | `userId` | Cover image blobs |

### Types

```typescript
interface OfflineMessage {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  createdAt: Date;
  synced: boolean;
  localOnly?: boolean;
}

interface ProfileImage {
  userId: string;
  imageData: Blob;
  mimeType: string;
  uploadedAt: Date;
  synced: boolean;
  url?: string;
  thumbnail?: Blob;
}
```

---

## `offline.ts`

High-level offline queue API built on top of `db.ts`.

```typescript
import {
  saveMessageOffline,
  getUnsyncedMessages,
  getOfflineMessages,
  markMessageSynced,
  syncOfflineMessages,
} from '@/lib/offline';

// Queue a message while offline
await saveMessageOffline(message);

// Get all messages pending sync
const pending = await getUnsyncedMessages();

// Get messages for a conversation
const msgs = await getOfflineMessages(recipientId?, groupId?);

// Mark a message as synced
await markMessageSynced(messageId);

// Replay all unsynced messages to the server (called by useOfflineSync)
await syncOfflineMessages(token);
```

`syncOfflineMessages` POSTs each unsynced message to `/api/messages` and calls `markMessageSynced` on success.

---

## `auth.ts` / `authUtils.ts`

Token storage helpers. `authUtils.ts` exposes:

```typescript
import { saveAuthToken, clearAuthToken } from '@/lib/authUtils';

saveAuthToken(token);   // Writes to localStorage, triggers WebSocket reconnect
clearAuthToken();       // Removes token + user, triggers WebSocket disconnect
```

`auth.ts` provides server-side token verification helpers used by middleware.

---

## `profileImageService.ts`

```typescript
import { getProfileImageURL, uploadProfileImage } from '@/lib/profileImageService';

const url = await getProfileImageURL(userId);
// Returns server URL or falls back to IndexedDB blob URL or default
```

Checks IndexedDB first (for offline use), then falls back to the server URL, then to `/profile/default-profile.jpg`.

---

## `coverImageService.ts`

Same pattern as `profileImageService.ts` but for cover images.

```typescript
import { getCoverImageURL, uploadCoverImage } from '@/lib/coverImageService';
```

---

## See Also

- [useOfflineSync hook](../Hooks/useOfflineSync.md)
- [Database Schema](../../Database/Schema.md)
- [File Upload](../../Backend/File_Upload.md)

