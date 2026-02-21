# CoverImageCropper

**File:** `src/components/image-manip/CoverImageCropper/CoverImageCropper.tsx`

An interactive crop tool for cover/banner images. Renders a 600×300 draggable/zoomable canvas with a rectangular 2:1 crop mask.

## Props

```typescript
interface CoverImageCropperProps {
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
| `isDark` | `boolean` | Theme flag |

Functionally identical to `ProfileImageCropper` but uses a 600×300 (2:1) crop box rather than square.

