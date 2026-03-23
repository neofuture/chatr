'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { syncProfileImageFromServer } from '@/lib/profileImageService';
import { syncCoverImageFromServer } from '@/lib/coverImageService';
import { socketFirst } from '@/lib/socketRPC';
import { getApiBase } from '@/lib/api';

export type PrivacyLevel = 'everyone' | 'friends' | 'nobody';

export interface UserSettings {
  ghostTypingEnabled: boolean;
  privacyOnlineStatus: PrivacyLevel;
  privacyPhone: PrivacyLevel;
  privacyEmail: PrivacyLevel;
  privacyFullName: PrivacyLevel;
  privacyGender: PrivacyLevel;
  privacyJoinedDate: PrivacyLevel;
}

const DEFAULTS: UserSettings = {
  ghostTypingEnabled: false,
  privacyOnlineStatus: 'everyone',
  privacyPhone: 'nobody',
  privacyEmail: 'nobody',
  privacyFullName: 'everyone',
  privacyGender: 'nobody',
  privacyJoinedDate: 'everyone',
};

const STORAGE_KEY = 'chatr_user_settings';
const API = getApiBase();

const PRIVACY_KEYS: (keyof UserSettings)[] = [
  'privacyOnlineStatus', 'privacyPhone', 'privacyEmail',
  'privacyFullName', 'privacyGender', 'privacyJoinedDate',
];

function isPrivacyLevel(v: unknown): v is PrivacyLevel {
  return v === 'everyone' || v === 'friends' || v === 'nobody';
}

interface UserSettingsContextValue {
  settings: UserSettings;
  setSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { socket, connected } = useWebSocket();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || token === 'undefined') return;
    if (!connected) return;

    let cancelled = false;
    socketFirst(socket, 'users:me', {}, 'GET', '/api/users/me')
      .then((data: any) => {
        if (cancelled || !data) return;
        setSettings(prev => ({
          ...prev,
          ...(isPrivacyLevel(data.privacyOnlineStatus) ? { privacyOnlineStatus: data.privacyOnlineStatus } : {}),
          ...(isPrivacyLevel(data.privacyPhone)         ? { privacyPhone:        data.privacyPhone }        : {}),
          ...(isPrivacyLevel(data.privacyEmail)         ? { privacyEmail:        data.privacyEmail }        : {}),
          ...(isPrivacyLevel(data.privacyFullName)      ? { privacyFullName:     data.privacyFullName }     : {}),
          ...(isPrivacyLevel(data.privacyGender)        ? { privacyGender:       data.privacyGender }       : {}),
          ...(isPrivacyLevel(data.privacyJoinedDate)    ? { privacyJoinedDate:   data.privacyJoinedDate }   : {}),
        }));

        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            let changed = false;
            if (data.profileImage !== undefined && data.profileImage !== user.profileImage) {
              user.profileImage = data.profileImage;
              changed = true;
            }
            if (data.coverImage !== undefined && data.coverImage !== user.coverImage) {
              user.coverImage = data.coverImage;
              changed = true;
            }
            if (changed) localStorage.setItem('user', JSON.stringify(user));
          }
        } catch {}

        if (data.profileImage) setProfileImageUrl(data.profileImage);
        if (data.coverImage) setCoverImageUrl(data.coverImage);

        const uid = data.id;
        if (uid) {
          syncProfileImageFromServer(uid, data.profileImage).catch(() => {});
          syncCoverImageFromServer(uid, data.coverImage).catch(() => {});
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [socket, connected]);

  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const getUser = () => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } };
    const uid = getUser()?.id;
    if (!uid) return;
    syncIntervalRef.current = setInterval(() => {
      const u = getUser();
      syncProfileImageFromServer(uid, u.profileImage).catch(() => {});
      syncCoverImageFromServer(uid, u.coverImage).catch(() => {});
    }, 5 * 60 * 1000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const setSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (PRIVACY_KEYS.includes(key)) {
      socketFirst(socket, 'users:me:settings', { [key]: value }, 'PUT', '/api/users/me/settings', { [key]: value }).catch(() => {});
    }
  };

  return (
    <UserSettingsContext.Provider value={{ settings, setSetting, profileImageUrl, coverImageUrl }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) throw new Error('useUserSettings must be used within a UserSettingsProvider');
  return ctx;
}
