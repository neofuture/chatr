import { db, CoverImage } from './db';

/**
 * Cover Image Service
 * Handles local storage and server sync of cover images
 */

/**
 * Save cover image to local storage (IndexedDB via Dexie)
 */
export async function saveCoverImageLocally(
  userId: string,
  imageFile: File
): Promise<void> {
  // Create thumbnail (optional but recommended for performance)
  const thumbnail = await createThumbnail(imageFile, 300, 150);

  const coverImage: CoverImage = {
    userId,
    imageData: imageFile,
    mimeType: imageFile.type,
    uploadedAt: new Date(),
    synced: false,
    thumbnail,
  };

  await db.coverImages.put(coverImage);
  console.log(`✅ Cover image saved locally for user: ${userId}`);
}

/**
 * Get cover image from local storage
 */
export async function getCoverImageLocally(
  userId: string
): Promise<CoverImage | undefined> {
  return await db.coverImages.get(userId);
}

/**
 * Get cover image as object URL for display
 */
export async function getCoverImageURL(
  userId: string,
  useThumbnail: boolean = false
): Promise<string | null> {
  const coverImage = await db.coverImages.get(userId);

  if (!coverImage) {
    return null;
  }

  // Return server URL if already synced
  if (coverImage.synced && coverImage.url) {
    return coverImage.url;
  }

  // Return local blob URL
  const blob = useThumbnail && coverImage.thumbnail
    ? coverImage.thumbnail
    : coverImage.imageData;

  return URL.createObjectURL(blob);
}

/**
 * Upload cover image to server and update local record
 */
export async function uploadCoverImageToServer(
  userId: string,
  token: string
): Promise<string> {
  const coverImage = await db.coverImages.get(userId);

  if (!coverImage) {
    throw new Error('No cover image found locally');
  }

  if (coverImage.synced && coverImage.url) {
    return coverImage.url; // Already uploaded
  }

  // Create FormData for upload
  const formData = new FormData();
  formData.append('coverImage', coverImage.imageData);

  // Upload to server
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/cover-image`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  const serverUrl = data.url;

  // Update local record with server URL and mark as synced
  await db.coverImages.update(userId, {
    synced: true,
    url: serverUrl,
  });

  console.log(`✅ Cover image uploaded to server for user: ${userId}`);
  return serverUrl;
}

/**
 * Delete cover image from local storage
 */
export async function deleteCoverImageLocally(
  userId: string
): Promise<void> {
  await db.coverImages.delete(userId);
  console.log(`✅ Cover image deleted locally for user: ${userId}`);
}

/**
 * Delete cover image from server and local storage
 */
export async function deleteCoverImage(
  userId: string,
  token: string
): Promise<void> {
  // 1. Delete from local storage first
  await deleteCoverImageLocally(userId);

  // 2. Delete from server
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/cover-image`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.statusText}`);
  }
}

/**
 * Get all unsynced cover images (for background sync)
 */
export async function getUnsyncedCoverImages(): Promise<CoverImage[]> {
  return await db.coverImages.where('synced').equals(0).toArray();
}

/**
 * Sync all unsynced cover images to server
 */
export async function syncCoverImages(token: string): Promise<void> {
  const unsyncedImages = await getUnsyncedCoverImages();

  console.log(`🔄 Syncing ${unsyncedImages.length} cover images...`);

  for (const image of unsyncedImages) {
    try {
      await uploadCoverImageToServer(image.userId, token);
    } catch (error) {
      console.error(`❌ Failed to sync cover image for user ${image.userId}:`, error);
    }
  }

  console.log('✅ Cover image sync complete');
}

/**
 * Create thumbnail from image file
 */
async function createThumbnail(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate scaled dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        },
        file.type,
        0.8 // Quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Validate cover image file
 */
export function validateCoverImage(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please use JPEG, PNG, or WebP.',
    };
  }

  // Check file size (max 10MB for cover images)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image is too large. Maximum size is 10MB.',
    };
  }

  return { valid: true };
}
