'use client';

import { usePanels, ActionIcon } from '@/contexts/PanelContext';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getProfileImageURL } from '@/lib/profileImageService';
import { usePresence } from '@/contexts/PresenceContext';
import PresenceLabel from '@/components/PresenceLabel/PresenceLabel';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import PanelFooter from '@/components/PanelFooter/PanelFooter';
import styles from './PanelContainer.module.css';

/** True when we have no real presence data (suppress "last seen a while ago") */
function shouldHidePresence(info: import('@/types/types').PresenceInfo): boolean {
  return !!info.hidden || (info.status === 'offline' && !info.lastSeen);
}

/** For chat panels, shows live PresenceAvatar; falls back to plain img for others. */
function PresenceAvatarForPanel({ panelId, profileImage, title }: { panelId: string; profileImage?: string | null; title: string }) {
  const { getPresence } = usePresence();
  const userId = panelId.startsWith('chat-') ? panelId.slice(5) : null;
  if (!userId) return profileImage ? <img src={profileImage} alt={title} /> : null;
  const info = getPresence(userId);
  // When presence is unknown/hidden, render avatar without status dot
  const effectiveInfo = shouldHidePresence(info)
    ? { status: 'offline' as const, lastSeen: null, hidden: true }
    : info;
  return <PresenceAvatar displayName={title} profileImage={profileImage} info={effectiveInfo} size={36} />;
}

/** Renders the subtitle row, or nothing when user hides their status */
function PanelSubTitle({ panelId, staticSubTitle }: { panelId: string; staticSubTitle?: string }) {
  const { getPresence } = usePresence();
  const userId = panelId.startsWith('chat-') ? panelId.slice(5) : null;

  // Non-chat panel: show static subtitle if provided
  if (!userId) {
    if (!staticSubTitle) return null;
    return (
      <div className={styles.titleSub}>
        <span className={styles.titleSubText}>{staticSubTitle}</span>
      </div>
    );
  }

  const info = getPresence(userId);
  if (shouldHidePresence(info)) return null;

  return (
    <div className={styles.titleSub}>
      <span className={styles.titleSubText}>
        <PresenceLabel info={info} showDot={false} />
      </span>
    </div>
  );
}

/** For chat panels (id = "chat-<userId>"), shows live presence from context.
 *  Returns null when the user is hiding their status so the title centres vertically. */
function LiveSubTitle({ panelId, staticSubTitle }: { panelId: string; staticSubTitle?: string }) {
  const { getPresence } = usePresence();
  const userId = panelId.startsWith('chat-') ? panelId.slice(5) : null;

  if (!userId) return <>{staticSubTitle || ''}</>;

  const info = getPresence(userId);
  if (shouldHidePresence(info)) return null;
  return <PresenceLabel info={info} showDot={false} />;
}

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
  footer?: () => React.ReactNode;
}

function Panel({ id, title, children, level, effectiveMaxLevel, isClosing, titlePosition = 'center', subTitle, profileImage, fullWidth = false, actionIcons, footer }: PanelProps) {
  const { closePanel } = usePanels();
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentProfileImage, setCurrentProfileImage] = useState<string | undefined>(profileImage);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [submenuPos, setSubmenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  // Click-outside to close submenu — must also allow clicks inside the portalled submenu
  useEffect(() => {
    if (openMenuIndex === null) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Allow clicks inside the trigger button area
      if (menuRef.current && menuRef.current.contains(target)) return;
      // Allow clicks inside the portalled submenu (rendered in document.body)
      const portalMenu = document.querySelector(`.${styles.submenu}`);
      if (portalMenu && portalMenu.contains(target)) return;
      setOpenMenuIndex(null);
      setSubmenuPos(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuIndex]);

  // Initial slide-in animation
  useEffect(() => {
    if (isClosing) {
      setIsAnimating(false);
      setOpenMenuIndex(null);
      setSubmenuPos(null);
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
        data-fullwidth={fullWidth ? 'true' : undefined}
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
          <div
            className={`auth-panel-title ${titlePosition === 'center' ? styles.titleBlockCenter : styles.titleBlockLeft} ${styles.titleBlock}`}
            style={{ gap: '0.75rem' }}
          >
            {(() => {
              const userId = id.startsWith('chat-') ? id.slice(5) : null;
              if (userId) {
                // Always render for chat panels — PresenceAvatar shows initials when no image
                return (
                  <PresenceAvatarForPanel panelId={id} profileImage={currentProfileImage} title={title} />
                );
              }
              // Non-chat panels: only show image if one is provided
              if (currentProfileImage) {
                return (
                  <img
                    src={currentProfileImage}
                    alt="Profile"
                    className={styles.profileImg}
                  />
                );
              }
              return null;
            })()}
            <div className={styles.titleText}>
              <span className={styles.titleName}>{title}</span>
              <PanelSubTitle panelId={id} staticSubTitle={subTitle} />
            </div>
          </div>
          <div className={styles.actions} ref={menuRef}>
            {actionIcons && actionIcons.map((action, index) => (
              action.submenu && action.submenu.length > 0 ? (
                <div key={index} className={styles.menuWrap}>
                  <button
                    ref={el => { btnRefs.current[index] = el; }}
                    onClick={() => {
                      if (openMenuIndex === index) {
                        setOpenMenuIndex(null);
                        setSubmenuPos(null);
                      } else {
                        const btn = btnRefs.current[index];
                        if (btn) {
                          const rect = btn.getBoundingClientRect();
                          // Position below the header (use the bottom of the header bar)
                          const header = btn.closest('.auth-panel-header');
                          const headerBottom = header ? header.getBoundingClientRect().bottom : rect.bottom;
                          setSubmenuPos({
                            top: headerBottom + 4,
                            right: window.innerWidth - rect.right,
                          });
                        }
                        setOpenMenuIndex(index);
                      }
                    }}
                    aria-label={action.label || 'Menu'}
                    aria-expanded={openMenuIndex === index}
                    className={styles.actionBtn}
                  >
                    <i className={action.icon}></i>
                  </button>
                  {openMenuIndex === index && submenuPos && createPortal(
                    <div
                      className={styles.submenu}
                      style={{ top: submenuPos.top, right: submenuPos.right }}
                    >
                      {action.submenu.map((item, i) => (
                        <button
                          key={i}
                          className={`${styles.submenuItem} ${item.variant === 'danger' ? styles.submenuItemDanger : ''}`}
                          onClick={() => {
                            item.onClick();
                            setOpenMenuIndex(null);
                            setSubmenuPos(null);
                          }}
                        >
                          <i className={item.icon} />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>,
                    document.body
                  )}
                </div>
              ) : (
                <button
                  key={index}
                  onClick={action.onClick}
                  aria-label={action.label}
                  className={styles.actionBtn}
                >
                  <i className={action.icon}></i>
                </button>
              )
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="auth-panel-content">{children}</div>

        {/* Footer — injected by the caller */}
        {footer && <PanelFooter>{footer()}</PanelFooter>}
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
          footer={panel.footer}        >
          {panel.component}
        </Panel>
      ))}
    </>
  );
}
