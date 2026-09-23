/**
 * DOSYA AMACI: Ham (güvenilmez) ayar verisini tam ve geçerli bir `UserSettings`
 * nesnesine çeviren saf fonksiyonlar. Depolamadan okunan veri de, `updateSettings`
 * ile gelen kısmi güncelleme de aynı doğrulamadan geçer (tek doğrulama noktası).
 */

import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  clampPercent,
  isValidLang,
  isValidMotion,
  isValidPadSide,
  isValidScheme,
  isValidRenderer,
  isValidTheme,
} from './defaults';
import type { UserSettings } from './types';

type Raw = Record<string, unknown>;

function asRecord(value: unknown): Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Raw) : {};
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Düz nesneleri derin birleştirir (`override` kazanır). Diziler ve ilkel değerler
 * olduğu gibi üzerine yazılır. `undefined` değerler yok sayılır.
 */
export function deepMerge(base: Raw, override: Raw): Raw {
  const result: Raw = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = result[key];
    const bothObjects =
      typeof value === 'object' && value !== null && !Array.isArray(value) &&
      typeof current === 'object' && current !== null && !Array.isArray(current);
    result[key] = bothObjects ? deepMerge(current as Raw, value as Raw) : value;
  }
  return result;
}

/**
 * Gelen ham veriyi DEFAULT_SETTINGS ile harmanlayarak tip ve sınır kontrolünden geçirir.
 * Eksik veya geçersiz her alan varsayılana düşer; sonuç her zaman geçerlidir.
 */
export function sanitizeSettings(data: unknown): UserSettings {
  const raw = asRecord(data);
  const sound = asRecord(raw.sound);
  const controls = asRecord(raw.controls);
  const graphics = asRecord(raw.graphics);
  const general = asRecord(raw.general);
  const d = DEFAULT_SETTINGS;

  return {
    version: SETTINGS_VERSION,
    language: isValidLang(raw.language) ? raw.language : d.language,
    theme: isValidTheme(raw.theme) ? raw.theme : d.theme,
    sound: {
      muted: bool(sound.muted, d.sound.muted),
      volume: clampPercent(sound.volume, d.sound.volume),
      menuMuted: bool(sound.menuMuted, d.sound.menuMuted),
      menuVolume: clampPercent(sound.menuVolume, d.sound.menuVolume),
    },
    controls: {
      keyboard: bool(controls.keyboard, d.controls.keyboard),
      // Eski sürümdeki `dpad: false` ayarı yalnızca kaydırma anlamına gelir.
      scheme: isValidScheme(controls.scheme)
        ? controls.scheme
        : controls.dpad === false ? 'swipe' : d.controls.scheme,
      padSide: isValidPadSide(controls.padSide) ? controls.padSide : d.controls.padSide,
      swipeSensitivity: clampPercent(controls.swipeSensitivity, d.controls.swipeSensitivity),
      haptics: bool(controls.haptics, d.controls.haptics),
    },
    graphics: {
      renderer: isValidRenderer(graphics.renderer) ? graphics.renderer : d.graphics.renderer,
      motion: isValidMotion(graphics.motion) ? graphics.motion : d.graphics.motion,
      profiler: bool(graphics.profiler, d.graphics.profiler),
    },
    general: {
      wakeLock: bool(general.wakeLock, d.general.wakeLock),
    },
  };
}
