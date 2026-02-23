'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './CoverImageCropper.module.css';

interface CoverImageCropperProps {
  imageFile: File;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  isDark: boolean;
}

export default function CoverImageCropper({ imageFile, onCropComplete, onCancel, isDark }: CoverImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [minScale, setMinScale] = useState(0.5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Cover image is rectangular (16:9 aspect ratio)
  const containerWidth = 600;
  const containerHeight = 300;

  // Load image
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // Handle image load and center it
  const handleImageLoad = () => {
    if (!imageRef.current) return;

    const img = imageRef.current;

    // Store original dimensions
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });

    // Calculate scale to fill the rectangular crop area
    const scaleX = containerWidth / img.naturalWidth;
    const scaleY = containerHeight / img.naturalHeight;

    // Use the LARGER scale to ensure rectangle is always completely filled
    const initialScale = Math.max(scaleX, scaleY);

    // Store minimum scale (can't zoom out below initial)
    setMinScale(initialScale);
    setScale(initialScale);

    // Center the image in the container
    const scaledWidth = img.naturalWidth * initialScale;
    const scaledHeight = img.naturalHeight * initialScale;
    setPosition({
      x: (containerWidth - scaledWidth) / 2,
      y: (containerHeight - scaledHeight) / 2,
    });

    setImageLoaded(true);
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const newPos = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    };

    // Apply boundary constraints
    const constrained = constrainPosition(newPos.x, newPos.y, scale);
    setPosition(constrained);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];

    const newPos = {
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    };

    // Apply boundary constraints
    const constrained = constrainPosition(newPos.x, newPos.y, scale);
    setPosition(constrained);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Constrain position to keep rectangle area always covered
  const constrainPosition = (newX: number, newY: number, currentScale: number): { x: number; y: number } => {
    if (!imageDimensions.width || !imageDimensions.height) return { x: newX, y: newY };

    const scaledWidth = imageDimensions.width * currentScale;
    const scaledHeight = imageDimensions.height * currentScale;

    // Constrain X
    const minX = containerWidth - scaledWidth;
    const maxX = 0;
    const constrainedX = Math.min(Math.max(newX, minX), maxX);

    // Constrain Y
    const minY = containerHeight - scaledHeight;
    const maxY = 0;
    const constrainedY = Math.min(Math.max(newY, minY), maxY);

    return {
      x: constrainedX,
      y: constrainedY,
    };
  };

  // Zoom handler with slider
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!imageRef.current || !imageLoaded) return;
    const newScale = parseFloat(e.target.value);

    // Calculate center of viewport
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // Calculate which point in the original image is at the viewport center
    const imageCenterX = (centerX - position.x) / scale;
    const imageCenterY = (centerY - position.y) / scale;

    // Calculate new position to keep that point centered
    const unconstrained = {
      x: centerX - (imageCenterX * newScale),
      y: centerY - (imageCenterY * newScale),
    };

    // Apply boundary constraints
    const constrained = constrainPosition(unconstrained.x, unconstrained.y, newScale);

    setPosition(constrained);
    setScale(newScale);
  };

  // Crop and upload
  const handleCrop = async () => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;

    // Set canvas to output size (1200x600 for cover image)
    const outputWidth = 1200;
    const outputHeight = 600;
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate the crop area (full rectangle)
    // Calculate what portion of the original image is visible
    const sourceX = -position.x / scale;
    const sourceY = -position.y / scale;
    const sourceWidth = containerWidth / scale;
    const sourceHeight = containerHeight / scale;

    // Draw cropped area to canvas
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File([blob], imageFile.name, {
            type: imageFile.type,
            lastModified: Date.now(),
          });
          onCropComplete(croppedFile);
        }
      },
      imageFile.type,
      0.95
    );
  };


  return (
    <div className={styles.overlay}>
      <h2 className={styles.title}>
        Adjust Your Cover Image
      </h2>

      {/* Cropper container */}
      <div
        className={`${styles.cropperContainer} ${isDragging ? styles.grabbing : styles.grab}`}
        style={{
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image */}
        {imageSrc && (
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Crop preview"
            onLoad={handleImageLoad}
            draggable={false}
            className={styles.image}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            }}
          />
        )}

        {/* Rectangle overlay border */}
        <div className={styles.rectOverlay} />
      </div>

      {/* Zoom controls */}
      <div className={styles.zoomControls}>
        <span className={styles.zoomLabel}>Zoom</span>

        <input
          type="range"
          min={minScale}
          max="3"
          step="0.01"
          value={scale}
          onChange={handleSliderChange}
          className={styles.zoomSlider}
          style={{
            background: `linear-gradient(to right, ${isDark ? '#f97316' : '#3b82f6'} 0%, ${isDark ? '#f97316' : '#3b82f6'} ${((scale - minScale) / (3 - minScale)) * 100}%, ${isDark ? '#374151' : '#d1d5db'} ${((scale - minScale) / (3 - minScale)) * 100}%, ${isDark ? '#374151' : '#d1d5db'} 100%)`,
          }}
        />
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          onClick={onCancel}
          className={`${styles.cancelButton} ${isDark ? styles.dark : styles.light}`}
        >
          Cancel
        </button>

        <button
          onClick={handleCrop}
          disabled={!imageLoaded}
          className={`${styles.uploadButton} ${isDark ? styles.dark : styles.light}`}
        >
          Upload
        </button>
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} className={styles.hiddenCanvas} />
    </div>
  );
}

