'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ProfileImageCropper.module.css';

interface ProfileImageCropperProps {
  imageFile: File;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  isDark: boolean;
}

export default function ProfileImageCropper({ imageFile, onCropComplete, onCancel, isDark }: ProfileImageCropperProps) {
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
  const containerSize = 400;

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

    // Calculate scale to fill the circular crop area
    // The circle radius is 45% of container, so diameter is 90%
    const circleDiameter = containerSize * 0.9;

    const scaleX = circleDiameter / img.naturalWidth;
    const scaleY = circleDiameter / img.naturalHeight;

    // Use the LARGER scale to ensure circle is always completely filled
    const initialScale = Math.max(scaleX, scaleY);

    // Store minimum scale (can't zoom out below initial)
    setMinScale(initialScale);
    setScale(initialScale);

    // Center the image in the container
    const scaledWidth = img.naturalWidth * initialScale;
    const scaledHeight = img.naturalHeight * initialScale;
    setPosition({
      x: (containerSize - scaledWidth) / 2,
      y: (containerSize - scaledHeight) / 2,
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

  // Constrain position to keep circle area always covered
  const constrainPosition = (newX: number, newY: number, currentScale: number): { x: number; y: number } => {
    if (!imageDimensions.width || !imageDimensions.height) return { x: newX, y: newY };

    const scaledWidth = imageDimensions.width * currentScale;
    const scaledHeight = imageDimensions.height * currentScale;

    // Circle center is at container center
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;

    // Circle radius is 45% of container
    const circleRadius = containerSize * 0.45;

    // Calculate how far the image can be from center
    // Image must extend at least circleRadius in all directions from center
    const maxOffsetX = (scaledWidth / 2) - circleRadius;
    const maxOffsetY = (scaledHeight / 2) - circleRadius;

    // Convert position (top-left) to center-based offset
    const imageCenterX = newX + (scaledWidth / 2);
    const imageCenterY = newY + (scaledHeight / 2);

    const offsetX = imageCenterX - centerX;
    const offsetY = imageCenterY - centerY;

    // Constrain offsets
    const constrainedOffsetX = Math.min(Math.max(offsetX, -maxOffsetX), maxOffsetX);
    const constrainedOffsetY = Math.min(Math.max(offsetY, -maxOffsetY), maxOffsetY);

    // Convert back to top-left position
    return {
      x: centerX + constrainedOffsetX - (scaledWidth / 2),
      y: centerY + constrainedOffsetY - (scaledHeight / 2),
    };
  };

  // Zoom handler with slider
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!imageRef.current || !imageLoaded) return;
    const newScale = parseFloat(e.target.value);

    // Calculate center of viewport
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;

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

    // Set canvas to output size
    const outputSize = 800;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate the crop area (center circle)
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;

    // Circle diameter is 90% of container (radius is 45%)
    const circleRadius = containerSize * 0.45;
    const circleDiameter = circleRadius * 2;

    // Calculate what point in the original image is at the container center
    const imageCenterX = (centerX - position.x) / scale;
    const imageCenterY = (centerY - position.y) / scale;

    // Calculate the crop box in the original image
    // Start from the image center and go back half the circle diameter
    const sourceSize = circleDiameter / scale;
    const sourceX = imageCenterX - (sourceSize / 2);
    const sourceY = imageCenterY - (sourceSize / 2);

    // Draw cropped area to canvas
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize
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
        Adjust Your Profile Image
      </h2>

      {/* Cropper container */}
      <div
        className={`${styles.cropperContainer} ${isDragging ? styles.grabbing : styles.grab}`}
        style={{
          width: `${containerSize}px`,
          height: `${containerSize}px`,
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

        {/* Circular overlay */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <mask id="circleMask">
              <rect width="100%" height="100%" fill="white" />
              <circle cx="50%" cy="50%" r="45%" fill="black" />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.6)"
            mask="url(#circleMask)"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="white"
            strokeWidth="3"
          />
        </svg>
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
