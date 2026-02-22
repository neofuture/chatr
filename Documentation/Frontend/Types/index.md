# Types

**File:** `frontend/src/types/index.ts`

Shared TypeScript interfaces used across the frontend.

---

## Core Types

```typescript
interface User {
  id: string;
  email: string;
  username: string;       // Always prefixed with @
  createdAt: string;
}

interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  createdAt: string;
  read: boolean;
}

interface Group {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}
```

---

## Usage

These types are imported directly from `@/types`:

```typescript
import type { User, Message, Group, AuthResponse } from '@/types';
```

---

## See Also

- [Database Schema](../../Database/Schema.md) — server-side Prisma models
- [API Reference](../../API/Rest_Api.md) — response shapes

