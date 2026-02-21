'use client';

import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import {
  saveCoverImageLocally,
  uploadCoverImageToServer,
  getCoverImageURL,
  validateCoverImage,
  deleteCoverImage
} from '@/lib/coverImageService';
import CoverImageCropper from '@/components/image-manip/CoverImageCropper/CoverImageCropper';
import styles from './CoverImageUploader.module.css';

interface CoverImageUploaderProps {
  userId: string;
  isDark: boolean;
}

export default function CoverImageUploader({ userId, isDark }: CoverImageUploaderProps) {
  const [imageUrl, setImageUrl] = useState<string>('/cover/default-cover.jpg');
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

  // Load existing cover image on mount
  useEffect(() => {
    loadCoverImage();

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

  const loadCoverImage = async () => {
    if (!userId || userId === 'N/A' || userId === 'Invalid data') return;

    try {
      const url = await getCoverImageURL(userId);
      if (url) {
        setImageUrl(url);
      }
    } catch (error) {
      console.error('Failed to load cover image:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[CoverImageUploader] File selected:', file.name, file.type, file.size);

    // Validate
    const { valid, error } = validateCoverImage(file);
    if (!valid) {
      console.error('[CoverImageUploader] Validation failed:', error);
      showToast(error!, 'error');
      // Reset input
      e.target.value = '';
      return;
    }

    // Show cropper
    console.log('[CoverImageUploader] showing cropper for', file.name);
    setSelectedFile(file);
    setShowCropper(true);

    // Reset input after state update to allow re-selection if cancelled
    e.target.value = '';
  };

  const handleCropComplete = async (croppedFile: File) => {
    setShowCropper(false);
    setSelectedFile(null);
    setUploading(true);

    try {
      console.log(`Cropped cover: ${(croppedFile.size / 1024).toFixed(2)}KB`);

      // Save locally first (no toast)
      await saveCoverImageLocally(userId, croppedFile);

      // Get local URL for immediate display
      const localUrl = await getCoverImageURL(userId);
      if (localUrl) {
        setImageUrl(localUrl);
      }

      // Upload to server in background
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined') {
        try {
          const serverUrl = await uploadCoverImageToServer(userId, token);
          showToast('Cover image updated', 'success');
          setImageUrl(serverUrl);
        } catch (uploadError: any) {
          console.error('Server upload failed:', uploadError);

          // Check if offline
          if (!navigator.onLine) {
            showToast('Cover image updated', 'success');
          } else {
            showToast('Failed to update cover image', 'error');
          }
        }
      } else {
        showToast('Cover image updated', 'success');
      }
    } catch (error) {
      showToast('Failed to update cover image', 'error');
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

    // Wait for animation
    setTimeout(async () => {
      setUploading(true);
      try {
        const token = localStorage.getItem('token');
        if (token && token !== 'undefined') {
          await deleteCoverImage(userId, token);
        }

        // Reset to default
        const defaultUrl = '/cover/default-cover.jpg';
        setImageUrl(defaultUrl);
        showToast('Cover image removed', 'success');

      } catch (error) {
        console.error('Failed to delete cover image:', error);
        showToast('Failed to delete cover image', 'error');
      } finally {
        setUploading(false);
      }
    }, 250);
  };

  return (
    <>
      {/* Image Cropper Modal */}
      {showCropper && selectedFile && (
        <CoverImageCropper
          imageFile={selectedFile}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          isDark={isDark}
        />
      )}

      <div
        style={{
          position: 'relative',
          display: 'block',
          width: '100%',
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

        {/* Cover Image */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '250px',
            overflow: 'hidden',
            cursor: uploading ? 'wait' : 'default',
            borderBottom: isDark ? '2px solid rgba(59, 130, 246, 0.3)' : '2px solid rgba(15, 23, 42, 0.2)',
          }}
        >
          <img
            src={imageUrl}
            alt="Cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
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
                bottom: '70px',
                right: '16px',
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
                Delete Cover Picture
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
              bottom: '16px',
              right: '16px',
              width: '48px',
              height: '48px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: uploading ? 'wait' : 'pointer',
              transition: 'all 0.2s',
              transform: hovering && !uploading ? 'scale(1.15)' : 'scale(1)',
            }}
          >
            {uploading ? (
              <i className="fas fa-spinner fa-spin" style={{
                color: 'white',
                fontSize: '24px',
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.8))',
              }}></i>
            ) : (
              <i className="fas fa-camera" style={{
                color: 'white',
                fontSize: '24px',
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.8))',
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
                fontSize: '48px',
                color: isDark ? '#f97316' : '#3b82f6'
              }}></i>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

