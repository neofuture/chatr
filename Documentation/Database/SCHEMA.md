# Database Schema

## Overview

The database is PostgreSQL 16, managed via Prisma ORM. All IDs are UUIDs generated with `uuid()`. Timestamps are UTC. The schema is defined in `backend/prisma/schema.prisma`.

## Entity Relationship Diagram

```mermaid
erDiagram
    User {
        String id PK
        String email UK
        String phoneNumber
        String username UK
        String password
        String profileImage
        String coverImage
        String twoFactorSecret
        Boolean twoFactorEnabled
        Boolean emailVerified
        Boolean phoneVerified
        DateTime lastSeen
        DateTime createdAt
        DateTime updatedAt
    }

    Message {
        String id PK
        String senderId FK
        String recipientId FK
        String content
        String type
        String status
        Boolean isRead
        DateTime readAt
        String fileUrl
        String fileName
        Int fileSize
        String fileType
        Json audioWaveform
        Float audioDuration
        DateTime deletedAt
        Boolean edited
        DateTime editedAt
        DateTime createdAt
    }

    MessageEditHistory {
        String id PK
        String messageId FK
        String editedById FK
        String previousContent
        DateTime editedAt
    }

    Group {
        String id PK
        String name
        String description
        String ownerId FK
        DateTime createdAt
        DateTime updatedAt
    }

    GroupMember {
        String id PK
        String userId FK
        String groupId FK
        DateTime joinedAt
    }

    GroupMessage {
        String id PK
        String groupId FK
        String senderId FK
        String content
        String type
        DateTime createdAt
    }

    User ||--o{ Message : "sends (Sender)"
    User ||--o{ Message : "receives (Recipient)"
    User ||--o{ GroupMember : "belongs to"
    User ||--o{ Group : "owns"
    User ||--o{ GroupMessage : "sends"
    User ||--o{ MessageEditHistory : "edits"
    Group ||--o{ GroupMember : "has"
    Group ||--o{ GroupMessage : "contains"
    Message ||--o{ MessageEditHistory : "history"
```

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

**Relations:** `sentMessages`, `receivedMessages`, `groupMemberships`, `groupsOwned`, `sentGroupMessages`, `messageReactions`, `messageEdits`

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
| deletedAt | DateTime | Nullable | Set when unsent (soft-delete) |
| edited | Boolean | Default false | Whether the message has been edited |
| editedAt | DateTime | Nullable | Timestamp of the most recent edit |
| replyToId | String | Nullable | ID of the quoted message |
| replyToContent | String | Nullable | Snapshot of quoted content |
| replyToSenderName | String | Nullable | Snapshot of quoted sender name |
| replyToType | String | Nullable | Type of the quoted message |
| replyToDuration | Float | Nullable | Duration (audio replies) |

**Relations:** `reactions` (MessageReaction[]), `editHistory` (MessageEditHistory[])

**Indexes:** `senderId`, `recipientId`

**Status lifecycle:**
```
sent → delivered → listening → listened   (audio/voice messages)
sent → delivered → read                   (text/image/file messages)
```

---

### MessageEditHistory

Immutable audit log — one row is appended for **every edit**, storing the content **before** that edit. Rows are never deleted. Required for legal/compliance retention.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | — |
| messageId | String | FK → Message | The message that was edited |
| editedById | String | FK → User | The user who made the edit (always the sender) |
| previousContent | String | — | The message body **before** this edit |
| editedAt | DateTime | Default now() | When the edit was applied |

**Indexes:** `messageId`, `editedById`

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

