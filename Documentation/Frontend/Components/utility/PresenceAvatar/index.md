# PresenceAvatar

**File:** `src/components/PresenceAvatar/PresenceAvatar.tsx`

Circular avatar with an online/offline status dot overlaid on the bottom-right corner. Falls back to an orange-background initials avatar when no profile image is available.

## Props

```typescript
interface PresenceAvatarProps {
  src?: string | null;
  displayName: string;
  size?: number;
  presence?: PresenceInfo | null;
  showPresence?: boolean;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string \| null` | `null` | Profile image URL; falls back to initials when absent |
| `displayName` | `string` | required | Used to derive initials (first letter of first + last name) |
| `size` | `number` | `40` | Diameter in pixels |
| `presence` | `PresenceInfo \| null` | `null` | Presence object — controls dot colour |
| `showPresence` | `boolean` | `true` | Whether to show the status dot at all |

## Dot Colours

| Status | Colour |
|--------|--------|
| `online` | Green (`#22c55e`) |
| `away` | Amber (`#f59e0b`) |
| `offline` | Grey (`#64748b`) |
| Hidden (`hidden: true`) | No dot |

## Fallback Avatar

When `src` is null/empty, renders a circle with an orange gradient background and white initials derived from `displayName`.

## Storybook

`Utility/PresenceAvatar` — all presence states, image vs. fallback stories.

