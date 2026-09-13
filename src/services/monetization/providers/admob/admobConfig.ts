/**
 * DOSYA AMACI: AdMob reklam birimi kimliklerini ortam değişkenlerinden çözer.
 * Kimlikler koda GÖMÜLMEZ; gerçek bir kimlik yalnızca ilgili env değeri açıkça
 * verildiğinde kullanılır, aksi halde Google'ın resmî test kimliklerine düşülür
 * (yanlışlıkla gerçek reklama tıklanıp hesabın askıya alınmasını önler).
 */

/**
 * Google'ın herkese açık Android test kimlikleri.
 * Kaynak: https://developers.google.com/admob/android/test-ads
 * Bunlara tıklamak güvenlidir ve hiçbir zaman gelir/ihlal üretmez.
 */
export const ADMOB_TEST_IDS = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
} as const;

export interface AdMobConfig {
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
  /** Test kimlikleri kullanılıyorsa true — `AdOptions.isTesting` bu değeri alır. */
  usingTestIds: boolean;
  /** `AdMobInitializationOptions.testingDevices` — gerçek kimliklerle güvenli test için. */
  testDeviceIds: string[];
}

/** Boş/whitespace env değerini "tanımsız" sayar. */
function readEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * `NEXT_PUBLIC_ADMOB_USE_TEST_ADS=true` verilirse gerçek kimlikler tanımlı olsa
 * bile test kimlikleri kullanılır (cihazda güvenle denemek için).
 */
function testAdsForced(): boolean {
  return readEnv(process.env.NEXT_PUBLIC_ADMOB_USE_TEST_ADS) === 'true';
}

let warned = false;

/**
 * Eksik kimlikleri yüksek sesle bildirir. `logcat`'te `[admob]` filtresiyle
 * görünür; yayın öncesi kontrol listesi için bkz. `docs/platforms.md`.
 */
function warnOnce(missing: string[], forced: boolean): void {
  if (warned) return;
  warned = true;
  if (forced) {
    console.warn(
      '[admob] NEXT_PUBLIC_ADMOB_USE_TEST_ADS=true — TÜM reklamlar Google TEST kimlikleriyle gösteriliyor. Yayın build\'inde bu değeri kaldır.',
    );
    return;
  }
  if (missing.length > 0) {
    console.warn(
      `[admob] DİKKAT: ${missing.join(', ')} tanımlı değil — bu reklam birimleri Google TEST kimlikleriyle çalışıyor ve GELİR ÜRETMEZ. Yayına çıkmadan önce .env değerlerini doldur (bkz. docs/platforms.md).`,
    );
  }
}

/** Env değerlerini bir kez okur; build başına sabittir. */
export function resolveAdMobConfig(): AdMobConfig {
  const forced = testAdsForced();
  const banner = forced ? null : readEnv(process.env.NEXT_PUBLIC_ADMOB_BANNER_ID);
  const interstitial = forced ? null : readEnv(process.env.NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID);
  const rewarded = forced ? null : readEnv(process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID);

  const missing: string[] = [];
  if (!banner) missing.push('NEXT_PUBLIC_ADMOB_BANNER_ID');
  if (!interstitial) missing.push('NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID');
  if (!rewarded) missing.push('NEXT_PUBLIC_ADMOB_REWARDED_ID');
  warnOnce(missing, forced);

  const testDeviceIds = (readEnv(process.env.NEXT_PUBLIC_ADMOB_TEST_DEVICE_IDS) ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  return {
    bannerId: banner ?? ADMOB_TEST_IDS.banner,
    interstitialId: interstitial ?? ADMOB_TEST_IDS.interstitial,
    rewardedId: rewarded ?? ADMOB_TEST_IDS.rewarded,
    // Tek bir birim bile test kimliğiyse SDK'ya "test modundayım" demek en güvenlisi.
    usingTestIds: missing.length > 0 || forced,
    testDeviceIds,
  };
}

export const ADMOB_CONFIG: AdMobConfig = resolveAdMobConfig();
