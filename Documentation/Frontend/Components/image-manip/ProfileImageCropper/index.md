# ProfileImageCropper

**File:** `src/components/image-manip/ProfileImageCropper/ProfileImageCropper.tsx`

An interactive crop tool for profile images. Renders a 400×400 draggable/zoomable canvas with a circular crop mask.

## Props

```typescript
interface ProfileImageCropperProps {
  imageFile:      File;
  onCropComplete: (croppedFile: File) => void;
  onCancel:       () => void;
  isDark:         boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `imageFile` | `File` | The raw image File to crop |
| `onCropComplete` | `function` | Called with the cropped `File` on confirm |
| `onCancel` | `function` | Called when user dismisses without cropping |
| `isDark` | `boolean` | Theme flag for UI styling |

## Behaviour

- Image rendered on a `<canvas>` element
- User can drag to reposition and pinch/scroll to zoom
- Circular overlay indicates the crop area
- Output is a square `File` at the canvas resolution

