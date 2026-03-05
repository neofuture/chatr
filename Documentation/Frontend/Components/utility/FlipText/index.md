# FlipText

**File:** `src/components/FlipText/FlipText.tsx`

Animates between two text values with a rolodex-style vertical scroll. Used in `ConversationsList` to alternate between the last message and the user's presence/last-seen label.

## Props

```typescript
interface FlipTextProps {
  textA: string;
  textB: string;
  interval?: number;
  className?: string;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `textA` | `string` | required | First text value (shown initially and after each even flip) |
| `textB` | `string` | required | Second text value (shown after each odd flip) |
| `interval` | `number` | `5000` | Milliseconds between flips |
| `className` | `string` | — | Optional CSS class to apply to the container |

## Animation

The component maintains a three-slot virtual ticker:
1. **Slot 0** — the text that just scrolled off the top
2. **Slot 1** — the currently visible text
3. **Slot 2** — the next text waiting below

On each tick:
1. Slot 2 is set to the new text
2. The ticker translates upward by one slot height (CSS transition)
3. After the transition completes, the slots are recycled without animation

This ensures the text is always updated in the hidden slot before the scroll, giving a seamless flip effect in both directions.

## Storybook

`Utility/FlipText` — Default, FastInterval, SingleWord stories.

