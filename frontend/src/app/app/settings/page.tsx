'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { usePanels } from '@/contexts/PanelContext';
import { useLog } from '@/contexts/LogContext';
import { useFriends } from '@/hooks/useFriends';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import { version } from '@/version';
import ProfileImageUploader from '@/components/image-manip/ProfileImageUploader/ProfileImageUploader';
import CoverImageUploader from '@/components/image-manip/CoverImageUploader/CoverImageUploader';
import PresenceAvatar from '@/components/PresenceAvatar/PresenceAvatar';
import LogViewerPanel from '@/components/LogViewerPanel/LogViewerPanel';
import styles from './settings.module.css';

function getCurrentUserId(): string {
  if (typeof window === 'undefined') return '';
  try { return JSON.parse(localStorage.getItem('user') || '{}')?.id ?? ''; } catch { return ''; }
}

// ─── Reusable sub-components ────────────────────────────────────────────────

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function SettingsRow({
  icon, label, description, control,
}: { icon: string; label: string; description?: string; control: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowIcon}><i className={icon} /></div>
      <div className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        {description && <span className={styles.rowDesc}>{description}</span>}
      </div>
      <div className={styles.rowControl}>{control}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
    >
      <span className={styles.toggleThumb} style={{ left: checked ? '24px' : '2px' }} />
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { settings, setSetting } = useUserSettings();
  const { openPanel } = usePanels();
  const { logs } = useLog();
  const { blocked, unblockUser } = useFriends();
  const { showConfirmation } = useConfirmation();
  const [userId] = useState<string>(getCurrentUserId);

  const isDark = theme === 'dark';

  const handleUnblock = async (targetUserId: string, displayName: string) => {
    const result = await showConfirmation({
      title: 'Unblock User',
      message: `Are you sure you want to unblock ${displayName}?`,
      urgency: 'warning',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Unblock', variant: 'destructive', value: true },
      ],
    });
    if (result === true) {
      await unblockUser(targetUserId);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleOpenLogs = () => {
    openPanel('log-viewer', <LogViewerPanel />, 'System Logs', 'left', undefined, undefined, true);
  };

  return (
    <div className={styles.page}>
      {/* Cover image */}
      <div className={styles.cover}>
        <CoverImageUploader userId={userId} isDark={isDark} />
      </div>

      <div className={styles.content}>
        {/* Avatar + title */}
        <div className={styles.hero}>
          <div className={styles.avatarWrap}>
            <ProfileImageUploader userId={userId} isDark={isDark} />
          </div>
          <h2 className={styles.pageTitle}>Settings</h2>
          <p className={styles.pageSubtitle}>Manage your preferences</p>
        </div>

        {/* ── Appearance ── */}
        <SettingsSection title="Appearance">
          <SettingsRow
            icon="fad fa-moon-stars"
            label="Dark mode"
            description={isDark ? 'Currently using dark theme' : 'Currently using light theme'}
            control={<Toggle checked={isDark} onChange={toggleTheme} />}
          />
        </SettingsSection>

        {/* ── Messaging ── */}
        <SettingsSection title="Messaging">
          <SettingsRow
            icon="fad fa-ghost"
            label="Ghost typing"
            description="Let the other person see what you're typing in real time"
            control={
              <Toggle
                checked={settings.ghostTypingEnabled}
                onChange={v => setSetting('ghostTypingEnabled', v)}
              />
            }
          />
          <SettingsRow
            icon="fad fa-eye"
            label="Show online status"
            description="Let others see when you are online"
            control={
              <Toggle
                checked={settings.showOnlineStatus}
                onChange={v => setSetting('showOnlineStatus', v)}
              />
            }
          />
        </SettingsSection>

        {/* ── Blocked Users ── */}
        <SettingsSection title="Blocked Users">
          {blocked.length === 0 ? (
            <div className={styles.emptyBlocked}>
              <i className="fad fa-user-check" />
              <span>No blocked users</span>
            </div>
          ) : (
            blocked.map((b) => {
              const dn = b.user.displayName || b.user.username?.replace(/^@/, '') || 'Unknown';
              return (
                <div key={b.friendshipId} className={styles.blockedRow}>
                  <PresenceAvatar
                    profileImage={b.user.profileImage ?? null}
                    displayName={dn}
                    size={36}
                    info={{ status: 'offline', lastSeen: null }}
                    showDot={false}
                  />
                  <div className={styles.blockedInfo}>
                    <span className={styles.blockedName}>{dn}</span>
                    <span className={styles.blockedUsername}>{b.user.username}</span>
                  </div>
                  <button
                    className={styles.unblockBtn}
                    onClick={() => handleUnblock(b.user.id, dn)}
                  >
                    <i className="fas fa-lock-open" /> Unblock
                  </button>
                </div>
              );
            })
          )}
        </SettingsSection>

        {/* ── About ── */}
        <SettingsSection title="About">
          <div className={styles.versionRow}>
            <span className={styles.rowDesc}>App version</span>
            <span className={styles.versionBadge}>{version}</span>
          </div>
        </SettingsSection>

        {/* ── Developer ── */}
        <SettingsSection title="Developer">
          <SettingsRow
            icon="fad fa-list-alt"
            label="System logs"
            description={`${logs.length} event${logs.length !== 1 ? 's' : ''} recorded`}
            control={
              <button className={styles.btnChevron} onClick={handleOpenLogs}>
                <i className="fas fa-chevron-right" />
              </button>
            }
          />
        </SettingsSection>

        {/* ── Account ── */}
        <SettingsSection title="Account">
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <i className="fad fa-right-from-bracket" />
            Sign out
          </button>
        </SettingsSection>
      </div>
    </div>
  );
}
