/**
 * DOSYA AMACI: Tüm ödüllü aksiyonların erişim yapılandırmasının TEK yeri.
 * Yeni bir ödüllü aksiyon (ör. 05'teki level atlama) buraya bir satır ekler;
 * reklam/kota/reklamsız akışı `rewardedActionService` ortak olarak yürütür.
 */
import type { RewardedActionConfig } from './types';

export const REWARDED_ACTIONS = {
  /**
   * Ödüllü ipucu (04): reklamsız kullanıcı reklamsız alır; ödüllü reklam olan
   * platformda reklam izlenir; olmayan platformda (web/Electron) level başına 1
   * ücretsiz. İpucu yıldızı sunucuda sınırladığı için kota kötüye kullanımı
   * skor kazandırmaz (bkz. .plans/monetization/raporlar/04-rapor.md).
   */
  hint: {
    adFreeUser: { kind: 'free' },
    rewardedAdsAvailable: { kind: 'ad' },
    rewardedAdsUnavailable: { kind: 'free-limited', perScope: 1 },
  },
} satisfies Record<string, RewardedActionConfig>;

export type RewardedActionId = keyof typeof REWARDED_ACTIONS;
