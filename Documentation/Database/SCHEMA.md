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
        String displayName
        String firstName
        String lastName
        String password
        String profileImage
        String coverImage
        Boolean showOnlineStatus
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

    MessageReaction {
        String id PK
        String messageId FK
        String userId FK
        String emoji
        DateTime createdAt
    }

    Conversation {
        String id PK
        String participantA FK
        String participantB FK
        String initiatorId
        String status
        DateTime createdAt
        DateTime updatedAt
    }

    Friendship {
        String id PK
        String requesterId FK
        String addresseeId FK
        String status
        DateTime createdAt
        DateTime updatedAt
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
    User ||--o{ MessageReaction : "reacts"
    User ||--o{ MessageEditHistory : "edits"
    User ||--o{ Conversation : "participantA"
    User ||--o{ Conversation : "participantB"
    User ||--o{ Friendship : "requests"
    User ||--o{ Friendship : "receives"
    User ||--o{ GroupMember : "belongs to"
    User ||--o{ Group : "owns"
    User ||--o{ GroupMessage : "sends"
    Message ||--o{ MessageReaction : "has"
    Message ||--o{ MessageEditHistory : "history"
    Group ||--o{ GroupMember : "has"
    Group ||--o{ GroupMessage : "contains"
```

## Models

### User

Represents a registered account.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | Unique identifier |
| email | String | Unique, nullable | Email address |
| phoneNumber | String | Nullable | E.164 format |
| username | String | Unique | Display handle (prefixed with `@`) |
| displayName | String | Nullable | User-chosen display name |
| firstName | String | Nullable | First name |
| lastName | String | Nullable | Last name |
| password | String | — | bcrypt hash |
| profileImage | String | Nullable | Relative URL path (local) or S3 URL |
| coverImage | String | Nullable | Relative URL path (local) or S3 URL |
| showOnlineStatus | Boolean | Default true | Whether this user's presence is visible to others |
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

**Relations:** `sentMessages`, `receivedMessages`, `groupMemberships`, `groupsOwned`, `sentGroupMessages`, `messageReactions`, `messageEdits`, `friendRequestsSent`, `friendRequestsRcvd`, `conversationsAsA`, `conversationsAsB`

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
| fileUrl | String | Nullable | Relative path or S3 URL to uploaded file |
| fileName | String | Nullable | Original filename |
| fileSize | Int | Nullable | Bytes |
| fileType | String | Nullable | MIME type |
| audioWaveform | Json | Nullable | Array of amplitude values `[0..1]` x 100 bars |
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

**Cascade:** Deleting a User cascades to all their sent and received Messages.

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

**Cascade:** Deleting a Message cascades to all its edit history rows.

---

### MessageReaction

Emoji reactions on messages. One reaction per user per message (unique constraint on `[messageId, userId]`).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | — |
| messageId | String | FK → Message | The reacted message |
| userId | String | FK → User | The user who reacted |
| emoji | String | — | The emoji character |
| createdAt | DateTime | Default now() | — |

**Unique constraint:** `[messageId, userId]`

**Indexes:** `messageId`, `userId`

**Cascade:** Deleting a Message cascades to all its reactions.

---

### Conversation

Tracks the state of a direct message conversation between two users. Created automatically when the first message is sent. Used to manage message requests.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | — |
| participantA | String | FK → User | First participant (normalised: lower UUID) |
| participantB | String | FK → User | Second participant |
| initiatorId | String | — | The user who sent the first message |
| status | String | Default `pending` | `pending` or `accepted` |
| createdAt | DateTime | Default now() | — |
| updatedAt | DateTime | Auto-updated | — |

**Unique constraint:** `[participantA, participantB]`

**Indexes:** `participantA`, `participantB`

**Cascade:** Deleting a User cascades to all their Conversations.

```mermaid
stateDiagram-v2
    [*] --> pending : First message sent
    pending --> accepted : Recipient replies or clicks Accept
    pending --> deleted : Recipient declines or nuke
    accepted --> deleted : Nuke conversation
    deleted --> [*]
```

---

### Friendship

Tracks friendship relationships between users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | — |
| requesterId | String | FK → User | User who sent the friend request |
| addresseeId | String | FK → User | User who received the friend request |
| status | String | Default `pending` | `pending`, `accepted`, or `blocked` |
| createdAt | DateTime | Default now() | — |
| updatedAt | DateTime | Auto-updated | — |

**Unique constraint:** `[requesterId, addresseeId]`

**Indexes:** `requesterId`, `addresseeId`

**Cascade:** Deleting a User cascades to all their Friendships.

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

## Call

Stores voice call records — created on initiation, updated on accept/reject/hangup/disconnect. See [Voice Calls](../Features/VOICE_CALLS.md).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | — |
| callerId | String | FK → User | User who initiated the call |
| receiverId | String | FK → User | User who was called |
| status | String | Default `"ringing"` | `ringing` \| `active` \| `ended` \| `missed` \| `rejected` \| `busy` |
| startedAt | DateTime? | — | When the call was accepted |
| endedAt | DateTime? | — | When the call ended |
| duration | Int? | — | Call length in seconds |
| createdAt | DateTime | Default now() | — |

**Indexes:** `[callerId]`, `[receiverId]`, `[callerId, receiverId, createdAt DESC]`

**Relations:** `User.callsMade` (CallsMade), `User.callsReceived` (CallsReceived)

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
