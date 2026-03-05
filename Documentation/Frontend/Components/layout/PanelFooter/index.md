# PanelFooter

**File:** `src/components/PanelFooter/PanelFooter.tsx`

A thin footer bar rendered at the bottom of slide-in panels. Wraps arbitrary `children` — typically a `MessageInput` or action buttons — in a consistently styled container that matches the `BottomNav` height and background.

## Props

```typescript
interface PanelFooterProps {
  children: React.ReactNode;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Content to render in the footer (input bar, buttons, etc.) |

## Usage

```tsx
<PanelFooter>
  <MessageInput recipientId={userId} isDark={isDark} />
</PanelFooter>
```

## CSS

Styled via `PanelFooter.module.css`. Matches the height and background colour of `BottomNav` so panels feel visually consistent with the main layout.

## Storybook

`Layout/PanelFooter` — WithButtons, Empty, and WithText stories.

