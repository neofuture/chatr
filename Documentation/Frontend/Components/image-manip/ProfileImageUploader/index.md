# ProfileImageUploader

**File:** `src/components/image-manip/ProfileImageUploader/ProfileImageUploader.tsx`

Handles the full profile picture workflow: file selection, crop via `ProfileImageCropper`, local IndexedDB storage, and server upload.

## Props

```typescript
interface ProfileImageUploaderProps {
  userId: string;
  isDark: boolean;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `userId` | `string` | Authenticated user UUID — used as storage key and in the upload endpoint |
| `isDark` | `boolean` | Theme flag for hover overlay styling |

## Workflow

```
1. User hovers avatar → edit overlay appears
2. User clicks → file picker opens
3. File selected → ProfileImageCropper opens
4. User confirms crop → croppedFile returned
5. Image saved to IndexedDB via profileImageService
6. Image uploaded to POST /api/users/profile-image
7. Custom DOM event 'profileImageUpdated' dispatched
```

## File Constraints

| Constraint | Value |
|-----------|-------|
| Accepted types | JPEG, PNG, GIF, WebP |
| Max size | 5MB |
| Crop output | Square (1:1) |

