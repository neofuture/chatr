# MobileLayout

**File:** `src/components/MobileLayout/MobileLayout.tsx`

The authenticated mobile app shell. Provides a top header bar, bottom navigation tabs, and an animated page wrapper. Enforces authentication — redirects to `/` if no valid session is found.

## Props

```typescript
interface MobileLayoutProps {
  children:       React.ReactNode;
  title:          string;
  onPanelDemo?:   () => void;
  headerAction?:  {
    icon:    string;
    onClick: () => void;
  };
}
```

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Page content rendered in the scrollable body area |
| `title` | `string` | Page title shown in the top header bar |
| `onPanelDemo` | `function` | Optional callback wired to the panel demo menu item in `BurgerMenu` |
| `headerAction` | `object` | Optional icon button rendered in the top-right of the header |

## Navigation Tabs

Bottom navigation bar with four tabs:

| Tab | Route | Icon |
|-----|-------|------|
| Messages | `/app` | `fa-comment` |
| Groups | `/app/groups` | `fa-users` |
| Updates | `/app/updates` | `fa-bell` |
| Settings | `/app/settings` | `fa-cog` |

## Auth Guard

On mount, reads `token` and `user` from `localStorage`. If either is missing, redirects to `/`. Shows a loading spinner while checking.

## Usage

```tsx
<MobileLayout title="Messages" headerAction={{ icon: 'fas fa-edit', onClick: newChat }}>
  <MessageList />
</MobileLayout>
```

