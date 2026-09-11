/**
 * DOSYA AMACI: `NEXT_PUBLIC_PLATFORM` build-time env değerini okur ve geçerli bir
 * `PlatformId`'ye normalize eder. Kompozisyon kökünün (providerRegistry) tek girdisi.
 */
import type { PlatformId } from './types';

const KNOWN_PLATFORMS: readonly PlatformId[] = [
  'web',
  'android',
  'electron',
  'crazygames',
  'gamedistribution',
  'mock',
];

/** Bilinmeyen/boş değer güvenli varsayılan olan `web`'e düşer (uyarı ile). */
export function resolvePlatform(): PlatformId {
  const raw = process.env.NEXT_PUBLIC_PLATFORM;
  if (raw && (KNOWN_PLATFORMS as readonly string[]).includes(raw)) {
    return raw as PlatformId;
  }
  if (raw) {
    console.warn(`[monetization] Bilinmeyen NEXT_PUBLIC_PLATFORM="${raw}", "web" varsayılıyor.`);
  }
  return 'web';
}

/** Modül yüklenirken bir kez çözülür — build başına sabittir, akış içinde değişmez. */
export const CURRENT_PLATFORM: PlatformId = resolvePlatform();
