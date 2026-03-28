# BurgerMenu

**File:** `src/components/BurgerMenu/BurgerMenu.tsx`

A hamburger menu button that opens a slide-out navigation drawer.

## Props

```typescript
interface BurgerMenuProps {
  isDark:       boolean;
  onPanelDemo?: () => void;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `isDark` | `boolean` | Theme flag for background and text colour |
| `onPanelDemo` | `function` | Optional callback wired to the "Panel Demo" menu item |

## Menu Items

| Label | Destination | Type | Condition |
|-------|-------------|------|-----------|
| Home | `/` | Link | Always |
| Widget Contacts | `/app/admin` | Link | Only if user has `isSupport: true` |
| Demo Components | `/demo` | Link | Always |
| Panel Demo | — | Button → calls `onPanelDemo` | Always |
| Read Documentation | `/docs` | Link | Always |
| Database Console | `/console` | Link | Always |
| Sign Out | — | Button → clears `localStorage` + routes to `/` | Always |

The **Widget Contacts** link is conditionally shown based on the user's `isSupport` status, fetched from `GET /api/users/me` on mount. This provides admin users with quick access to the [Admin Panel](../../../../Admin/index.md).

## Usage

```tsx
<BurgerMenu isDark={isDark} onPanelDemo={() => openPanelDemo()} />
```

