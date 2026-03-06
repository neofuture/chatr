'use client';

import { useUserSettings } from '@/contexts/UserSettingsContext';
import { usePanels } from '@/contexts/PanelContext';
import { useFriends } from '@/hooks/useFriends';
import BlockedUsersPanel from './BlockedUsersPanel';
import styles from './SettingsPanel.module.css';

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

export default function PrivacyPanel() {
  const { settings, setSetting } = useUserSettings();
  const { openPanel } = usePanels();
  const { blocked } = useFriends();

  const handleOpenBlocked = () => {
    openPanel('blocked-users', <BlockedUsersPanel />, 'Blocked Users', 'center', undefined, undefined, true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.content} style={{ paddingTop: '16px' }}>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Visibility</h3>
          <div className={styles.sectionBody}>
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
            <SettingsRow
              icon="fad fa-phone"
              label="Show phone number"
              description="Let others see your phone number on your profile"
              control={
                <Toggle
                  checked={settings.showPhoneNumber}
                  onChange={v => setSetting('showPhoneNumber', v)}
                />
              }
            />
            <SettingsRow
              icon="fad fa-envelope"
              label="Show email address"
              description="Let others see your email address on your profile"
              control={
                <Toggle
                  checked={settings.showEmail}
                  onChange={v => setSetting('showEmail', v)}
                />
              }
            />
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Blocking</h3>
          <div className={styles.sectionBody}>
            <button className={styles.navRow} onClick={handleOpenBlocked}>
              <div className={styles.rowIcon}><i className="fad fa-ban" /></div>
              <div className={styles.rowText}>
                <span className={styles.rowLabel}>Blocked Users</span>
                <span className={styles.rowDesc}>
                  {blocked.length === 0
                    ? 'No blocked users'
                    : `${blocked.length} blocked user${blocked.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div className={styles.rowControl}>
                <i className="fas fa-chevron-right" style={{ color: 'var(--text-secondary)', fontSize: '12px' }} />
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

