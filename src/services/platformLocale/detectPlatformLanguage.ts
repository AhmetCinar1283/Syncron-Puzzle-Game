/**
 * DOSYA AMACI: Platform SDK'sından kullanıcının dilini çözüp desteklenen bir
 * dil koduna indirger. ASLA throw etmez: kaynak yoksa, SDK hata verirse, zaman
 * aşımına uğrarsa ya da dil desteklenmiyorsa `FALLBACK_LANG` ("en") döner.
 */
import { LANGS, type Lang } from '@/lib/i18n';
import type { PlatformId } from '../monetization/types';
import { withTimeout } from '../monetization/withTimeout';
import { loadLocaleSourceFor } from './registry';
import { resolveSupportedLang } from './resolveLang';

export const FALLBACK_LANG: Lang = 'en';
export const LOCALE_DETECT_TIMEOUT_MS = 4000;

/** Platform için bir dil kaynağı tanımlı mı (yoksa algılamaya gerek yok). */
export function hasLocaleSource(platform: PlatformId): boolean {
  return loadLocaleSourceFor(platform) !== null;
}

export async function detectPlatformLanguage(
  platform: PlatformId,
  timeoutMs: number = LOCALE_DETECT_TIMEOUT_MS,
): Promise<Lang> {
  const supported = LANGS.map((l) => l.code);
  try {
    const loading = loadLocaleSourceFor(platform);
    if (!loading) return FALLBACK_LANG;
    const source = await loading;
    const raw = await withTimeout(source.getLocale(), timeoutMs, 'getLocale');
    return resolveSupportedLang(raw, supported, FALLBACK_LANG);
  } catch (err) {
    console.warn('[platformLocale] Dil algılanamadı, varsayılana düşülüyor:', err);
    return FALLBACK_LANG;
  }
}
