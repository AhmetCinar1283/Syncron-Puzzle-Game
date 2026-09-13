import { describe, expect, it } from 'vitest';
import { resolveAvailability } from './accessPolicy';
import { REWARDED_ACTIONS } from './rewardedActionsConfig';
import type { RewardedActionConfig } from './types';

const hint = REWARDED_ACTIONS.hint;

describe('resolveAvailability', () => {
  it('reklamsız kullanıcı ipucunu reklamsız ve sınırsız alır', () => {
    expect(resolveAvailability(hint, { adFree: true, rewardedAdsSupported: true, freeUsed: 5 }))
      .toEqual({ kind: 'free', via: 'ad-free', remaining: null });
  });

  it('ödüllü reklam destekleyen platformda reklam ister', () => {
    expect(resolveAvailability(hint, { adFree: false, rewardedAdsSupported: true, freeUsed: 0 }))
      .toEqual({ kind: 'ad' });
  });

  it('reklamsız platformda level başına 1 ücretsiz verir, sonra engeller', () => {
    expect(resolveAvailability(hint, { adFree: false, rewardedAdsSupported: false, freeUsed: 0 }))
      .toEqual({ kind: 'free', via: 'free', remaining: 1 });
    expect(resolveAvailability(hint, { adFree: false, rewardedAdsSupported: false, freeUsed: 1 }))
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
});
