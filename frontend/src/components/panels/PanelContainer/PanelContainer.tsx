'use client';

import { usePanels, ActionIcon } from '@/contexts/PanelContext';
import { useEffect, useState } from 'react';
import { getProfileImageURL } from '@/lib/profileImageService';

interface PanelProps {
  id: string;
  title: string;
  children: React.ReactNode;
  level: number;
  maxLevel: number;
  effectiveMaxLevel: number; // Max level excluding closing panels
  isClosing?: boolean;
  titlePosition?: 'center' | 'left' | 'right';
  subTitle?: string;
  profileImage?: string;
  fullWidth?: boolean;
  actionIcons?: ActionIcon[];
}

function Panel({ id, title, children, level, effectiveMaxLevel, isClosing, titlePosition = 'center', subTitle, profileImage, fullWidth = false, actionIcons }: PanelProps) {
  const { closePanel } = usePanels();
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentProfileImage, setCurrentProfileImage] = useState<string | undefined>(profileImage);

  // Load actual user profile image if a generic marker is provided
  useEffect(() => {
    // If the provided image is "use-auth-user", load from IndexedDB
    if (profileImage === 'use-auth-user') {
      const loadUserImage = async () => {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            const url = await getProfileImageURL(user.id);
            if (url) {
              setCurrentProfileImage(url);
            } else {
              setCurrentProfileImage('/profile/default-profile.jpg');
            }
          } else {
            setCurrentProfileImage('/profile/default-profile.jpg');
          }
        } catch (error) {
          console.error('Failed to load panel profile image:', error);
          setCurrentProfileImage('/profile/default-profile.jpg');
        }
      };
      loadUserImage();
    } else {
      setCurrentProfileImage(profileImage);
    }
  }, [profileImage]);

  // Is this panel covered by another panel? Use effectiveMaxLevel to exclude closing panels
  const isCovered = level < effectiveMaxLevel;

  // Initial slide-in animation
  useEffect(() => {
    if (isClosing) {
      setIsAnimating(false);
      return;
    }

    // Trigger slide-in animation
    const timer = setTimeout(() => {
      setIsAnimating(true);
    }, 10);
    return () => clearTimeout(timer);
  }, [isClosing]);

  const handleClose = () => {
    // Call closePanel immediately - this marks panel as closing in context
    // which updates effectiveMaxLevel and triggers panels below to animate
    closePanel(id);
  };

  // Calculate z-index based on level - panels should be above everything (burger menu is 2000)
  const zIndex = 9999 + level;

  // Calculate transform based on whether panel is active or covered
  // This recalculates on every render when isAnimating or isCovered changes
  let transform: string;

  // All panels slide in from right, regardless of fullWidth
  if (!isAnimating) {
    transform = 'translateX(100%)'; // Slide out to right (closing or initial)
  } else if (isCovered) {
    transform = 'translateX(-50%) scale(0.9)'; // Slide left AND scale down when covered
  } else {
    transform = 'translateX(0) scale(1)'; // Fully visible when active (top panel)
  }


  return (
    <>
      {/* Backdrop */}
      <div
        className={`auth-panel-backdrop ${isAnimating && !isClosing ? 'active' : ''}`}
        onClick={handleClose}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
        style={{ zIndex: zIndex - 1 }}
      />

      {/* Panel */}
      <div
        className="auth-panel"
        style={{
          zIndex,
          transform,
          transformOrigin: 'center right',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          ...(fullWidth && {
            width: '100vw',
            maxWidth: '100vw',
            left: 0,
            right: 0,
          }),
        }}
      >
        {/* Title Bar */}
        <div className="auth-panel-header">
          <button onClick={handleClose} className="auth-panel-back">
            ‹
          </button>
          <div className="auth-panel-title" style={{
            position: titlePosition === 'center' ? 'absolute' : 'relative',
            left: titlePosition === 'center' ? '50%' : 'auto',
            transform: titlePosition === 'center' ? 'translateX(-50%)' : 'none',
            textAlign: titlePosition,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: currentProfileImage ? '0.75rem' : (subTitle ? '0.125rem' : '0'),
            flex: titlePosition !== 'center' ? 1 : undefined,
          }}>
            {currentProfileImage && (
              <img
                src={currentProfileImage}
                alt="Profile"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
            )}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: '40px', // Fixed height equal to typical profile image or icon height
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              <span style={{
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: subTitle ? 'translateY(0)' : 'translateY(0)', // In center if no subtitle, push up if subtitle?
              }}>{title}</span>
              <div style={{
                height: subTitle ? '14px' : '0px',
                opacity: subTitle ? 0.7 : 0,
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '400',
                  whiteSpace: 'nowrap',
                  transform: subTitle ? 'translateY(0)' : 'translateY(-5px)'
                }}>{subTitle || ' '}</span>
              </div>
            </div>
          </div>
          <div style={{
            minWidth: '50px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            alignItems: 'center'
          }}>
            {actionIcons && actionIcons.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                aria-label={action.label}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  opacity: 0.7,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
              >
                <i className={action.icon}></i>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="auth-panel-content">{children}</div>
      </div>
    </>
  );
}

export default function PanelContainer() {
  const { panels, maxLevel, effectiveMaxLevel } = usePanels();

  if (panels.length === 0) return null;

  return (
    <>
      {panels.map((panel) => (
        <Panel
          key={panel.id}
          id={panel.id}
          title={panel.title}
          level={panel.level}
          maxLevel={maxLevel}
          effectiveMaxLevel={effectiveMaxLevel}
          isClosing={panel.isClosing}
          titlePosition={panel.titlePosition}
          subTitle={panel.subTitle}
          profileImage={panel.profileImage}
          fullWidth={panel.fullWidth}
          actionIcons={panel.actionIcons}
        >
          {panel.component}
        </Panel>
      ))}
    </>
  );
}
