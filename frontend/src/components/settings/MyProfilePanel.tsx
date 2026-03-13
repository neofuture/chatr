'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import ProfileImageUploader from '@/components/image-manip/ProfileImageUploader/ProfileImageUploader';
import CoverImageUploader from '@/components/image-manip/CoverImageUploader/CoverImageUploader';
import { socketFirst } from '@/lib/socketRPC';
import styles from './MyProfilePanel.module.css';

function getLocalUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
}

export default function MyProfilePanel() {
  const { theme } = useTheme();
  const { socket } = useWebSocket();
  const isDark = theme === 'dark';

  const [user, setUser] = useState(getLocalUser);
  const userId = user.id || '';

  useEffect(() => {
    socketFirst(socket, 'users:me', {}, 'GET', '/api/users/me')
      .then((data: any) => {
        if (data) {
          setUser(data);
          localStorage.setItem('user', JSON.stringify({ ...getLocalUser(), ...data }));
        }
      })
      .catch(() => {});
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
        <div className={styles.cover}>
          <CoverImageUploader userId={userId} isDark={isDark} />
        </div>
        <div className={styles.avatarWrap}>
          <ProfileImageUploader userId={userId} isDark={isDark} />
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.nameBlock}>
          <h2 className={styles.displayName}>{displayName}</h2>
          <p className={styles.username}>@{user.username?.replace(/^@/, '')}</p>
        </div>

        {/* Editable fields */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Profile</h3>
          <div className={styles.sectionBody}>
            <InlineField label="Display name" field="displayName" value={user.displayName || ''} placeholder="Add a display name" onSaved={setUser} socket={socket} />
            <InlineField label="First name" field="firstName" value={user.firstName || ''} placeholder="Add your first name" onSaved={setUser} socket={socket} />
            <InlineField label="Last name" field="lastName" value={user.lastName || ''} placeholder="Add your last name" onSaved={setUser} socket={socket} />
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Gender</span>
              <GenderSelect value={user.gender || ''} options={GENDER_OPTIONS} genderLabel={genderLabel} onSaved={setUser} socket={socket} />
            </div>
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

/* ── Self-contained inline text field ── */
function InlineField({ label, field, value, placeholder, onSaved, socket }: {
  label: string; field: string; value: string; placeholder: string;
  onSaved: (updater: (prev: any) => any) => void;
  socket: any;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const saved = useRef(false);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const save = () => {
    if (saved.current) return;
    saved.current = true;
    setEditing(false);
    if (text === value) { saved.current = false; return; }

    onSaved((prev: any) => ({ ...prev, [field]: text || null }));
    socketFirst(socket, 'users:me:update', { [field]: text || null }, 'PUT', '/api/users/me', { [field]: text || null })
      .then((data: any) => {
        if (data) {
          onSaved((prev: any) => ({ ...prev, ...data }));
          try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...u, ...data }));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => { saved.current = false; });
  };

  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      {editing ? (
        <div className={styles.fieldEdit}>
          <input
            ref={inputRef}
            className={styles.fieldInput}
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === 'Enter') inputRef.current?.blur(); if (e.key === 'Escape') { setText(value); setEditing(false); saved.current = false; } }}
            placeholder={placeholder}
          />
        </div>
      ) : (
        <button className={styles.fieldValueBtn} onClick={() => { saved.current = false; setEditing(true); }}>
          <span className={value ? styles.fieldValue : styles.fieldPlaceholder}>
            {value || placeholder}
          </span>
        </button>
      )}
    </div>
  );
}

/* ── Self-contained gender select ── */
function GenderSelect({ value, options, genderLabel, onSaved, socket }: {
  value: string;
  options: { value: string; label: string }[];
  genderLabel: (v: string | null) => string;
  onSaved: (updater: (prev: any) => any) => void;
  socket: any;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { if (editing && selectRef.current) selectRef.current.focus(); }, [editing]);

  const save = (newVal: string) => {
    setEditing(false);
    if (newVal === value) return;

    onSaved((prev: any) => ({ ...prev, gender: newVal || null }));
    socketFirst(socket, 'users:me:update', { gender: newVal || null }, 'PUT', '/api/users/me', { gender: newVal || null })
      .then((data: any) => {
        if (data) {
          onSaved((prev: any) => ({ ...prev, ...data }));
          try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...u, ...data }));
          } catch {}
        }
      })
      .catch(() => {});
  };

  return editing ? (
    <div className={styles.fieldEdit}>
      <div className={styles.selectWrap}>
        <select
          ref={selectRef}
          className={styles.fieldSelect}
          defaultValue={value}
          onChange={e => save(e.target.value)}
          onBlur={() => setEditing(false)}
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
  );
}
