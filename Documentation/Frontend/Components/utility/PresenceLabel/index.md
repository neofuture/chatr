# PresenceLabel

**File:** `src/components/PresenceLabel/PresenceLabel.tsx`

Renders a human-readable presence or last-seen label for a user. Used in conversation list rows and panel title bars.

## Props

```typescript
interface PresenceLabelProps {
  presence?: PresenceInfo | null;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `presence` | `PresenceInfo \| null` | `null` | Presence data for the user |
| `showDot` | `boolean` | `false` | Whether to show a coloured status dot before the label |
| `size` | `'sm' \| 'md' \| 'lg'` | `'sm'` | Text size variant |

## Label Logic (exported as `formatPresence`)

```typescript
export function formatPresence(presence: PresenceInfo | null | undefined): string
```

| Condition | Label |
|-----------|-------|
| `status === 'online'` | `"Online"` |
| `hidden === true` | `""` (empty string — do not show) |
| `lastSeen < 60 s` | `"Last seen X seconds ago"` |
| `lastSeen < 60 min` | `"Last seen X minutes ago"` |
| `lastSeen < 3 hr` | `"Last seen X hours ago"` |
| `lastSeen < 24 hr` | `"Last seen at HH:MM"` |
| `lastSeen ≥ 24 hr` | `"Last seen on DD/MM at HH:MM"` |
| `lastSeen === null` | `"Offline"` |

## Storybook

`Utility/PresenceLabel` — Online, Offline, RecentlySeen, HiddenStatus stories.

