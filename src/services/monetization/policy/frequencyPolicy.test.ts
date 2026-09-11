/**
 * DOSYA AMACI: `frequencyPolicy.ts`'in birim testleri — 01 görev tanımındaki dört
 * kuralı (ilk 5 level, 3 levelde bir, 90 sn, hata/restart sonrası yok) doğrular.
 */
import { describe, expect, it } from 'vitest';
import {
  INITIAL_FREQUENCY_POLICY_STATE,
  evaluateInterstitial,
  onAdShown,
  onLevelCompleted,
  type FrequencyPolicyState,
} from './frequencyPolicy';
import { DEFAULT_FREQUENCY_POLICY } from './policyConfig';

const NOW = 1_000_000;

function completeLevels(state: FrequencyPolicyState, n: number): FrequencyPolicyState {
  let next = state;
  for (let i = 0; i < n; i++) next = onLevelCompleted(next);
  return next;
}

describe('evaluateInterstitial', () => {
  it('ilk 5 levelde reklam göstermez', () => {
    const state = completeLevels(INITIAL_FREQUENCY_POLICY_STATE, 4);
    const decision = evaluateInterstitial(state, { adFree: false }, NOW);
    expect(decision).toEqual({ show: false, reason: 'below-min-completed-levels' });
  });

  it('5. leveli tamamlayınca reklam gösterilebilir olur', () => {
    const state = completeLevels(INITIAL_FREQUENCY_POLICY_STATE, 5);
    const decision = evaluateInterstitial(state, { adFree: false }, NOW);
    expect(decision).toEqual({ show: true });
  });

  it('reklam gösterildikten sonra 3 level dolana kadar tekrar göstermez', () => {
    let state = completeLevels(INITIAL_FREQUENCY_POLICY_STATE, 5);
    state = onAdShown(state, NOW);

    state = completeLevels(state, 2);
    let decision = evaluateInterstitial(state, { adFree: false }, NOW + 100_000);
    expect(decision).toEqual({ show: false, reason: 'levels-since-last-ad' });

    state = completeLevels(state, 1); // toplam 3 level tamamlandı
    decision = evaluateInterstitial(state, { adFree: false }, NOW + 100_000);
    expect(decision).toEqual({ show: true });
  });

  it('90 saniyeden kısa aralıkta reklam göstermez', () => {
    let state = completeLevels(INITIAL_FREQUENCY_POLICY_STATE, 8);
    state = onAdShown(state, NOW);
    state = completeLevels(state, DEFAULT_FREQUENCY_POLICY.levelsBetweenAds);

    const tooSoon = evaluateInterstitial(state, { adFree: false }, NOW + 89_000);
    expect(tooSoon).toEqual({ show: false, reason: 'min-seconds-between-ads' });

    const okNow = evaluateInterstitial(state, { adFree: false }, NOW + 90_000);
    expect(okNow).toEqual({ show: true });
  });

  it('hata sonrasında reklam göstermez', () => {
    const state = completeLevels(INITIAL_FREQUENCY_POLICY_STATE, 10);
    const decision = evaluateInterstitial(state, { adFree: false, afterError: true }, NOW);
    expect(decision).toEqual({ show: false, reason: 'after-error' });
  });

  it('yeniden başlatma sonrasında reklam göstermez', () => {
    const state = completeLevels(INITIAL_FREQUENCY_POLICY_STATE, 10);
    const decision = evaluateInterstitial(state, { adFree: false, afterRestart: true }, NOW);
    expect(decision).toEqual({ show: false, reason: 'after-restart' });
  });

  it('reklamsız kullanıcıya hiçbir koşulda reklam göstermez', () => {
    const state = completeLevels(INITIAL_FREQUENCY_POLICY_STATE, 100);
    const decision = evaluateInterstitial(state, { adFree: true }, NOW);
    expect(decision).toEqual({ show: false, reason: 'ad-free' });
  });

  it('onLevelCompleted ve onAdShown state değiştirmez (immutable)', () => {
    const before = INITIAL_FREQUENCY_POLICY_STATE;
    const afterComplete = onLevelCompleted(before);
    expect(before).toEqual(INITIAL_FREQUENCY_POLICY_STATE);
    expect(afterComplete).not.toBe(before);

    const afterAd = onAdShown(afterComplete, NOW);
    expect(afterComplete.lastAdAtMs).toBeNull();
    expect(afterAd.lastAdAtMs).toBe(NOW);
    expect(afterAd.levelsSinceLastAd).toBe(0);
  });
});
