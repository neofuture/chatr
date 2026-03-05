# EmojiPicker

**File:** `src/components/EmojiPicker/EmojiPicker.tsx`

Full-featured emoji picker with category navigation, search, recently-used panel, and infinite-scroll display. Designed to be triggered by a button in `MessageInput`.

## Props

```typescript
interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isDark?: boolean;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSelect` | `(emoji: string) => void` | required | Called with the emoji character when the user picks one |
| `onClose` | `() => void` | required | Called when the picker should close |
| `isDark` | `boolean` | `true` | Dark/light theme flag |

## Features

### Category Tabs
Horizontal scrollable tab bar at the top with Font Awesome icons for each category:
- Smileys, People, Animals, Food, Travel, Activities, Objects, Symbols, Flags

### Recently Used
Automatically persists the last 32 used emojis in `localStorage` under the key `recentEmojis`. Shows as the first section.

### Search
Filters all emoji names and keywords in real time. Results are grouped by category with sticky headers.

### Infinite Scroll / Sticky Headers
Categories are rendered as a continuous scrollable list. As the user scrolls, the active category tab updates. Clicking a tab smooth-scrolls to that category header.

### Animations
Opens and closes with a CSS scale + fade animation.

## Emoji Data

Defined in `src/components/EmojiPicker/emojiData.ts`:

```typescript
interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
}

interface EmojiData {
  [category: string]: EmojiItem[];
}
```

## Accessibility

- Each emoji button has an `aria-label` set to the emoji name
- Tab list uses `role="tablist"` with `role="tab"` buttons
- Keyboard navigation follows standard button/focus conventions

## Storybook

`Messaging/EmojiPicker` — Default, Search, RecentlyUsed stories.

