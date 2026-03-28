# BottomNav

**File:** `src/components/BottomNav/BottomNav.tsx`

Fixed bottom navigation bar used on mobile viewports (≤768 px). Provides tab-based navigation between Chats, Groups, and Settings. Displays the current user's profile avatar and highlights the active route.

## Usage

```tsx
<BottomNav />
```

No props — reads active route via `usePathname()` and theme via `useTheme()`.

## Behaviour

- **Active route**: the current pathname is matched against `/app`, `/app/friends`, `/app/groups`, and `/app/profile`; the matching tab is highlighted in orange
- **Profile image**: loaded via a three-tier fallback:
  1. **IndexedDB** — `getProfileImageURL(userId)` checks the local cache first
  2. **UserSettingsContext** — `profileImageUrl` from the API (fetched via WebSocket on connect)
  3. **localStorage** — `user.profileImage` from the stored user object
- **Sync refresh**: listens for `profileImageUpdated` DOM events dispatched by `syncProfileImageFromServer` after the server URL changes, triggering a re-fetch from IndexedDB
- **Context dependency**: the effect re-runs when `ctxProfileImage` changes, ensuring the avatar updates as soon as the API returns fresh data
- **Animations**: tab transitions use Framer Motion for a smooth active indicator
- **Unread badges**: Chats tab shows combined DM + group unread count; Friends tab shows pending friend request count

## Tabs

| Tab | Route | Icon |
|-----|-------|------|
| Chats | `/app` | `fa-comments` |
| Friends | `/app/friends` | `fa-user-group` |
| Groups | `/app/groups` | `fa-users` |
| User | `/app/profile` | Profile image |

## CSS

Styled via `BottomNav.module.css`. Key variables consumed from `:root`:

| Variable | Purpose |
|----------|---------|
| `--color-bg-secondary` | Bar background |
| `--color-border` | Top border |
| `--color-accent` | Active tab colour |
| `--color-text-muted` | Inactive tab colour |

## Storybook

`Layout/BottomNav` — Dark and Light stories.

