import { db, ProfileImage } from './db';

/**
 * Profile Image Service
 * Handles local storage and server sync of profile images
 */

/**
 * Save profile image to local storage (IndexedDB via Dexie)
 */
export async function saveProfileImageLocally(
  userId: string,
  imageFile: File
): Promise<void> {
  // Create thumbnail (optional but recommended for performance)
  const thumbnail = await createThumbnail(imageFile, 150, 150);

  const profileImage: ProfileImage = {
    userId,
    imageData: imageFile,
    mimeType: imageFile.type,
    uploadedAt: new Date(),
    synced: false,
    thumbnail,
  };

  await db.profileImages.put(profileImage);
  console.log(`✅ Profile image saved locally for user: ${userId}`);
}

/**
 * Remove profile image from local storage
 */
export async function removeProfileImageLocally(userId: string): Promise<void> {
  await db.profileImages.delete(userId);
  console.log(`🗑️ Profile image removed locally for user: ${userId}`);
}

/**
 * Get profile image from local storage
 */
export async function getProfileImageLocally(
  userId: string
): Promise<ProfileImage | undefined> {
  return await db.profileImages.get(userId);
}

/**
 * Get profile image as object URL for display
 */
export async function getProfileImageURL(
  userId: string,
  useThumbnail: boolean = false
): Promise<string | null> {
  const profileImage = await db.profileImages.get(userId);

  if (!profileImage) {
    return null;
  }

  // Return server URL if already synced
  if (profileImage.synced && profileImage.url) {
    return profileImage.url;
  }

  // Return local blob URL
  const blob = useThumbnail && profileImage.thumbnail
    ? profileImage.thumbnail
    : profileImage.imageData;

  return URL.createObjectURL(blob);
}

/**
 * Upload profile image to server and update local record
 */
export async function uploadProfileImageToServer(
  userId: string,
  token: string
): Promise<string> {
  const profileImage = await db.profileImages.get(userId);

  if (!profileImage) {
    throw new Error('No profile image found locally');
  }

  if (profileImage.synced && profileImage.url) {
    return profileImage.url; // Already uploaded
  }

  // Create FormData for upload
  const formData = new FormData();
  formData.append('profileImage', profileImage.imageData);

  // Upload to server
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/profile-image`,
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

  // Update local record with server URL
  await db.profileImages.update(userId, {
    synced: true,
    url: serverUrl,
  });

  return serverUrl;
}

/**
 * Delete profile image from server and local storage
 */
export async function deleteProfileImage(
  userId: string,
  token: string
): Promise<void> {
  // 1. Delete from local storage first
  await removeProfileImageLocally(userId);

  // 2. Delete from server
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/users/profile-image`,
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
 * Validate profile image file
 */
export function validateProfileImage(file: File): {
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

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image is too large. Maximum size is 5MB.',
    };
  }

  return { valid: true };
}

/**
 * Get all unsynced profile images (for background sync)
 */
export async function getUnsyncedProfileImages(): Promise<ProfileImage[]> {
  return await db.profileImages.where('synced').equals(0).toArray();
}

/**
 * Sync all unsynced profile images to server
 */
export async function syncProfileImages(token: string): Promise<void> {
  const unsyncedImages = await getUnsyncedProfileImages();

  console.log(`🔄 Syncing ${unsyncedImages.length} profile images...`);

  for (const image of unsyncedImages) {
    try {
      await uploadProfileImageToServer(image.userId, token);
    } catch (error) {
      console.error(`❌ Failed to sync image for user ${image.userId}:`, error);
    }
  }

  console.log('✅ Profile image sync complete');
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
      // Calculate scaled dimensions
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
