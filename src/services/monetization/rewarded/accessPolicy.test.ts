import { describe, expect, it } from 'vitest';
import { resolveAvailability } from './accessPolicy';
import { REWARDED_ACTIONS } from './rewardedActionsConfig';
import type { RewardedActionConfig } from './types';

/** Tipik ödüllü aksiyon: reklamsız → ücretsiz, reklam varsa → reklam, yoksa level başına 1. */
const typical: RewardedActionConfig = {
  adFreeUser: { kind: 'free' },
  rewardedAdsAvailable: { kind: 'ad' },
  rewardedAdsUnavailable: { kind: 'free-limited', perScope: 1 },
};

describe('resolveAvailability', () => {
  it('reklamsız kullanıcı aksiyonu reklamsız ve sınırsız alır', () => {
    expect(resolveAvailability(typical, { adFree: true, rewardedAdsSupported: true, freeUsed: 5 }))
      .toEqual({ kind: 'free', via: 'ad-free', remaining: null });
  });

  it('ödüllü reklam destekleyen platformda reklam ister', () => {
    expect(resolveAvailability(typical, { adFree: false, rewardedAdsSupported: true, freeUsed: 0 }))
      .toEqual({ kind: 'ad' });
  });

  it('reklamsız platformda level başına 1 ücretsiz verir, sonra engeller', () => {
    expect(resolveAvailability(typical, { adFree: false, rewardedAdsSupported: false, freeUsed: 0 }))
      .toEqual({ kind: 'free', via: 'free', remaining: 1 });
    expect(resolveAvailability(typical, { adFree: false, rewardedAdsSupported: false, freeUsed: 1 }))
      .toEqual({ kind: 'blocked', reason: 'quota-exhausted' });
  });

  it('reklam modu reklamsız kullanıcıya yapılandırılsa bile reklam göstermez', () => {
    const config: RewardedActionConfig = {
      adFreeUser: { kind: 'ad' },
      rewardedAdsAvailable: { kind: 'ad' },
      rewardedAdsUnavailable: { kind: 'disabled' },
    };
    expect(resolveAvailability(config, { adFree: true, rewardedAdsSupported: true, freeUsed: 0 }))
      .toEqual({ kind: 'free', via: 'ad-free', remaining: null });
    expect(resolveAvailability(config, { adFree: false, rewardedAdsSupported: false, freeUsed: 0 }))
      .toEqual({ kind: 'blocked', reason: 'disabled' });
  });

  it('level atlama: reklamlı platformda reklam ister, web/Electron\'da kapalı, ücretsiz yolu yok', () => {
    const skip = REWARDED_ACTIONS['skip-level'];
    expect(resolveAvailability(skip, { adFree: false, rewardedAdsSupported: true, freeUsed: 0 }))
      .toEqual({ kind: 'ad' });
    expect(resolveAvailability(skip, { adFree: false, rewardedAdsSupported: false, freeUsed: 0 }))
      .toEqual({ kind: 'blocked', reason: 'disabled' });
  });

  it('ipucu şimdilik her durumda kapalı (/play ipucu sunmaz)', () => {
    for (const adFree of [true, false]) {
      for (const rewardedAdsSupported of [true, false]) {
        expect(resolveAvailability(REWARDED_ACTIONS.hint, { adFree, rewardedAdsSupported, freeUsed: 0 }))
          .toEqual({ kind: 'blocked', reason: 'disabled' });
      }
    }
  });
});
