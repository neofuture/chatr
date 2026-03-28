# Admin — Widget Contact Management

The admin panel lets support users view, review, and manage widget chat contacts from within the Chatr app.

## Access Control

The admin panel is restricted to users with the `isSupport` flag set to `true` in the database.

- The **burger menu** in the app conditionally shows a "Widget Contacts" link — it fetches the current user's `isSupport` status from `GET /api/users/me` on mount
- All admin API endpoints use `authenticateToken` middleware plus a `requireSupport` check that queries `prisma.user.findUnique` for the requesting user's `isSupport` field
- Non-support users receive a `403 Support access required` response

## API Endpoints

All routes are mounted at `/api/admin` and defined in `backend/src/routes/admin.ts`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/widget-contacts` | JWT + Support | List all guest users with message counts and first message preview |
| GET | `/api/admin/widget-contacts/:guestId/messages` | JWT + Support | Fetch full conversation for a specific guest |
| DELETE | `/api/admin/widget-contacts/:guestId` | JWT + Support | Delete a guest and cascade-delete all their messages and conversations |

### GET /widget-contacts

Returns an array of guest contacts sorted by creation date (newest first). Each contact includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Guest user ID |
| `name` | string | Guest display name |
| `contactEmail` | string \| null | Email provided during widget session |
| `createdAt` | string | ISO timestamp of guest creation |
| `hasConversation` | boolean | Whether any messages exist |
| `totalMessages` | number | Sum of sent + received messages |
| `firstMessage` | object \| null | `{ content, createdAt }` of the first sent message |

### GET /widget-contacts/:guestId/messages

Returns the guest info and all messages (sent and received) ordered chronologically.

```json
{
  "guest": { "id": "...", "displayName": "Sarah", "contactEmail": "sarah@example.com" },
  "messages": [
    {
      "id": "msg-1",
      "content": "Hi, I need help",
      "type": "text",
      "senderId": "guest-id",
      "recipientId": "agent-id",
      "createdAt": "2026-03-27T10:01:00Z",
      "sender": { "displayName": "Sarah", "isGuest": true, "isSupport": false }
    }
  ]
}
```

### DELETE /widget-contacts/:guestId

Cascade deletes in order:
1. All messages where the guest is sender or recipient
2. All conversations where the guest is a participant
3. The guest user record itself

Returns `{ "success": true }` on success.

## Frontend UI

The admin page is at `/app/admin` (`frontend/src/app/app/admin/page.tsx`).

### Layout

- **Resizable split panel** — contact list on the left (default 240px, min 180px), message viewer on the right (flex-grows to fill)
- A **draggable divider** with a visible pill indicator separates the two panels; drag to resize
- The app layout hides the bottom nav bar and replaces the burger menu with a back chevron when on the admin page

### States

| State | What the user sees |
|-------|--------------------|
| Loading | "Loading contacts…" in the contact list |
| Empty | Full-page empty state: inbox icon, "No widget contacts yet" |
| Error (403) | Lock icon with "Support access required" |
| Contacts loaded | Contact cards with name, email, message count, first message preview, and delete button |
| Contact selected | Right panel shows guest name, email link, and full message history |
| Messages loading | "Loading messages…" in the detail panel |

### Contact Cards

Each card displays:
- Guest display name (or "Anonymous")
- Contact email (if provided) with envelope icon
- Message count badge or "No conversation" muted badge
- First message content preview
- Trash icon button for deletion (with confirmation dialog)

### Message Viewer

Messages are rendered as chat bubbles — guest messages aligned left, agent messages aligned right. Each bubble shows the sender name, content, and formatted timestamp.

## Screenshots

Automated Playwright screenshots are captured by `scripts/take-screenshots.ts` and used on the marketing website's features page.

| File | Viewport | Content |
|------|----------|---------|
| `44-admin-empty.png` | 600×450 @2x | Empty contacts list — "No widget contacts yet" |
| `45-admin-contacts.png` | 600×450 @2x | Contacts list with a guest selected and conversation visible |

The script ensures `userA` has `isSupport: true` via a Prisma update before navigating to `/app/admin`. For `45-admin-contacts.png`, it clicks the first contact card to show the conversation panel.

## Testing

### Backend

`backend/src/__tests__/admin.test.ts` — 13 tests covering:
- Auth (401 without token, 403 for non-support users)
- All three endpoints (empty results, populated results, 404 for missing guests)
- Cascade delete verification (checks `deleteMany` and `delete` calls)

### Frontend

`frontend/src/app/app/admin/admin.test.tsx` — 8 tests covering:
- Empty state, error state, and populated contact list rendering
- Contact click triggers message fetch
- Message rendering after selection
- Delete button triggers delete endpoint
- Resize divider presence in DOM
- Placeholder state when no contact selected
