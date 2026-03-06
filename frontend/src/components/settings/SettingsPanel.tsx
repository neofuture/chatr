'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { usePanels } from '@/contexts/PanelContext';
import { useLog } from '@/contexts/LogContext';
import { version } from '@/version';
import ProfileImageUploader from '@/components/image-manip/ProfileImageUploader/ProfileImageUploader';
import CoverImageUploader from '@/components/image-manip/CoverImageUploader/CoverImageUploader';
import LogViewerPanel from '@/components/LogViewerPanel/LogViewerPanel';
import PrivacyPanel from './PrivacyPanel';
import styles from './SettingsPanel.module.css';

function getCurrentUserId(): string {
  if (typeof window === 'undefined') return '';
  try { return JSON.parse(localStorage.getItem('user') || '{}')?.id ?? ''; } catch { return ''; }
}

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

export default function SettingsPanel() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { settings, setSetting } = useUserSettings();
  const { openPanel, closeTopPanel } = usePanels();
  const { logs } = useLog();
  const [userId] = useState<string>(getCurrentUserId);

  const isDark = theme === 'dark';

  const handleLogout = () => {
    closeTopPanel();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('chatr_user_settings');
    router.push('/');
  };

  const handleOpenLogs = () => {
    openPanel('log-viewer', <LogViewerPanel />, 'System Logs', 'center', undefined, undefined, true);
  };


  const handleOpenPrivacy = () => {
    openPanel('privacy', <PrivacyPanel />, 'Privacy', 'center', undefined, undefined, true);
  };

  return (
    <div className={styles.page}>

      {/* Hero: full-width cover + avatar — outside .content so no side padding */}
      <div className={styles.hero}>
        <div className={styles.cover}>
          <CoverImageUploader userId={userId} isDark={isDark} />
        </div>
        <div className={styles.avatarWrap}>
          <ProfileImageUploader userId={userId} isDark={isDark} />
        </div>
      </div>

      <div className={styles.content}>
        <h2 className={styles.pageTitle}>Settings</h2>
        <p className={styles.pageSubtitle}>Manage your preferences</p>

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
        </SettingsSection>

        {/* ── Privacy ── */}
        <SettingsSection title="Privacy">
          <button className={styles.navRow} onClick={handleOpenPrivacy}>
            <div className={styles.rowIcon}><i className="fad fa-shield-halved" /></div>
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>Privacy</span>
              <span className={styles.rowDesc}>Online status, profile visibility, blocked users</span>
            </div>
            <div className={styles.rowControl}>
              <i className="fas fa-chevron-right" style={{ color: 'var(--text-secondary)', fontSize: '12px' }} />
            </div>
          </button>
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
          <button className={styles.navRow} onClick={handleOpenLogs}>
            <div className={styles.rowIcon}><i className="fad fa-list-alt" /></div>
            <div className={styles.rowText}>
              <span className={styles.rowLabel}>System logs</span>
              <span className={styles.rowDesc}>
                {logs.length === 0 ? 'No events recorded' : `${logs.length} event${logs.length !== 1 ? 's' : ''} recorded`}
              </span>
            </div>
            <div className={styles.rowControl}>
              <i className="fas fa-chevron-right" style={{ color: 'var(--text-secondary)', fontSize: '12px' }} />
            </div>
          </button>
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

