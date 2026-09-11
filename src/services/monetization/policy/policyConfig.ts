/**
 * DOSYA AMACI: Reklam sıklığı politikasının ve sağlayıcı zaman aşımlarının tüm
 * sayısal değerlerini tek bir yerden okunur hâle getirir (bkz. 01 görev tanımı).
 */
export interface FrequencyPolicyConfig {
  /** Bu sayıda level tamamlanana kadar hiç bölüm arası reklam gösterilmez. */
  minCompletedLevels: number;
  /** İki bölüm arası reklam arasında en az bu kadar level tamamlanmalıdır. */
  levelsBetweenAds: number;
  /** İki reklam arasında en az bu kadar saniye geçmelidir. */
  minSecondsBetweenAds: number;
}

export const DEFAULT_FREQUENCY_POLICY: FrequencyPolicyConfig = {
  minCompletedLevels: 5,
  levelsBetweenAds: 3,
  minSecondsBetweenAds: 90,
};

/** Sağlayıcı çağrılarının `adService` tarafından sarıldığı zaman aşımları (ms). */
export const AD_TIMEOUTS_MS = {
  init: 5000,
  interstitial: 8000,
  rewarded: 15000,
} as const;
