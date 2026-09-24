/**
 * DOSYA AMACI: "Ödüllü aksiyon" altyapısının aksiyondan bağımsız tiplerini
 * tanımlar. İpucu, level atlama ve ileride eklenecek her ödüllü aksiyon aynı
 * tipleri kullanır; ödülün NE olduğu bu katmanı ilgilendirmez.
 */
import type { AdUnavailableReason } from '../types';

/** Bir aksiyona erişim yolu. */
export type RewardedAccessMode =
  /** Ödüllü reklam izlenmesi gerekir. */
  | { kind: 'ad' }
  /** Sınırsız ücretsiz. */
  | { kind: 'free' }
  /** Kapsam (ör. level) başına `perScope` kez ücretsiz. */
  | { kind: 'free-limited'; perScope: number }
  /** Aksiyon sunulmaz. */
  | { kind: 'disabled' };

/** Bir ödüllü aksiyonun platform/hak durumuna göre erişim yapılandırması. */
export interface RewardedActionConfig {
  /** Reklamsız hakkı olan kullanıcı. */
  adFreeUser: RewardedAccessMode;
  /** Platform ödüllü reklamı destekliyor. */
  rewardedAdsAvailable: RewardedAccessMode;
  /** Platform ödüllü reklamı desteklemiyor (web, Electron). */
  rewardedAdsUnavailable: RewardedAccessMode;
}

/**
 * Ödülün hangi yoldan kazanıldığı — sunucuya da bildirilir. `ads-disabled`:
 * reklam istendi ama portal reklamları kasıtlı kapattı (CrazyGames Basic Launch).
 */
export type RewardGrantVia = 'ad' | 'ad-free' | 'free' | 'ads-disabled';

/** UI'ın butonu nasıl göstereceğine karar verdiği, ödül istenmeden önceki durum. */
export type RewardedAvailability =
  | { kind: 'ad' }
  | { kind: 'free'; via: 'ad-free' | 'free'; remaining: number | null }
  | { kind: 'blocked'; reason: 'disabled' | 'quota-exhausted' };

/** Ödül verilmediğinde nedeni (UI nazik mesaj seçer). */
export type RewardedDeclineReason =
  | 'disabled'
  | 'quota-exhausted'
  | 'busy'
  /** Sunucu ödülü bu durum için hazırlayamadı (ör. ipucu hesaplanamadı). */
  | 'unavailable'
  /** Sunucu tavanı: çok sık istek. */
  | 'rate-limited'
  /** Aksiyonun kendi sınırı doldu (ör. açık level atlama sayısı). */
  | 'limit-reached'
  /** Aksiyon bu hedef için kurala takıldı (ör. bölüm sonu level'ı atlanamaz). */
  | 'not-allowed'
  /** Sunucuya ulaşılamadı ya da ödül teslim edilemedi. */
  | 'claim-failed'
  | AdUnavailableReason;

/**
 * Sunucuya ödülü hazırlatma adımının sonucu. Hazırlama, ödülün içeriğini
 * DÖNDÜRMEZ; yalnızca teslim alınabilecek bir kayıt (`requestId`) oluşturur.
 */
export type RewardPrepareResult<T> =
  | {
      ok: true;
      requestId: string;
      /** Aynı durum için ödül daha önce teslim edilmiş: reklam gerekmeden içerik. */
      alreadyDelivered?: T;
      /** Sunucunun bildirdiği kalan ücretsiz hak (yerel sayaç bununla eşitlenir). */
      freeRemaining?: number;
    }
  | { ok: false; reason: RewardedDeclineReason };

/**
 * Ödül hak edildikten sonra sunucudan içeriği teslim alma adımı. `reason`
 * verilmezse hata geçici sayılır ve bir kez daha denenir.
 */
export type RewardClaimResult<T> = { ok: true; payload: T } | { ok: false; reason?: RewardedDeclineReason };

export type RewardedActionOutcome<T> =
  | { status: 'granted'; via: RewardGrantVia | 'reused'; payload: T }
  | { status: 'declined'; reason: RewardedDeclineReason };
