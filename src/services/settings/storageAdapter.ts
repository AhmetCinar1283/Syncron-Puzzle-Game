/**
 * DOSYA AMACI: Kullanıcı ayarlarının tarayıcı yerel depolamasına (localStorage)
 * yazılması, okunması, bozuk verilere karşı korunması ve eski anahtarlardan (legacy keys)
 * yeni birleşik şemaya geçişini (migration) sağlayan depolama adaptörüdür.
 */

import { userStorageGet, userStorageSet } from '@/lib/userStorage';
import { DEFAULT_SETTINGS, clampVolume, isValidLang, isValidTheme } from './defaults';
import type { UserSettings } from './types';

export const SETTINGS_STORAGE_KEY = 'syncron_settings_v1';

// Geriye dönük uyumluluk ve migration için kullanılan eski anahtarlar
const LEGACY_KEY_LANG = 'lang';
const LEGACY_KEY_THEME = 'know_and_conquer_game_theme';
const LEGACY_KEY_SOUND_MUTED = 'soundMuted';

/**
 * Depolamadaki ayarları okur ve doğrular.
 * Birleşik anahtar yoksa eski anahtarlardan otomatik migration yapar.
 * Herhangi bir hata veya eksiklik durumunda güvenle varsayılan değerlere döner.
 */
export function loadSettingsFromStorage(): UserSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return sanitizeSettings(parsed);
      }
    }
  } catch {
    // JSON parse hatası veya localStorage erişim engeli
  }

  // Birleşik anahtar henüz yoksa eski anahtarları kontrol ederek migrate et
  return migrateFromLegacyKeys();
}

/**
 * Ayarları depolamaya kaydeder.
 * Geriye dönük tam uyumluluk (dual-write) amacıyla eski anahtarları da günceller.
 */
export function saveSettingsToStorage(settings: UserSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

    // Dual-write: Henüz yeni modüle geçirilmemiş eski sayfaların/bileşenlerin kırılmaması için
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

/**
 * Gelen ham veriyi DEFAULT_SETTINGS ile harmanlayarak sınır ve tip kontrolünden geçirir.
 */
function sanitizeSettings(data: Record<string, unknown>): UserSettings {
  const soundData = (typeof data.sound === 'object' && data.sound !== null)
    ? (data.sound as Record<string, unknown>)
    : {};

  const language = isValidLang(data.language) ? data.language : DEFAULT_SETTINGS.language;
  const theme = isValidTheme(data.theme) ? data.theme : DEFAULT_SETTINGS.theme;
  const muted = typeof soundData.muted === 'boolean' ? soundData.muted : DEFAULT_SETTINGS.sound.muted;
  const volume = clampVolume(soundData.volume);

  return {
    version: 1,
    language,
    theme,
    sound: {
      muted,
      volume,
      sfxVolume: typeof soundData.sfxVolume === 'number' ? clampVolume(soundData.sfxVolume) : volume,
      sfxMuted: typeof soundData.sfxMuted === 'boolean' ? soundData.sfxMuted : muted,
      musicVolume: typeof soundData.musicVolume === 'number' ? clampVolume(soundData.musicVolume) : DEFAULT_SETTINGS.sound.musicVolume,
      musicMuted: typeof soundData.musicMuted === 'boolean' ? soundData.musicMuted : DEFAULT_SETTINGS.sound.musicMuted,
    },
  };
}

/**
 * Eski bağımsız anahtarları kontrol ederek yeni UserSettings nesnesine dönüştürür.
 */
function migrateFromLegacyKeys(): UserSettings {
  const result: UserSettings = {
    version: 1,
    language: DEFAULT_SETTINGS.language,
    theme: DEFAULT_SETTINGS.theme,
    sound: { ...DEFAULT_SETTINGS.sound },
  };

  try {
    const legacyLang = localStorage.getItem(LEGACY_KEY_LANG);
    if (isValidLang(legacyLang)) {
      result.language = legacyLang;
    }

    const legacyTheme = localStorage.getItem(LEGACY_KEY_THEME);
    if (isValidTheme(legacyTheme)) {
      result.theme = legacyTheme;
    }

    const legacyMuted = userStorageGet(LEGACY_KEY_SOUND_MUTED) ?? localStorage.getItem(LEGACY_KEY_SOUND_MUTED);
    if (legacyMuted !== null) {
      result.sound.muted = legacyMuted === 'true';
    }
  } catch {
    // Migration sırasında oluşabilecek hataları yut, varsayılanlara güven
  }

  // İlk okumada elde edilen migration sonucunu birleşik anahtara yaz
  saveSettingsToStorage(result);
  return result;
}
