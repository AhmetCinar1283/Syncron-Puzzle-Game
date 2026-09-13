/**
 * DOSYA AMACI: Reklam sıklığı politikasının ve sağlayıcı zaman aşımlarının tüm
 * sayısal değerlerini tek bir yerden okunur/değiştirilebilir hâle getirir.
 */

/** Bir kullanıcı grubu (misafir/kayıtlı) için bölüm arası reklam eşikleri. */
export interface AudienceFrequencyPolicy {
  /**
   * Son reklamdan bu yana kaç "level bitişi" (BAŞARILI ya da BAŞARISIZ — kazanma
   * veya restart, fark etmez) yaşanınca reklam gösterilir.
   */
  minFinishes: number;
  /** Son reklamdan bu yana en az bu kadar saniye geçince reklam gösterilir. */
  minSecondsBetweenAds: number;
}

export interface FrequencyPolicyConfig {
  /** Misafir (anonim/giriş yapmamış) kullanıcı — daha sık reklam. */
  guest: AudienceFrequencyPolicy;
  /** Hesap oluşturmuş (anonim olmayan) kullanıcı — daha seyrek reklam. */
  registered: AudienceFrequencyPolicy;
}

/**
 * Karar kuralı (bkz. `frequencyPolicy.ts`): bu iki eşikten HANGİSİ önce
 * dolarsa reklam o anda gösterilir (VEYA mantığı, VE değil). Kazanma/kaybetme
 * ayrımı YAPILMAZ — "level bitişi" ikisini de kapsar. Hangi eşiğin
 * kullanılacağı, o anki oyuncunun misafir/kayıtlı olma durumuna göre seçilir.
 */
export const DEFAULT_FREQUENCY_POLICY: FrequencyPolicyConfig = {
  guest: { minFinishes: 3, minSecondsBetweenAds: 60 },
  registered: { minFinishes: 6, minSecondsBetweenAds: 120 },
};

/**
 * Sağlayıcı çağrılarının `adService` tarafından sarıldığı zaman aşımları (ms).
 *
 * DİKKAT: Bunlar "SDK asıldı" koruması içindir, reklamın izlenme süresi sınırı
 * DEĞİLDİR. Gerçek bir bölüm arası reklam 30 sn, ödüllü video + son kart 60 sn'yi
 * rahatlıkla bulur; değerler kısa tutulursa kullanıcı reklamı izlese bile ödül
 * verilmez. Sağlayıcılar kendi içinde reklamın YÜKLENMESİNE ayrıca kısa bir sınır
 * koyar (ör. providers/admob/admobTimeouts.ts), no-fill'de oyuncu beklemez.
 */
export const AD_TIMEOUTS_MS = {
  init: 10000,
  interstitial: 120000,
  rewarded: 300000,
  banner: 10000,
} as const;
