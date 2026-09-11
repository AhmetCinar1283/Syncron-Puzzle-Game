/**
 * DOSYA AMACI: Reklam adaptör katmanının tüm sağlayıcıların uyduğu ortak tiplerini
 * tanımlar (CrazyGames, GameDistribution, AdMob ve ileride Poki / H5 Games adBreak
 * SDK'larının ortak paydası). Hiçbir sağlayıcıya veya React'e bağımlı değildir.
 */

/** Build-time env değeriyle seçilen platform kimliği. */
export type PlatformId =
  | 'web'
  | 'android'
  | 'electron'
  | 'crazygames'
  | 'gamedistribution'
  | 'mock';

/** Ödüllü reklamın neden verilmediğini ayırt eder; UI nazik mesaj seçer. */
export type AdUnavailableReason = 'unsupported' | 'no-fill' | 'closed' | 'error' | 'timeout';

export interface RewardedResult {
  rewarded: boolean;
  reason?: AdUnavailableReason;
}

export interface InterstitialResult {
  shown: boolean;
  reason?: AdUnavailableReason;
}

/** `adService` reklam gösterimi öncesi/sonrası bu olayları yayınlar (ör. ses kısma). */
export type AdEvent = 'before-ad' | 'after-ad';
export type AdEventListener = (event: AdEvent) => void;

/**
 * Ortak sağlayıcı arayüzü. Her metot kendi içinde hata toleranslı olmak
 * ZORUNDA değildir — o sorumluluk `adService`'te (timeout + try/catch) merkezîleşir.
 * Sağlayıcılar sadece kendi SDK çağrısını bu şekle uydurur.
 */
export interface AdProvider {
  /** SDK'yı yükler/başlatır. Birden çok çağrılırsa idempotent olmalıdır. */
  init(): Promise<void>;
  /** Level içeriği oyuncuya gösterilmeye hazır olduğunda bir kez çağrılır. */
  loadingFinished(): void;
  /** Aktif oynanış başladı (SDK'nın reklam arasına girmemesi için). */
  gameplayStart(): void;
  /** Aktif oynanış durdu (menü, win overlay, reklam öncesi). */
  gameplayStop(): void;
  /** Bölüm arası reklam. Kullanıcı kapatana/no-fill'e/hataya kadar bekler. */
  showInterstitial(): Promise<InterstitialResult>;
  /** Ödüllü reklam. Sonuç, ödülün verilip verilmeyeceğini taşır. */
  showRewarded(): Promise<RewardedResult>;
  /** "Mutlu an" bildirimi (level tamamlandı gibi) — bazı SDK'lar reklam sıklığını buna göre ayarlar. */
  happyTime(): void;
}
