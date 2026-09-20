/**
 * DOSYA AMACI: Uygulamanın herhangi bir sayfasından veya bileşeninden kullanıcı ayarlarına
 * (dil, tema, ses açma/kapama, ses seviyesi ve ayarlar modalı kontrolleri) tek satırda
 * güvenle erişilmesini sağlayan React hook'udur.
 */

'use client';

import { useSettingsContext, type SettingsContextValue } from '../context/SettingsContext';

/**
 * Kullanıcı tercihlerine ve ayarlarına erişim sağlayan kanca.
 *
 * @example
 * ```tsx
 * const { settings, setLanguage, setTheme, setSoundMuted, setSoundVolume, openSettings } = useSettings();
 * ```
 */
export function useSettings(): SettingsContextValue {
  return useSettingsContext();
}

export type { SettingsContextValue };
