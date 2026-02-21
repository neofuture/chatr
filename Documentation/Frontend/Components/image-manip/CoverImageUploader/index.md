# CoverImageUploader

**File:** `src/components/image-manip/CoverImageUploader/CoverImageUploader.tsx`

Handles the full cover/banner photo workflow: file selection, crop via `CoverImageCropper`, local IndexedDB storage, and server upload.

## Props

```typescript
interface CoverImageUploaderProps {
  userId: string;
  isDark: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `userId` | `string` | Authenticated user UUID |
| `isDark` | `boolean` | Theme flag |

## Workflow

```
1. User hovers cover area → edit overlay appears
2. User clicks → file picker opens
3. File selected → CoverImageCropper opens
4. User confirms crop → croppedFile returned
5. Image saved to IndexedDB via coverImageService
6. Image uploaded to POST /api/users/cover-image
7. Custom DOM event 'coverImageUpdated' dispatched
```

## File Constraints

| Constraint | Value |
|-----------|-------|
| Accepted types | JPEG, PNG, WebP |
| Max size | 10MB |
| Crop output | Landscape (3:1) |

