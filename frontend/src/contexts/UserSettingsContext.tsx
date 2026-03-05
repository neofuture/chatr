'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserSettings {
  ghostTypingEnabled: boolean;
  showOnlineStatus: boolean;
  showPhoneNumber: boolean;
  showEmail: boolean;
}

const DEFAULTS: UserSettings = {
  ghostTypingEnabled: false,
  showOnlineStatus: true,
  showPhoneNumber: false,
  showEmail: false,
};

const STORAGE_KEY = 'chatr_user_settings';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// These keys are persisted to the server via REST on every change
const SERVER_KEYS: (keyof UserSettings)[] = ['showOnlineStatus', 'showPhoneNumber', 'showEmail'];

interface UserSettingsContextValue {
  settings: UserSettings;
  setSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

async function saveToServer(patch: Partial<UserSettings>) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token || token === 'undefined') return;
  try {
    await fetch(`${API}/api/users/me/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
  } catch {
    // silently ignore network errors — localStorage is the fallback
  }
}

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (typeof window === 'undefined') return DEFAULTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  // On mount, fetch the authoritative values from the server and merge them in.
  // DB is the source of truth for server-persisted settings.
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || token === 'undefined') return;

    fetch(`${API}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setSettings(prev => ({
          ...prev,
          ...(typeof data.showOnlineStatus === 'boolean' ? { showOnlineStatus: data.showOnlineStatus } : {}),
          ...(typeof data.showPhoneNumber  === 'boolean' ? { showPhoneNumber:  data.showPhoneNumber  } : {}),
          ...(typeof data.showEmail        === 'boolean' ? { showEmail:        data.showEmail        } : {}),
        }));
      })
      .catch(() => { /* fall back to localStorage */ });
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const setSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Immediately persist server-side keys via REST
    if (SERVER_KEYS.includes(key)) {
      saveToServer({ [key]: value } as Partial<UserSettings>);
    }
  };

  return (
    <UserSettingsContext.Provider value={{ settings, setSetting }}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) throw new Error('useUserSettings must be used within a UserSettingsProvider');
  return ctx;
}
