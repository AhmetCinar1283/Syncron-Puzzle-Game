/**
 * DOSYA AMACI: Birleşik ayar şemasından önce dağınık tutulan eski localStorage
 * anahtarlarını (dil, tema, ses, haptik, hareket kademesi) okuyup
 * kısmi bir ayar nesnesine çeviren tek noktadır. Yalnızca ilk açılış / v1 → v2
 * geçişinde kullanılır; yazma tarafı `storageAdapter.ts`'tedir.
 */

import { userStorageGet } from '@/lib/userStorage';
import { isValidLang, isValidMotion, isValidTheme } from './defaults';
import type { SettingsUpdatePayload } from './types';

export const LEGACY_KEY_LANG = 'lang';
export const LEGACY_KEY_THEME = 'know_and_conquer_game_theme';
export const LEGACY_KEY_SOUND_MUTED = 'soundMuted';
const LEGACY_KEY_HAPTICS = 'hapticsEnabled';
const LEGACY_KEY_MOTION = 'motionTier';

/** Eski anahtarlarda bulunan değerleri kısmi ayar olarak döner (bulunmayanlar atlanır). */
export function readLegacyPreferences(): SettingsUpdatePayload {
  const result: SettingsUpdatePayload = {};

  try {
    const lang = localStorage.getItem(LEGACY_KEY_LANG);
    if (isValidLang(lang)) result.language = lang;

    const theme = localStorage.getItem(LEGACY_KEY_THEME);
    if (isValidTheme(theme)) result.theme = theme;

    const muted = userStorageGet(LEGACY_KEY_SOUND_MUTED) ?? localStorage.getItem(LEGACY_KEY_SOUND_MUTED);
    if (muted !== null) result.sound = { muted: muted === 'true' };

    // Eski şemada 'auto' = anahtar yok; yalnızca açık seçimler taşınır.
    const motion = userStorageGet(LEGACY_KEY_MOTION);
    result.graphics = {
      ...(isValidMotion(motion) ? { motion } : {}),
    };

    const haptics = userStorageGet(LEGACY_KEY_HAPTICS);
    if (haptics !== null) result.controls = { haptics: haptics !== 'false' };
  } catch {
    // Okuma sırasında oluşabilecek hataları yut, varsayılanlara güven
  }

  return result;
}
