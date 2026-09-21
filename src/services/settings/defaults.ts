/**
 * DOSYA AMACI: Ayarlar modülünün varsayılan (fallback) konfigürasyonunu ve
 * gelen ayar verilerinin tip/sınır doğrulamasını (clamping, validation) yapan saf fonksiyonları içerir.
 */

import { LANGS, type Lang } from '@/lib/i18n';
import { ALL_THEMES, type GameTheme } from '@/game-engine/themes/themeConfig';
import type { MotionPreference, RendererPreference, UserSettings } from './types';

/** Güncel şema versiyonu. v1 → v2: controls / graphics / general grupları ve menü sesi eklendi. */
export const SETTINGS_VERSION = 2;

/**
 * Uygulamanın varsayılan (fabrika) ayarları.
 * Herhangi bir depolama bozulması veya ilk açılışta bu değerler referans alınır.
 */
export const DEFAULT_SETTINGS: Readonly<UserSettings> = Object.freeze({
  version: SETTINGS_VERSION,
  language: 'en',
  theme: 'arcade',
  sound: Object.freeze({
    muted: false,
    volume: 80,
    menuMuted: false,
    menuVolume: 70,
  }),
  controls: Object.freeze({
    keyboard: true,
    dpad: true,
    tapToMove: false,
    swipeSensitivity: 50,
    haptics: true,
  }),
  graphics: Object.freeze({
    renderer: 'auto',
    motion: 'auto',
    profiler: false,
  }),
  general: Object.freeze({
    wakeLock: false,
  }),
});

/**
 * Yüzdelik değeri (ses, hassasiyet) 0 ile 100 arasında güvenli bir tam sayıya sınırlar.
 * Geçersiz (NaN, sayı olmayan) değerler için `fallback` döner.
 */
export function clampPercent(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Ses seviyesini 0 ile 100 arasında güvenli bir tam sayıya sınırlar (clamp).
 * Geçersiz değerler için varsayılan oyun sesi (80) döner.
 */
export function clampVolume(value: unknown): number {
  return clampPercent(value, DEFAULT_SETTINGS.sound.volume);
}

/** Verilen değerin geçerli ve desteklenen bir dil kodu olup olmadığını doğrular. */
export function isValidLang(value: unknown): value is Lang {
  if (typeof value !== 'string') return false;
  return LANGS.some((l) => l.code === value);
}

/** Verilen değerin geçerli bir oyun teması olup olmadığını doğrular. */
export function isValidTheme(value: unknown): value is GameTheme {
  if (typeof value !== 'string') return false;
  return ALL_THEMES.some((t) => t.id === value);
}

/** Verilen değerin geçerli bir çizici tercihi olup olmadığını doğrular. */
export function isValidRenderer(value: unknown): value is RendererPreference {
  return value === 'auto' || value === 'dom' || value === 'canvas';
}

/** Verilen değerin geçerli bir hareket kademesi tercihi olup olmadığını doğrular. */
export function isValidMotion(value: unknown): value is MotionPreference {
  return value === 'auto' || value === 'full' || value === 'lite';
}
