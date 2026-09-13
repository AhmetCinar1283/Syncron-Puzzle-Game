/**
 * DOSYA AMACI: Bir ödüllü aksiyonun şu an hangi yoldan (reklam / ücretsiz /
 * engelli) sunulacağına karar veren saf fonksiyon. Yan etkisizdir, birim testlidir.
 */
import type { RewardedAccessMode, RewardedActionConfig, RewardedAvailability } from './types';

export interface AccessContext {
  adFree: boolean;
  rewardedAdsSupported: boolean;
  /** Bu aksiyon+kapsam için şimdiye kadar harcanan ücretsiz hak. */
  freeUsed: number;
}

function selectMode(config: RewardedActionConfig, ctx: AccessContext): { mode: RewardedAccessMode; adFree: boolean } {
  if (ctx.adFree) return { mode: config.adFreeUser, adFree: true };
  if (ctx.rewardedAdsSupported) return { mode: config.rewardedAdsAvailable, adFree: false };
  return { mode: config.rewardedAdsUnavailable, adFree: false };
}

export function resolveAvailability(config: RewardedActionConfig, ctx: AccessContext): RewardedAvailability {
  const { mode, adFree } = selectMode(config, ctx);
  const via = adFree ? 'ad-free' : 'free';

  switch (mode.kind) {
    case 'disabled':
      return { kind: 'blocked', reason: 'disabled' };
    case 'ad':
      // Reklamsız kullanıcıya asla reklam gösterilmez.
      return adFree ? { kind: 'free', via, remaining: null } : { kind: 'ad' };
    case 'free':
      return { kind: 'free', via, remaining: null };
    case 'free-limited': {
      const remaining = Math.max(0, mode.perScope - ctx.freeUsed);
      return remaining > 0
        ? { kind: 'free', via, remaining }
        : { kind: 'blocked', reason: 'quota-exhausted' };
    }
  }
}
