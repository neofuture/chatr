'use client';

import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import {
  saveProfileImageLocally,
  uploadProfileImageToServer,
  getProfileImageURL,
  validateProfileImage,
  deleteProfileImage
} from '@/lib/profileImageService';
import ProfileImageCropper from '@/components/image-manip/ProfileImageCropper/ProfileImageCropper';
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
  const [isClosing, setIsClosing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { showToast } = useToast();

  const closeMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowMenu(false);
      setIsClosing(false);
    }, 250); // Match animation duration
  };

  // Load existing profile image on mount
  useEffect(() => {
    loadProfileImage();

    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userId]);

  const loadProfileImage = async () => {
    if (!userId || userId === 'N/A' || userId === 'Invalid data') return;

    try {
      const url = await getProfileImageURL(userId);
      if (url) {
        setImageUrl(url);
      }
    } catch (error) {
      console.error('Failed to load profile image:', error);
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
          console.log('[ProfileImageUploader] Dispatching profileImageUpdated event (server)');
          window.dispatchEvent(new CustomEvent('profileImageUpdated', {
            detail: { userId, url: serverUrl }
          }));
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

  const handleCameraClick = () => {
    if (showMenu) {
      closeMenu();
    } else {
      setShowMenu(true);
    }
  };

  const handleUploadClick = () => {
    closeMenu();
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 250);
  };

  const handleDeleteClick = async () => {
    closeMenu();

    // Wait for animation to finish before showing loading
    setTimeout(async () => {
      setUploading(true);
      try {
        const token = localStorage.getItem('token');
        if (token && token !== 'undefined') {
          await deleteProfileImage(userId, token);
        }

        // Reset to default
        const defaultUrl = '/profile/default-profile.jpg';
        setImageUrl(defaultUrl);
        showToast('Profile image removed', 'success');

        // Notify other components
        window.dispatchEvent(new CustomEvent('profileImageUpdated', {
          detail: { userId, url: defaultUrl }
        }));
      } catch (error) {
        console.error('Failed to delete profile image:', error);
        showToast('Failed to delete profile image', 'error');
      } finally {
        setUploading(false);
      }
    }, 250);
  };

  return (
    <>
      {/* Image Cropper Modal */}
      {showCropper && selectedFile && (
        <ProfileImageCropper
          imageFile={selectedFile}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          isDark={isDark}
        />
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

      {/* Profile Image */}
      <img
        src={imageUrl}
        alt="Profile"
        style={{
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: isDark ? '4px solid rgba(59, 130, 246, 0.3)' : '4px solid rgba(15, 23, 42, 0.2)',
          cursor: uploading ? 'wait' : 'default',
          opacity: uploading ? 0.6 : 1,
          transition: 'opacity 0.2s',
        }}
      />

      {/* Camera Icon Overlay */}
      {showMenu && (
        <div
          ref={menuRef}
          className={isClosing ? styles.menuExit : styles.menuEnter}
          style={{
            position: 'absolute',
            bottom: '60px', /* Positioned relative to the main container */
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: isDark ? '#1e293b' : 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
            padding: '6px',
            zIndex: 100,
            width: '240px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
            <button
            onClick={handleDeleteClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              color: '#ef4444', // Red for delete
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              borderRadius: '8px',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
              <i className="fas fa-trash-alt"></i>
            </div>
            Delete Profile Picture
          </button>

          <button
            onClick={handleUploadClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              color: isDark ? '#e2e8f0' : '#1e293b',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              borderRadius: '8px',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
           <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
              <i className="fas fa-camera"></i>
            </div>
            Upload New Picture
          </button>
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={handleCameraClick}
        disabled={uploading}
        style={{
          position: 'absolute',
          bottom: '8px',
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
        {uploading ? (
          <i className="fas fa-spinner fa-spin" style={{
            color: 'white',
            fontSize: '24px',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))',
          }}></i>
        ) : (
          <i className="fas fa-camera" style={{
            color: 'white',
            fontSize: '24px',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))',
          }}></i>
        )}
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
    </>
  );
}

