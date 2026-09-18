/**
 * DOSYA AMACI: Yayın build'inin geçmesi gereken kimlik kurallarının VERİSİ.
 * Burada hiç `if` yoktur; karar mantığı `evaluateReleaseConfig.mjs`'tedir.
 *
 * TASARIM NOTLARI
 * - Alternatif neydi? Kontrolleri doğrulama script'inin içine `if (platform ===
 *   'android') { ... }` olarak yazmak. Reddedildi: `00-mimari-ilkeler.md` §3
 *   platform dallanmasını yasaklıyor ve yeni bir portal eklemek her seferinde
 *   script'i düzenlemeyi gerektirirdi.
 * - Yeni platform/kimlik eklenince bu dosya değişmek zorunda mı? EVET — ve bu
 *   bilinçlidir: burası konfigürasyon sözleşmesinin ta kendisidir. Değişmemesi
 *   gereken yer karar mantığı ve giriş noktasıdır; onlar platform adı bilmez.
 * - Değer eksik/null gelirse? `presence` alanı bunu tanımlar: `required` eksikse
 *   hata, `optional` eksikse sessiz, `absent` VARSA hata.
 */

/**
 * @typedef {'env' | 'androidLocalProperties'} ConfigSource
 *   Kimliğin okunduğu yer. `env` → `.env*` + `process.env`;
 *   `androidLocalProperties` → `android/local.properties` (gitignore'lu).
 *
 * @typedef {object} ConfigRule
 * @property {string} key                Değişken/özellik adı.
 * @property {ConfigSource} source       Nereden okunacağı.
 * @property {'required'|'optional'|'absent'} presence
 * @property {string[]} [rejectValues]   Bu değerlere eşitse (case-insensitive) hata.
 * @property {boolean} [allowPlaceholder] true ise ortak placeholder taraması atlanır.
 * @property {{key: string, source: ConfigSource}[]} [alternatives]
 *   Aynı kimliğin okunabileceği DİĞER yerler, öncelik sırasıyla. İlk dolu olan
 *   kazanır. Kod tarafındaki çözüm sırası birden fazla kaynağa bakıyorsa
 *   (örn. build.gradle önce `ADMOB_APP_ID` env'ine bakar) kapı da aynısına
 *   bakmak ZORUNDADIR; yoksa CI'da yanlış yere hata verir.
 * @property {string} hint               Hata mesajının altına yazılan çözüm ipucu.
 */

/** Her platformda aranan ortak kurallar. */
const COMMON_RULES = /** @type {ConfigRule[]} */ ([
  {
    key: 'NEXT_PUBLIC_WORKER_URL',
    source: 'env',
    presence: 'required',
    hint: 'Cloudflare Worker adresi. Örn: https://<worker>.workers.dev — .env.local içine yaz.',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_API_KEY',
    source: 'env',
    presence: 'required',
    hint: 'Firebase Console → Proje ayarları → Web uygulaması yapılandırması.',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    source: 'env',
    presence: 'required',
    hint: 'Firebase Console → Proje ayarları → authDomain.',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    source: 'env',
    presence: 'required',
    hint: 'Firebase Console → Proje ayarları → projectId.',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    source: 'env',
    presence: 'required',
    hint: 'Firebase Console → Proje ayarları → storageBucket.',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    source: 'env',
    presence: 'required',
    hint: 'Firebase Console → Proje ayarları → messagingSenderId.',
  },
  {
    key: 'NEXT_PUBLIC_FIREBASE_APP_ID',
    source: 'env',
    presence: 'required',
    hint: 'Firebase Console → Proje ayarları → appId.',
  },
]);

/**
 * AdMob reklam birimleri — JS tarafı (`services/monetization/providers/admob`).
 * Üçü de eksikse oyun Google test kimlikleriyle çalışır ve GELİR ÜRETMEZ.
 */
const ADMOB_UNIT_RULES = /** @type {ConfigRule[]} */ ([
  {
    key: 'NEXT_PUBLIC_ADMOB_BANNER_ID',
    source: 'env',
    presence: 'required',
    hint: 'AdMob Console → Uygulama → Reklam birimleri → Banner.',
  },
  {
    key: 'NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID',
    source: 'env',
    presence: 'required',
    hint: 'AdMob Console → Uygulama → Reklam birimleri → Geçiş reklamı.',
  },
  {
    key: 'NEXT_PUBLIC_ADMOB_REWARDED_ID',
    source: 'env',
    presence: 'required',
    hint: 'AdMob Console → Uygulama → Reklam birimleri → Ödüllü reklam.',
  },
]);

/**
 * Platform → kural listesi. Ortak kurallar `evaluateReleaseConfig` tarafından
 * her platforma otomatik eklenir; burada yalnızca platforma ÖZEL olanlar durur.
 *
 * `crazygames` kasıtlı olarak boştur: CrazyGames SDK'sı oyun başına ayrı bir
 * kimlik istemez, oyunu yüklendiği domain üzerinden tanır.
 */
export const PLATFORM_RULES = Object.freeze({
  web: [],
  electron: [],
  mock: [],
  crazygames: [],
  gamedistribution: [
    {
      key: 'NEXT_PUBLIC_GD_GAME_ID',
      source: 'env',
      presence: 'required',
      hint: 'GameDistribution paneli → oyunun GUID biçimindeki game ID\'si. .env.local içine yaz.',
    },
  ],
  android: [
    ...ADMOB_UNIT_RULES,
    {
      key: 'admobAppId',
      source: 'androidLocalProperties',
      presence: 'required',
      // build.gradle çözüm sırası: ADMOB_APP_ID env → local.properties → gradle özelliği.
      // Gradle özelliği (~/.gradle/gradle.properties) bu script'ten okunamaz;
      // o yolu kullananlar ADMOB_APP_ID env'ini de vererek kapıdan geçer.
      alternatives: [{ key: 'ADMOB_APP_ID', source: 'env' }],
      hint: 'android/local.properties dosyasına "admobAppId=ca-app-pub-.....~....." satırını ekle (bu dosya gitignore\'ludur) ya da ADMOB_APP_ID ortam değişkenini ver.',
    },
    {
      key: 'NEXT_PUBLIC_ADMOB_USE_TEST_ADS',
      source: 'env',
      presence: 'absent',
      rejectValues: ['true', '1', 'yes', 'on'],
      hint: 'Bu bayrak açıkken gerçek kimlikler tanımlı olsa BİLE test reklamı gösterilir. Yayın build\'inden önce .env.local içinden kaldır.',
    },
    {
      key: 'NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID',
      source: 'env',
      presence: 'required',
      hint: 'Google Cloud Console → OAuth istemci kimlikleri → Web istemcisi. Eksikse Google ile giriş release build\'de sessizce başarısız olur.',
    },
  ],
});

/** Doğrulayıcının tanıdığı platform adları — `PLATFORM_RULES` ile tek kaynak. */
export const KNOWN_RELEASE_PLATFORMS = Object.freeze(Object.keys(PLATFORM_RULES));

export { COMMON_RULES };
