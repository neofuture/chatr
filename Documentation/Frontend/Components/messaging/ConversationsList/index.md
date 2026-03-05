# ConversationsList

**File:** `src/components/messaging/ConversationsList.tsx`

Scrollable list of all users/conversations. Displays avatar, display name, last message or presence status (with animated flip between the two), online indicator, search box, and unread counts. Used as the first panel in the `/app` chat flow.

## Props

```typescript
interface Props {
  isDark: boolean;
  availableUsers: AvailableUser[];
  selectedUserId: string;
  userPresence: Record<string, PresenceInfo>;
  conversations: Record<string, ConversationSummary>;
  currentUserId: string;
  onSelectUser: (id: string) => void;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `isDark` | `boolean` | Dark/light theme flag |
| `availableUsers` | `AvailableUser[]` | Full user list from the server |
| `selectedUserId` | `string` | Currently selected user ID (highlighted row) |
| `userPresence` | `Record<string, PresenceInfo>` | Live presence map keyed by user ID |
| `conversations` | `Record<string, ConversationSummary>` | Last message / unread count per user |
| `currentUserId` | `string` | Logged-in user's ID (used to determine sent/received direction) |
| `onSelectUser` | `(id: string) => void` | Called when a row is clicked |

## Sorting

1. Users with conversations are sorted by `lastMessageAt` descending (most recent first)
2. Users without conversations are sorted alphabetically by display name

## Search

Real-time client-side search filtering on `displayName`, `username`, and `email`.

## Flip Animation

Each row's subtitle alternates between the last message and the presence/last-seen label every 5 seconds using the `FlipText` component (rolodex-style vertical scroll).

## Presence

- Online users show a green dot on their avatar via `PresenceAvatar`
- Offline/away users show a grey dot
- Users who have enabled **Hide Online Status** show no dot and no last-seen text

## Storybook

`Messaging/ConversationsList` — Default, WithSelected, Empty, AllOnline stories.

