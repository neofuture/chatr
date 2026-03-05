# BottomNav

**File:** `src/components/BottomNav/BottomNav.tsx`

Fixed bottom navigation bar used on mobile viewports (≤768 px). Provides tab-based navigation between Chats, Groups, and Settings. Displays the current user's profile avatar and highlights the active route.

## Usage

```tsx
<BottomNav />
```

No props — reads active route via `usePathname()` and theme via `useTheme()`.

## Behaviour

- **Active route**: the current pathname is matched against `/app`, `/app/groups`, and `/app/settings`; the matching tab is highlighted in orange
- **Profile image**: loaded from local cache via `getProfileImageURL` on mount; re-fetches on `profileImageUpdated` custom DOM events
- **Animations**: tab transitions use Framer Motion for a smooth active indicator

## Tabs

| Tab | Route | Icon |
|-----|-------|------|
| Chats | `/app` | `fa-comments` |
| Groups | `/app/groups` | `fa-users` |
| Settings | `/app/settings` | `fa-cog` |

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

