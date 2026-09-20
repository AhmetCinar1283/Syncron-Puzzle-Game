/**
 * DOSYA AMACI: Kullanıcı ayarlarının React Context sağlayıcısıdır (SettingsProvider).
 * `services/settings` servisindeki singleton durumu dinler, React bileşen ağacına reaktif olarak
 * aktarır ve ayarlar modalının açık/kapalı durumunu yönetir.
 */

'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  settingsService,
  type UserSettings,
  type SettingsUpdatePayload,
} from '@/services/settings';
import type { Lang } from '@/lib/i18n';
import type { GameTheme } from '@/game-engine/themes/themeConfig';

export interface SettingsContextValue {
  /** Güncel kullanıcı ayarları (dil, tema, ses vb.). */
  settings: UserSettings;
  /** Arayüz dilini günceller. */
  setLanguage: (lang: Lang) => void;
  /** Görsel temayı günceller. */
  setTheme: (theme: GameTheme) => void;
  /** Ses açık/kapalı durumunu belirler. */
  setSoundMuted: (muted: boolean) => void;
  /** Ses durumunu tersine çevirir (toggle). */
  toggleSoundMute: () => void;
  /** Ana ses seviyesini (0 - 100) ayarlar. */
  setSoundVolume: (volume: number) => void;
  /** Kısmi ayar güncellemesi yapar. */
  updateSettings: (payload: SettingsUpdatePayload) => void;
  /** Ayarları fabrika değerlerine sıfırlar. */
  resetToDefaults: () => void;
  /** Global ayarlar modalının açık olup olmadığı. */
  isSettingsOpen: boolean;
  /** Global ayarlar modalını açar. */
  openSettings: () => void;
  /** Global ayarlar modalını kapatır. */
  closeSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => settingsService.getSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // settingsService değişikliklerine abone ol
  useEffect(() => {
    const unsubscribe = settingsService.subscribe((next) => {
      setSettings(next);
    });
    return unsubscribe;
  }, []);

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setLanguage: (lang) => settingsService.setLanguage(lang),
      setTheme: (theme) => settingsService.setTheme(theme),
      setSoundMuted: (muted) => settingsService.setSoundMuted(muted),
      toggleSoundMute: () => settingsService.toggleSoundMute(),
      setSoundVolume: (volume) => settingsService.setSoundVolume(volume),
      updateSettings: (payload) => settingsService.updateSettings(payload),
      resetToDefaults: () => settingsService.resetToDefaults(),
      isSettingsOpen,
      openSettings,
      closeSettings,
    }),
    [settings, isSettingsOpen],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * SettingsContext değerine doğrudan erişim sağlayan dahili React hook'u.
 */
export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
