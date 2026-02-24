'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserSettings {
  ghostTypingEnabled: boolean;
  showOnlineStatus: boolean;
}

const DEFAULTS: UserSettings = {
  ghostTypingEnabled: false,
  showOnlineStatus: true,
};

const STORAGE_KEY = 'chatr_user_settings';

interface UserSettingsContextValue {
  settings: UserSettings;
  setSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

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

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const setSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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

