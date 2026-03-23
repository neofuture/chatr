'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/contexts/ToastContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import {
  saveProfileImageLocally,
  uploadProfileImageToServer,
  getProfileImageURL,
  validateProfileImage,
  deleteProfileImage
} from '@/lib/profileImageService';
import ProfileImageCropper from '@/components/image-manip/ProfileImageCropper/ProfileImageCropper';
import BottomSheet from '@/components/dialogs/BottomSheet/BottomSheet';
import styles from './ProfileImageUploader.module.css';

interface ProfileImageUploaderProps {
  userId: string;
  isDark: boolean;
}

export default function ProfileImageUploader({ userId, isDark }: ProfileImageUploaderProps) {
  const [imageUrl, setImageUrl] = useState<string>('/profile/default-profile.jpg');
  const [uploading, setUploading] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { socket } = useWebSocket();

  useEffect(() => {
    loadProfileImage();
  }, [userId]);

  const loadProfileImage = async () => {
    if (!userId || userId === 'N/A' || userId === 'Invalid data') return;
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    console.log('[ProfileImg] Loading for', userId, 'API=', API);

    try {
      // 1. Try IndexedDB (fastest — already downloaded)
      const url = await getProfileImageURL(userId);
      console.log('[ProfileImg] IndexedDB result:', url ? 'found' : 'empty');
      if (url) {
        setImageLoaded(false);
        setImageUrl(url);
        return;
      }

      // 2. Try localStorage user object
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('[ProfileImg] localStorage profileImage:', user.profileImage || 'NOT SET');
        if (user.profileImage) {
          const src = user.profileImage.startsWith('/') ? `${API}${user.profileImage}` : user.profileImage;
          console.log('[ProfileImg] Using localStorage URL:', src);
          setImageLoaded(false);
          setImageUrl(src);
          return;
        }
      } catch {}

      // 3. Fetch from server via socket (REST fallback)
      console.log('[ProfileImg] Fetching via socket/REST...');
      const { socketFirst } = await import('@/lib/socketRPC');
      const data = await socketFirst(socket, 'users:me', {}, 'GET', '/api/users/me') as any;
      if (data?.profileImage) {
        const src = data.profileImage.startsWith('/') ? `${API}${data.profileImage}` : data.profileImage;
        setImageLoaded(false);
        setImageUrl(src);
      }
    } catch (error) {
      console.error('[ProfileImg] Failed:', error);
    }
  };


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input for next selection
    e.target.value = '';

    // Validate
    const { valid, error } = validateProfileImage(file);
    if (!valid) {
      showToast(error!, 'error');
      return;
    }

    // Show cropper
    setSelectedFile(file);
    setShowCropper(true);
  };

  const handleCropComplete = async (croppedFile: File) => {
    setShowCropper(false);
    setSelectedFile(null);
    setUploading(true);

    try {
      console.log(`[ProfileImageUploader] Cropped: ${(croppedFile.size / 1024).toFixed(2)}KB`);

      // Save locally first (no toast)
      await saveProfileImageLocally(userId, croppedFile);
      console.log('[ProfileImageUploader] Saved to IndexedDB');

      // Get local URL for immediate display
      const localUrl = await getProfileImageURL(userId);
      if (localUrl) {
        console.log('[ProfileImageUploader] Got local URL:', localUrl);
        setImageUrl(localUrl);

        // Notify other components that profile image was updated
        console.log('[ProfileImageUploader] Dispatching profileImageUpdated event');
        window.dispatchEvent(new CustomEvent('profileImageUpdated', {
          detail: { userId, url: localUrl }
        }));
      }

      // Upload to server in background
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined') {
        try {
          const serverUrl = await uploadProfileImageToServer(userId, token);
          console.log('[ProfileImageUploader] Uploaded to server:', serverUrl);
          showToast('Profile image updated', 'success');
          setImageUrl(serverUrl);

          // Notify again after server upload
          window.dispatchEvent(new CustomEvent('profileImageUpdated', {
            detail: { userId, url: serverUrl }
          }));

          // Update socket-level profileImage so future messages use the new image
          if (socket) {
            socket.emit('profile:imageUpdated', { profileImage: serverUrl });
          }
        } catch (uploadError: any) {
          console.error('[ProfileImageUploader] Server upload failed:', uploadError);

          // Check if offline
          if (!navigator.onLine) {
            showToast('Profile image updated', 'success');
          } else {
            showToast('Failed to update profile image', 'error');
          }
        }
      } else {
        showToast('Profile image updated', 'success');
      }
    } catch (error) {
      showToast('Failed to update profile image', 'error');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedFile(null);
  };

  const handleUploadClick = () => {
    setShowMenu(false);
    setTimeout(() => fileInputRef.current?.click(), 350);
  };

  const handleDeleteClick = async () => {
    setShowMenu(false);
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined') {
        await deleteProfileImage(userId, token);
      }
      const defaultUrl = '/profile/default-profile.jpg';
      setImageUrl(defaultUrl);
      showToast('Profile image removed', 'success');
      window.dispatchEvent(new CustomEvent('profileImageUpdated', {
        detail: { userId, url: defaultUrl }
      }));
    } catch (error) {
      console.error('Failed to delete profile image:', error);
      showToast('Failed to delete profile image', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Image Cropper Modal — portalled to body so position:fixed works */}
      {showCropper && selectedFile && createPortal(
        <ProfileImageCropper
          imageFile={selectedFile}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          isDark={isDark}
        />,
        document.body,
      )}

      <div
        style={{
          position: 'relative',
          display: 'inline-block'
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {/* Profile Image — wrapped in orange gradient ring */}
      <div style={{
        width: '168px',
        height: '168px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--color-orange-500, #f97316), var(--color-red-500, #ef4444))',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          position: 'relative',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'var(--bg-primary)',
          border: '4px solid var(--bg-primary)',
          flexShrink: 0,
        }}>
          {!imageLoaded && <div className={styles.avatarSkeleton} />}
          <img
            src={imageUrl}
            alt="Profile"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              cursor: uploading ? 'wait' : 'default',
              opacity: uploading ? 0.6 : imageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
              display: 'block',
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageUrl('/profile/default-profile.jpg');
              setImageLoaded(true);
            }}
          />
        </div>
      </div>

      <button
        onClick={() => !uploading && setShowMenu(true)}
        disabled={uploading}
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '50%',
          width: '40px',
          height: '40px',
          background: 'none',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          transform: hovering && !uploading ? 'translateX(-50%) scale(1.15)' : 'translateX(-50%) scale(1)',
        }}
      >
        <i className={uploading ? 'fas fa-spinner fa-spin' : 'fas fa-camera'} style={{
          color: 'white',
          fontSize: '24px',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))',
        }} />
      </button>

      {/* Upload Status */}
      {uploading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none'
        }}>
          <i className="fas fa-spinner fa-spin" style={{
            fontSize: '40px',
            color: isDark ? '#f97316' : '#3b82f6'
          }}></i>
        </div>
      )}
    </div>

      <BottomSheet isOpen={showMenu} onClose={() => setShowMenu(false)} heightMode="auto" title="Profile Image">
        <div className={styles.sheetActions}>
          <button className={styles.sheetActionBtn} onClick={handleUploadClick}>
            <i className="fas fa-camera" />
            <span>Upload New Picture</span>
          </button>
          <button className={`${styles.sheetActionBtn} ${styles.sheetActionDanger}`} onClick={handleDeleteClick}>
            <i className="fas fa-trash-alt" />
            <span>Remove Profile Picture</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

