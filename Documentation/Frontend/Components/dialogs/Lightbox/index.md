# Lightbox

**File:** `src/components/Lightbox/Lightbox.tsx`

A full-screen image viewer overlay. Locks body scroll while open and supports `Escape` key to dismiss.

## Props

```typescript
interface LightboxProps {
  imageUrl:   string;
  imageName?: string;
  isOpen:     boolean;
  onClose:    () => void;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `imageUrl` | `string` | URL of the image to display |
| `imageName` | `string` | Optional caption shown below the image |
| `isOpen` | `boolean` | Controls visibility |
| `onClose` | `function` | Called on backdrop click or `Escape` key |

## Behaviour

- Sets `document.body.style.overflow = 'hidden'` while open
- Cleans up overflow on close or unmount
- `Escape` key listener attached while open

## Usage

```tsx
<Lightbox
  isOpen={lightboxOpen}
  imageUrl={lightboxUrl}
  imageName={lightboxName}
  onClose={() => setLightboxOpen(false)}
/>
```

