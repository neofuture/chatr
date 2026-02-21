# Database Schema

## Overview

The database is PostgreSQL, managed via Prisma ORM. All IDs are UUIDs. Timestamps are UTC.

## Models

### User

Represents a registered account.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | Unique identifier |
| email | String | Unique, nullable | Email address |
| phoneNumber | String | Nullable | E.164 format |
| username | String | Unique | Display handle |
| password | String | — | bcrypt hash |
| profileImage | String | Nullable | Relative URL path |
| coverImage | String | Nullable | Relative URL path |
| twoFactorSecret | String | Nullable | TOTP secret |
| twoFactorEnabled | Boolean | Default false | 2FA active flag |
| emailVerified | Boolean | Default false | Email confirmed |
| phoneVerified | Boolean | Default false | Phone confirmed |
| emailVerificationCode | String | Nullable | OTP code |
| phoneVerificationCode | String | Nullable | OTP code |
| verificationExpiry | DateTime | Nullable | Code expiry |
| passwordResetCode | String | Nullable | Reset OTP |
| passwordResetExpiry | DateTime | Nullable | Reset expiry |
| loginVerificationCode | String | Nullable | Login OTP |
| loginVerificationExpiry | DateTime | Nullable | Login OTP expiry |
| loginVerificationMethod | String | Nullable | `email` or `sms` |
| lastSeen | DateTime | Nullable | Last active time |
| createdAt | DateTime | Default now() | — |
| updatedAt | DateTime | Auto-updated | — |

**Relations:** `sentMessages`, `receivedMessages`, `groupMemberships`, `groupsOwned`, `sentGroupMessages`

---

### Message

A direct message between two users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | — |
| senderId | String | FK → User | Message author |
| recipientId | String | FK → User | Message target |
| content | String | — | Text body (or filename for files) |
| type | String | Default `text` | `text`, `image`, `file`, `audio`, `voice` |
| status | String | Default `sent` | `sent`, `delivered`, `listening`, `listened` |
| isRead | Boolean | Default false | Read flag |
| readAt | DateTime | Nullable | When read |
| createdAt | DateTime | Default now() | — |
| fileUrl | String | Nullable | Relative path to uploaded file |
| fileName | String | Nullable | Original filename |
| fileSize | Int | Nullable | Bytes |
| fileType | String | Nullable | MIME type |
| audioWaveform | Json | Nullable | Array of amplitude values `[0..1]` × 100 bars |
| audioDuration | Float | Nullable | Duration in seconds |

**Indexes:** `senderId`, `recipientId`

**Status lifecycle:**
```
sent → delivered → listening → listened   (audio/voice messages)
sent → delivered → read                   (text/image/file messages)
```

---

### GroupMessage

A message posted to a group channel.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | — |
| groupId | String | FK → Group | Target group |
| senderId | String | FK → User | Author |
| content | String | — | Message body |
| type | String | Default `text` | Message type |
| createdAt | DateTime | Default now() | — |

**Indexes:** `groupId`, `senderId`

---

### Group

A named multi-user channel.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | — |
| name | String | — | Group name |
| description | String | Nullable | — |
| ownerId | String | FK → User | Creator |
| createdAt | DateTime | Default now() | — |
| updatedAt | DateTime | Auto-updated | — |

**Relations:** `members` (GroupMember[]), `messages` (GroupMessage[])

---

### GroupMember

Join table between User and Group.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | — |
| userId | String | FK → User | — |
| groupId | String | FK → Group | — |
| joinedAt | DateTime | Default now() | — |

**Unique constraint:** `[userId, groupId]`

---

## Migrations

Migrations are managed by Prisma and stored in `backend/prisma/migrations/`. To apply pending migrations:

```bash
npx prisma migrate deploy    # production
npx prisma migrate dev       # development (also runs codegen)
```

To inspect the current schema state:

```bash
npx prisma studio            # opens browser-based DB explorer
```

## Connection

The database URL is set via environment variable:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

Prisma generates a type-safe client from the schema. Import it as:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

