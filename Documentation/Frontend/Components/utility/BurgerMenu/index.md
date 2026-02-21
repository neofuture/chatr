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

| Label | Destination | Type |
|-------|-------------|------|
| Home | `/` | Link |
| Demo Components | `/demo` | Link |
| Panel Demo | — | Button → calls `onPanelDemo` |
| Read Documentation | `/docs` | Link |
| Database Console | `/console` | Link |
| Sign Out | — | Button → clears `localStorage` + routes to `/` |

## Usage

```tsx
<BurgerMenu isDark={isDark} onPanelDemo={() => openPanelDemo()} />
```

