/**
 * DOSYA AMACI: Ayarlar modülünün varsayılan (fallback) konfigürasyonunu ve
 * gelen ayar verilerinin tip/sınır doğrulamasını (clamping, validation) yapan saf fonksiyonları içerir.
 */

import { LANGS, type Lang } from '@/lib/i18n';
import { ALL_THEMES, type GameTheme } from '@/game-engine/themes/themeConfig';
import type { UserSettings } from './types';

/**
 * Uygulamanın varsayılan fabrika ayarları.
 * Herhangi bir depolama bozulması veya ilk açılışta bu değerler referans alınır.
 */
export const DEFAULT_SETTINGS: Readonly<UserSettings> = Object.freeze({
  version: 1,
  language: 'en',
  theme: 'arcade',
  sound: Object.freeze({
    muted: false,
    volume: 80,
    sfxVolume: 80,
    sfxMuted: false,
    musicVolume: 70,
    musicMuted: false,
  }),
});

/**
 * Ses seviyesini 0 ile 100 arasında güvenli bir tam sayıya sınırlar (clamp).
 * Geçersiz (NaN, sonsuz vb.) değerler için varsayılan 80 döner.
 */
export function clampVolume(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_SETTINGS.sound.volume;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Verilen değerin geçerli ve desteklenen bir dil kodu olup olmadığını doğrular.
 */
export function isValidLang(value: unknown): value is Lang {
  if (typeof value !== 'string') return false;
  return LANGS.some((l) => l.code === value);
}

/**
 * Verilen değerin geçerli bir oyun teması olup olmadığını doğrular.
 */
export function isValidTheme(value: unknown): value is GameTheme {
  if (typeof value !== 'string') return false;
  return ALL_THEMES.some((t) => t.id === value);
}
