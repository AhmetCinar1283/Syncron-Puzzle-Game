/**
 * DOSYA AMACI: Kullanıcı ayarlarının tarayıcı yerel depolamasına (localStorage)
 * yazılması, okunması ve bozuk / eski şemalı verilere karşı korunması. Eski
 * anahtarlardan geçiş (migration) verisini `legacyKeys.ts`'ten alır.
 */

import { userStorageSet } from '@/lib/userStorage';
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from './defaults';
import { LEGACY_KEY_LANG, LEGACY_KEY_SOUND_MUTED, LEGACY_KEY_THEME, readLegacyPreferences } from './legacyKeys';
import { deepMerge, sanitizeSettings } from './sanitize';
import type { UserSettings } from './types';

export const SETTINGS_STORAGE_KEY = 'syncron_settings_v1';

/**
 * Depolamadaki ayarları okur ve doğrular.
 * - Kayıt yoksa (ilk açılış) veya şema eskiyse (v1) dağınık eski anahtarlar
 *   birleştirilir; kayıttaki değerler her zaman kazanır.
 * - Hata / bozuk veri durumunda güvenle varsayılan değerlere döner.
 */
export function loadSettingsFromStorage(): UserSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS };
  }

  let stored: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') stored = parsed as Record<string, unknown>;
  } catch {
    // JSON parse hatası veya localStorage erişim engeli
  }

  const isCurrent = stored.version === SETTINGS_VERSION;
  const merged = isCurrent ? stored : deepMerge(readLegacyPreferences() as Record<string, unknown>, stored);
  const settings = sanitizeSettings(merged);

  // Yeni kayıt / şema yükseltmesi: birleşik anahtara hemen yaz
  if (!isCurrent) saveSettingsToStorage(settings);
  return settings;
}

/**
 * Ayarları depolamaya kaydeder.
 * Henüz yeni modüle geçmemiş okuyucular için dil, tema ve ses kapalı bilgisini
 * eski anahtarlara da yazar (dual-write).
 */
export function saveSettingsToStorage(settings: UserSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

    try {
      localStorage.setItem(LEGACY_KEY_LANG, settings.language);
    } catch {}

    try {
      localStorage.setItem(LEGACY_KEY_THEME, settings.theme);
      // DOM temasını da hemen uygula
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-game-theme', settings.theme);
      }
    } catch {}

    try {
      userStorageSet(LEGACY_KEY_SOUND_MUTED, String(settings.sound.muted));
    } catch {}
  } catch {
    // Depolama kotası dolmuşsa veya erişim kısıtlıysa oyun akışı kesilmez
  }
}
