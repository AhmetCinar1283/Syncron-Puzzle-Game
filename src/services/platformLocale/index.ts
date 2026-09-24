/**
 * DOSYA AMACI: `services/platformLocale`'in public API'si. Dış tüketiciler
 * yalnızca bu dosyadan import eder.
 */
export {
  detectPlatformLanguage,
  hasLocaleSource,
  FALLBACK_LANG,
  LOCALE_DETECT_TIMEOUT_MS,
} from './detectPlatformLanguage';
export { resolveSupportedLang } from './resolveLang';
export type { PlatformLocaleSource } from './types';
