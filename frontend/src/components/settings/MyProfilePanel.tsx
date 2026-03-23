'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import ProfileImageUploader from '@/components/image-manip/ProfileImageUploader/ProfileImageUploader';
import CoverImageUploader from '@/components/image-manip/CoverImageUploader/CoverImageUploader';
import styles from './MyProfilePanel.module.css';
import { getApiBase } from '@/lib/api';

const API = getApiBase();

function getToken() {
  return localStorage.getItem('token') || '';
}

function getLocalUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
}

async function fetchMe(): Promise<any> {
  const res = await fetch(`${API}/api/users/me`, {
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function updateMe(body: Record<string, any>): Promise<any> {
  const res = await fetch(`${API}/api/users/me`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export default function MyProfilePanel() {
  const { theme } = useTheme();
  const { socket } = useWebSocket();
  const isDark = theme === 'dark';

  const [user, setUser] = useState(getLocalUser);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const userId = user.id || '';

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMe();
      if (data) {
        setUser(data);
        localStorage.setItem('user', JSON.stringify({ ...getLocalUser(), ...data }));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const saveField = useCallback(async (updates: Record<string, any>): Promise<boolean> => {
    setSaveStatus('saving');
    try {
      const data = await updateMe(updates);
      if (data) {
        setUser((prev: any) => ({ ...prev, ...data }));
        try {
          const u = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...u, ...data }));
        } catch {}
        if (socket?.connected) {
          socket.emit('user:profileUpdate:self', data);
        }
        window.dispatchEvent(new Event('chatr:auth-changed'));
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
      return true;
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
      return false;
    }
  }, [socket]);

  const GENDER_OPTIONS = [
    { value: '', label: 'Not specified' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  ];

  const genderLabel = (val: string | null) =>
    GENDER_OPTIONS.find(o => o.value === (val ?? ''))?.label || 'Not specified';

  const displayName = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username?.replace(/^@/, '') || '';

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.cover} data-testid="profile-cover">
          <CoverImageUploader userId={userId} isDark={isDark} />
        </div>
        <div className={styles.avatarWrap} data-testid="profile-avatar">
          <ProfileImageUploader userId={userId} isDark={isDark} />
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.nameBlock}>
          <h2 className={styles.displayName}>{loading ? '\u00A0' : displayName}</h2>
          <p className={styles.username}>@{user.username?.replace(/^@/, '')}</p>
        </div>

        {saveStatus === 'saving' && <div className={styles.saveIndicator}>Saving…</div>}
        {saveStatus === 'saved' && <div className={`${styles.saveIndicator} ${styles.saveSuccess}`}>Saved</div>}
        {saveStatus === 'error' && <div className={`${styles.saveIndicator} ${styles.saveError}`}>Save failed</div>}

        {/* Editable fields */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Profile</h3>
          <div className={styles.sectionBody}>
            <InlineField label="Display name" field="displayName" value={user.displayName || ''} placeholder="Add a display name" onSave={saveField} />
            <InlineField label="First name" field="firstName" value={user.firstName || ''} placeholder="Add your first name" onSave={saveField} />
            <InlineField label="Last name" field="lastName" value={user.lastName || ''} placeholder="Add your last name" onSave={saveField} />
            <GenderField label="Gender" value={user.gender || ''} options={GENDER_OPTIONS} genderLabel={genderLabel} onSave={saveField} />
          </div>
        </section>

        {/* Read-only info */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Account</h3>
          <div className={styles.sectionBody}>
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Username</span>
              <span className={styles.fieldValue}>@{user.username?.replace(/^@/, '')}</span>
            </div>
            {user.email && (
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Email</span>
                <span className={styles.fieldValue}>{user.email}</span>
              </div>
            )}
            {user.phoneNumber && (
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Phone</span>
                <span className={styles.fieldValue}>{user.phoneNumber}</span>
              </div>
            )}
            {user.createdAt && (
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Joined</span>
                <span className={styles.fieldValue}>{new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Self-contained inline text field with per-field save indicator ── */
function InlineField({ label, field, value, placeholder, onSave }: {
  label: string; field: string; value: string; placeholder: string;
  onSave: (updates: Record<string, any>) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [fieldStatus, setFieldStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const latestText = useRef(value);

  useEffect(() => { setText(value); latestText.current = value; }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setText(v);
    latestText.current = v;
  };

  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    const currentText = latestText.current;
    setEditing(false);
    if (currentText.trim() === value) { saving.current = false; return; }
    setText(currentText);
    setFieldStatus('saving');
    const ok = await onSave({ [field]: currentText.trim() || null });
    setFieldStatus(ok ? 'saved' : 'error');
    setTimeout(() => setFieldStatus('idle'), 2000);
    saving.current = false;
  };

  return (
    <div className={styles.fieldRow} data-testid={`field-${field}`} data-save-status={fieldStatus}>
      <span className={styles.fieldLabel}>{label}</span>
      {editing ? (
        <div className={styles.fieldEdit}>
          <input
            ref={inputRef}
            className={styles.fieldInput}
            value={text}
            onChange={handleChange}
            onBlur={save}
            onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.blur(); if (e.key === 'Escape') { setText(value); latestText.current = value; setEditing(false); saving.current = false; } }}
            placeholder={placeholder}
          />
        </div>
      ) : (
        <button className={styles.fieldValueBtn} onClick={() => { saving.current = false; setEditing(true); }}>
          <span className={value ? styles.fieldValue : styles.fieldPlaceholder}>
            {value || placeholder}
          </span>
        </button>
      )}
      <FieldStatusIcon status={fieldStatus} />
    </div>
  );
}

/* ── Inline save status icon ── */
function FieldStatusIcon({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null;
  const iconMap = {
    saving: { cls: 'fas fa-spinner fa-spin', color: '#94a3b8' },
    saved:  { cls: 'fas fa-check', color: '#22c55e' },
    error:  { cls: 'fas fa-times', color: '#ef4444' },
  } as const;
  const { cls, color } = iconMap[status];
  return <i className={cls} style={{ color, fontSize: '12px', flexShrink: 0, marginLeft: '4px' }} />;
}

/* ── Self-contained gender field with per-field save indicator ── */
function GenderField({ label, value, options, genderLabel, onSave }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  genderLabel: (v: string | null) => string;
  onSave: (updates: Record<string, any>) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(value);
  const [fieldStatus, setFieldStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const selectRef = useRef<HTMLSelectElement>(null);
  const savingRef = useRef(false);

  useEffect(() => { setSelected(value); }, [value]);
  useEffect(() => { if (editing && selectRef.current) selectRef.current.focus(); }, [editing]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (savingRef.current) return;
    const newVal = e.target.value;
    setSelected(newVal);
    savingRef.current = true;
    setEditing(false);
    if (newVal !== value) {
      setFieldStatus('saving');
      const ok = await onSave({ gender: newVal || null });
      setFieldStatus(ok ? 'saved' : 'error');
      setTimeout(() => setFieldStatus('idle'), 2000);
    }
    savingRef.current = false;
  };

  return (
    <div className={styles.fieldRow} data-testid="field-gender" data-save-status={fieldStatus}>
      <span className={styles.fieldLabel}>{label}</span>
      {editing ? (
        <div className={styles.fieldEdit}>
          <div className={styles.selectWrap}>
            <select
              ref={selectRef}
              className={styles.fieldSelect}
              value={selected}
              onChange={handleChange}
              onBlur={() => { if (!savingRef.current) setEditing(false); }}
            >
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <i className={`fas fa-chevron-down ${styles.selectChevron}`} />
          </div>
        </div>
      ) : (
        <button className={styles.fieldValueBtn} onClick={() => setEditing(true)}>
          <span className={value ? styles.fieldValue : styles.fieldPlaceholder}>
            {genderLabel(value || null)}
          </span>
        </button>
      )}
      <FieldStatusIcon status={fieldStatus} />
    </div>
  );
}
