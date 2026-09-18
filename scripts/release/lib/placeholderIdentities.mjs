/**
 * DOSYA AMACI: "Bu değer gerçek bir yayın kimliği mi, yoksa test/örnek değer mi?"
 * sorusunun tek doğruluk kaynağı. Saf veri + saf tespit fonksiyonu; dosya sistemi,
 * ortam değişkeni ve platform bilmez.
 *
 * Buradaki değerlerin hiçbiri sır DEĞİLDİR: Google'ın ve GameDistribution'ın
 * herkese açık test kimlikleri ile kodun içindeki mock fallback'lerdir. Gerçek
 * kimlikler bu depoya asla girmez (bkz. `00-ilkeler.md` §2.3) — bu dosya tam
 * tersini yapar: gerçek olmayan değerleri tanıyıp yayın build'ini durdurur.
 *
 * TASARIM NOTLARI
 * - Alternatif neydi? Her kimlik kuralının içine kendi "yasak değer" listesini
 *   gömmek. Reddedildi: aynı AdMob test öneki üç kuralda tekrarlanırdı ve yeni
 *   bir test kimliği öğrenildiğinde üç yerde güncellenmesi gerekirdi.
 * - Yeni bir kimlik türü eklenince bu dosya değişmek zorunda mı? Hayır. Yeni
 *   kimlik `releaseConfigRules.mjs`'e bir satırdır; buraya yalnızca yeni bir
 *   *placeholder deseni* öğrenildiğinde dokunulur.
 * - Değer eksik/null gelirse? `isPlaceholderValue(undefined)` false döner —
 *   "eksik" ile "sahte" ayrı arızalardır ve ayrı mesaj üretirler (bkz.
 *   `evaluateReleaseConfig.mjs`). Bu dosya yalnızca "sahte" sorusuna bakar.
 */

/**
 * Google AdMob'un herkese açık test kimlikleri bu yayıncı numarasıyla başlar.
 * Hem `~` (App ID) hem `/` (reklam birimi) biçimini tek önek yakalar.
 * Kaynak: https://developers.google.com/admob/android/test-ads
 */
export const ADMOB_TEST_PUBLISHER_PREFIX = 'ca-app-pub-3940256099942544';

/** GameDistribution SDK'sının sahte reklam döndüren test game ID'si. */
export const GD_TEST_GAME_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Tam eşleşmeyle reddedilen değerler (küçük harfe indirilerek karşılaştırılır).
 * Firebase satırları `src/services/firebase/config.ts` içindeki `||` fallback
 * değerleridir — env eksikse build kırılmasın diye konmuşlardı; yayında
 * kullanılırlarsa uygulama var olmayan bir projeye bağlanır.
 */
export const EXACT_PLACEHOLDER_VALUES = Object.freeze([
  GD_TEST_GAME_ID,
  'mock-api-key-value-to-pass-nextjs-build',
  'mock-auth-domain.firebaseapp.com',
  'mock-project-id',
  'mock-storage-bucket.appspot.com',
  '123456789012',
  '1:123456789012:web:1234567890abcdef123456',
  'g-mockmeasure',
]);

/**
 * Önek eşleşmesiyle reddedilenler. `mock-`/`test-`/`your-`/`xxx` gibi genel
 * işaretçiler, dokümantasyondan kopyalanıp doldurulmayı unutulmuş değerleri de
 * yakalar (`ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX` gibi).
 */
export const PLACEHOLDER_PREFIXES = Object.freeze([
  ADMOB_TEST_PUBLISHER_PREFIX,
  'mock-',
  'your-',
  'changeme',
  'todo',
  'example.',
  'http://localhost',
  'https://localhost',
]);

/**
 * Değerin herhangi bir yerinde geçtiğinde reddedilen işaretçiler. Doldurulmamış
 * şablonlar tipik olarak `XXXX` ya da `<...>` taşır.
 */
export const PLACEHOLDER_MARKERS = Object.freeze(['xxxx', '<', '>']);

/**
 * @param {unknown} value
 * @returns {boolean} Değer tanınmış bir test/örnek kimlikse `true`.
 *   Tanımsız, boş veya string olmayan girdi için `false` (o ayrı bir hatadır).
 */
export function isPlaceholderValue(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (EXACT_PLACEHOLDER_VALUES.includes(normalized)) return true;
  if (PLACEHOLDER_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;
  if (PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker))) return true;
  return false;
}
