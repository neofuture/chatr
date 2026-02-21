# ChatMessageList

**File:** `src/components/ChatMessageList/ChatMessageList.tsx`

Fetches and displays message history between two users, with real-time updates via Socket.io. Auto-scrolls to the latest message.

## Internal Types

```typescript
interface Message {
  id:             string;
  senderId:       string;
  senderUsername: string;
  content:        string;
  type:           string;
  timestamp:      Date;
  status?:        'sent' | 'delivered' | 'read';
}
```

## Props

```typescript
interface ChatMessageListProps {
  recipientId:       string;
  recipientUsername: string;
  currentUserId:     string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `recipientId` | `string` | The other user's UUID — used for history fetch and socket room filtering |
| `recipientUsername` | `string` | Display name shown in the conversation header |
| `currentUserId` | `string` | The authenticated user's UUID — determines message direction |

## Data Loading

On mount, fetches `GET /api/messages/history?otherUserId={recipientId}&limit=50` with the JWT bearer token. The server automatically marks fetched messages as read.

## Socket.io Events Handled

| Event | Action |
|-------|--------|
| `message:received` | Appends new message to the list and scrolls to bottom |
| `message:status` | Updates the `status` field on the matching message |

## Usage

```tsx
<ChatMessageList
  recipientId="uuid-of-other-user"
  recipientUsername="johndoe"
  currentUserId="uuid-of-me"
/>
```

