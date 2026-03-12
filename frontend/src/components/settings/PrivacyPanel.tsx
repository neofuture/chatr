'use client';

import { useUserSettings, type PrivacyLevel } from '@/contexts/UserSettingsContext';
import { usePanels } from '@/contexts/PanelContext';
import { useFriends } from '@/hooks/useFriends';
import BlockedUsersPanel from './BlockedUsersPanel';
import styles from './SettingsPanel.module.css';

const LEVELS: { value: PrivacyLevel; icon: string; label: string }[] = [
  { value: 'everyone', icon: 'fas fa-globe',       label: 'Everyone' },
  { value: 'friends',  icon: 'fas fa-user-group',  label: 'Friends' },
  { value: 'nobody',   icon: 'fas fa-lock',        label: 'Only me' },
];

function PrivacySelector({ value, onChange }: { value: PrivacyLevel; onChange: (v: PrivacyLevel) => void }) {
  return (
    <div className={styles.privacySelector}>
      {LEVELS.map(lvl => (
        <button
          key={lvl.value}
          className={`${styles.privacyBtn} ${value === lvl.value ? styles.privacyBtnActive : ''}`}
          onClick={() => onChange(lvl.value)}
          title={lvl.label}
        >
          <i className={lvl.icon} />
        </button>
      ))}
    </div>
  );
}

function PrivacyRow({ icon, label, description, privacyKey }: {
  icon: string; label: string; description: string;
  privacyKey: 'privacyOnlineStatus' | 'privacyPhone' | 'privacyEmail' | 'privacyFullName' | 'privacyGender' | 'privacyJoinedDate';
}) {
  const { settings, setSetting } = useUserSettings();
  return (
    <div className={styles.row}>
      <div className={styles.rowIcon}><i className={icon} /></div>
      <div className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        {description && <span className={styles.rowDesc}>{description}</span>}
      </div>
      <div className={styles.rowControl}>
        <PrivacySelector
          value={settings[privacyKey] as PrivacyLevel}
          onChange={v => setSetting(privacyKey, v)}
        />
      </div>
    </div>
  );
}

export default function PrivacyPanel() {
  const { openPanel } = usePanels();
  const { blocked } = useFriends();

  const handleOpenBlocked = () => {
    openPanel('blocked-users', <BlockedUsersPanel />, 'Blocked Users', 'center', undefined, undefined, true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.content} style={{ paddingTop: '16px' }}>

        {/* Legend */}
        <div className={styles.privacyLegend}>
          {LEVELS.map(lvl => (
            <span key={lvl.value} className={styles.privacyLegendItem}>
              <i className={lvl.icon} /> {lvl.label}
            </span>
          ))}
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Visibility</h3>
          <div className={styles.sectionBody}>
            <PrivacyRow icon="fad fa-eye"       label="Online status"  description="Who can see when you are online"      privacyKey="privacyOnlineStatus" />
            <PrivacyRow icon="fad fa-id-card"   label="Full name"      description="Who can see your first and last name" privacyKey="privacyFullName" />
            <PrivacyRow icon="fad fa-phone"     label="Phone number"   description="Who can see your phone number"        privacyKey="privacyPhone" />
            <PrivacyRow icon="fad fa-envelope"  label="Email address"  description="Who can see your email address"       privacyKey="privacyEmail" />
            <PrivacyRow icon="fad fa-venus-mars" label="Gender"        description="Who can see your gender"              privacyKey="privacyGender" />
            <PrivacyRow icon="fad fa-calendar"  label="Joined date"    description="Who can see when you joined"          privacyKey="privacyJoinedDate" />
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
