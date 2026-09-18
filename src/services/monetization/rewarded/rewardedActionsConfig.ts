/**
 * DOSYA AMACI: Tüm ödüllü aksiyonların erişim yapılandırmasının TEK yeri.
 * Yeni bir ödüllü aksiyon (ör. 05'teki level atlama) buraya bir satır ekler;
 * reklam/kota/reklamsız akışı `rewardedActionService` ortak olarak yürütür.
 */
import type { RewardedActionConfig } from './types';

export const REWARDED_ACTIONS: Record<'hint' | 'skip-level', RewardedActionConfig> = {
  /**
   * Ödüllü ipucu (04) — ŞİMDİLİK KAPALI. Sunucu ipucu motoru Workers Free'nin
   * 10 ms CPU sınırına sığmadığı için `/play`'de ipucu sunulmaz: `disabled`
   * olduğunda buton, H kısayolu ve kart çizilmez. Worker da aksiyonu reddeder
   * (`syncron-worker/src/services/hint/hintAction.ts` → `rule.enabled`).
   * Açılırsa önceki yapılandırma: adFreeUser 'free', rewardedAdsAvailable 'ad',
   * rewardedAdsUnavailable 'free-limited' perScope 1.
   */
  hint: {
    adFreeUser: { kind: 'disabled' },
    rewardedAdsAvailable: { kind: 'disabled' },
    rewardedAdsUnavailable: { kind: 'disabled' },
  },
  /**
   * Ödüllü level atlama (05): yalnızca ödüllü reklam olan platformlarda (Android,
   * portallar) reklamla sunulur; web/Electron'da kapalı (ürün sahibi kararı).
   * Reklamsız kullanıcı reklamsız atlar — sunucu bu yolu reklamsız hak ile doğrular
   * (07'ye kadar herkes için hak yok → ret). Ücretsiz yol yok (sunucuda `freePerLevel: 0`).
   * Atlama kuralları (bölüm sonu, açık atlama sınırı) sunucudadır:
   * `syncron-worker/src/services/skipLevel/skipLevelPolicy.ts`.
   */
  'skip-level': {
    adFreeUser: { kind: 'free' },
    rewardedAdsAvailable: { kind: 'ad' },
    rewardedAdsUnavailable: { kind: 'disabled' },
  },
};

export type RewardedActionId = keyof typeof REWARDED_ACTIONS;
