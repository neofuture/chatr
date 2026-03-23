'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/contexts/ToastContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import {
  saveCoverImageLocally,
  uploadCoverImageToServer,
  getCoverImageURL,
  validateCoverImage,
  deleteCoverImage
} from '@/lib/coverImageService';
import CoverImageCropper from '@/components/image-manip/CoverImageCropper/CoverImageCropper';
import BottomSheet from '@/components/dialogs/BottomSheet/BottomSheet';
import styles from './CoverImageUploader.module.css';
import { getApiBase } from '@/lib/api';
import { resolveAssetUrl } from '@/lib/imageUrl';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { socket } = useWebSocket();

  useEffect(() => {
    loadCoverImage();
  }, [userId]);

  const loadCoverImage = async () => {
    if (!userId || userId === 'N/A' || userId === 'Invalid data') return;
    const API = getApiBase();
    console.log('[CoverImg] Loading for', userId, 'API=', API);

    try {
      // 1. Try IndexedDB (fastest — already downloaded)
      const url = await getCoverImageURL(userId);
      console.log('[CoverImg] IndexedDB result:', url ? 'found' : 'empty');
      if (url) {
        setImageLoaded(false);
        setImageUrl(url);
        return;
      }

      // 2. Try localStorage user object
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.log('[CoverImg] localStorage coverImage:', user.coverImage || 'NOT SET');
        if (user.coverImage) {
          const src = resolveAssetUrl(user.coverImage) || user.coverImage;
          console.log('[CoverImg] Using localStorage URL:', src);
          setImageLoaded(false);
          setImageUrl(src);
          return;
        }
      } catch {}

      // 3. Fetch from server via socket (REST fallback)
      console.log('[CoverImg] Fetching via socket/REST...');
      const { socketFirst } = await import('@/lib/socketRPC');
      const data = await socketFirst(socket, 'users:me', {}, 'GET', '/api/users/me') as any;
      if (data?.coverImage) {
        const src = resolveAssetUrl(data.coverImage) || data.coverImage;
        setImageLoaded(false);
        setImageUrl(src);
      }
    } catch (error) {
      console.error('[CoverImg] Failed:', error);
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
        await deleteCoverImage(userId, token);
      }
      setImageUrl('/cover/default-cover.jpg');
      showToast('Cover image removed', 'success');
    } catch (error) {
      console.error('Failed to delete cover image:', error);
      showToast('Failed to delete cover image', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {showCropper && selectedFile && createPortal(
        <CoverImageCropper
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
          {!imageLoaded && <div className={styles.coverSkeleton} />}
          <img
            src={imageUrl}
            alt="Cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: uploading ? 0.6 : imageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageUrl('/cover/default-cover.jpg');
              setImageLoaded(true);
            }}
          />

          <button
            onClick={() => !uploading && setShowMenu(true)}
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
            <i className={uploading ? 'fas fa-spinner fa-spin' : 'fas fa-camera'} style={{
              color: 'white',
              fontSize: '24px',
              filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.8))',
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
                fontSize: '48px',
                color: isDark ? '#f97316' : '#3b82f6'
              }}></i>
            </div>
          )}
        </div>
      </div>

      <BottomSheet isOpen={showMenu} onClose={() => setShowMenu(false)} heightMode="auto" title="Cover Image">
        <div className={styles.sheetActions}>
          <button className={styles.sheetActionBtn} onClick={handleUploadClick}>
            <i className="fas fa-camera" />
            <span>Upload New Picture</span>
          </button>
          <button className={`${styles.sheetActionBtn} ${styles.sheetActionDanger}`} onClick={handleDeleteClick}>
            <i className="fas fa-trash-alt" />
            <span>Remove Cover Picture</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
