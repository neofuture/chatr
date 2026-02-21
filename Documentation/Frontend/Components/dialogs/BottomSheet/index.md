# BottomSheet

**File:** `src/components/dialogs/BottomSheet/BottomSheet.tsx`

A slide-up panel anchored to the bottom of the screen. Renders into a React portal. Supports configurable height modes, optional title bar, and backdrop dismiss.

## Types

```typescript
type HeightMode = 'full' | 'fixed' | 'auto';

interface BottomSheetProps {
  isOpen:           boolean;
  onClose?:         () => void;
  children:         React.ReactNode;
  heightMode?:      HeightMode;
  fixedHeight?:     string;
  showCloseButton?: boolean;
  title?:           string;
  className?:       string;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | required | Controls visibility |
| `onClose` | `function` | — | Called on backdrop click or close button press |
| `heightMode` | `HeightMode` | `'fixed'` | `'full'` = 100vh · `'fixed'` = `fixedHeight` value · `'auto'` = content height |
| `fixedHeight` | `string` | `'60vh'` | CSS height value, used when `heightMode='fixed'` |
| `showCloseButton` | `boolean` | `true` | Renders a ✕ close button in the header |
| `title` | `string` | — | Title text rendered in the header bar |
| `className` | `string` | `''` | Additional CSS class on the sheet container |

## Animation

Slides in from the bottom on open, slides out downward on close. Uses a short delay between state change and unmount to allow the exit animation to complete.

## Usage

```tsx
<BottomSheet
  isOpen={showSheet}
  onClose={() => setShowSheet(false)}
  title="Select attachment"
  heightMode="auto"
>
  <AttachmentOptions />
</BottomSheet>
```

