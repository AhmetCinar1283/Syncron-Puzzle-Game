/**
 * DOSYA AMACI: `frequencyPolicy.ts`'in birim testleri — "level bitişi" (başarı
 * ya da başarısızlık fark etmez) sayacının VE zaman eşiğinin VEYA mantığıyla
 * çalıştığını, misafir/kayıtlı eşiklerinin ayrı olduğunu ve reklamsız kullanıcı
 * bypass'ını doğrular.
 */
import { describe, expect, it } from 'vitest';
import {
  INITIAL_FREQUENCY_POLICY_STATE,
  evaluateInterstitial,
  onAdShown,
  onLevelFinished,
  type FrequencyPolicyState,
} from './frequencyPolicy';
import { DEFAULT_FREQUENCY_POLICY } from './policyConfig';

const NOW = 1_000_000;
const GUEST = { adFree: false, isRegisteredUser: false } as const;
const REGISTERED = { adFree: false, isRegisteredUser: true } as const;

function finishLevels(state: FrequencyPolicyState, n: number): FrequencyPolicyState {
  let next = state;
  for (let i = 0; i < n; i++) next = onLevelFinished(next);
  return next;
}

describe('evaluateInterstitial', () => {
  it('misafir: 3. level bitişinde (hiç reklam gösterilmemişken) reklam gösterilebilir olur', () => {
    const notYet = finishLevels(INITIAL_FREQUENCY_POLICY_STATE, 2);
    expect(evaluateInterstitial(notYet, GUEST, NOW)).toEqual({ show: false, reason: 'below-thresholds' });

    const ready = finishLevels(INITIAL_FREQUENCY_POLICY_STATE, 3);
    expect(evaluateInterstitial(ready, GUEST, NOW)).toEqual({ show: true });
  });

  it('kayıtlı: eşik misafirin iki katı (6 bitiş)', () => {
    const state5 = finishLevels(INITIAL_FREQUENCY_POLICY_STATE, 5);
    expect(evaluateInterstitial(state5, REGISTERED, NOW)).toEqual({ show: false, reason: 'below-thresholds' });

    const state6 = finishLevels(INITIAL_FREQUENCY_POLICY_STATE, 6);
    expect(evaluateInterstitial(state6, REGISTERED, NOW)).toEqual({ show: true });
  });

  it('başarı ve başarısızlık aynı sayaca işler — kazanma/kaybetme ayrımı yok', () => {
    // 3 "bitiş" — hangisinin kazanma hangisinin restart olduğu evaluateInterstitial'ı ilgilendirmez.
    const state = finishLevels(INITIAL_FREQUENCY_POLICY_STATE, 3);
    expect(evaluateInterstitial(state, GUEST, NOW)).toEqual({ show: true });
  });

  it('bitiş eşiği dolmasa bile yeterli süre geçtiyse reklam gösterilir (VEYA mantığı)', () => {
    let state = finishLevels(INITIAL_FREQUENCY_POLICY_STATE, 3);
    state = onAdShown(state, NOW);
    state = finishLevels(state, 1); // guest eşiği 3'ün altında

    const tooSoon = evaluateInterstitial(state, GUEST, NOW + 59_000);
    expect(tooSoon).toEqual({ show: false, reason: 'below-thresholds' });

    const enoughTime = evaluateInterstitial(state, GUEST, NOW + 60_000);
    expect(enoughTime).toEqual({ show: true });
  });

  it('süre dolmasa bile bitiş eşiği dolduysa reklam gösterilir ve sayaç sıfırlanır', () => {
    let state = finishLevels(INITIAL_FREQUENCY_POLICY_STATE, 3);
    state = onAdShown(state, NOW);
    state = finishLevels(state, 3); // guest eşiği: 3 bitiş, süre henüz dolmadı

    const decision = evaluateInterstitial(state, GUEST, NOW + 1000);
    expect(decision).toEqual({ show: true });
  });

  it('hiç reklam gösterilmemişken süre koşulu tek başına yeterli değildir (yalnızca bitiş sayısı sayılır)', () => {
    // lastAdAtMs hâlâ null: ne kadar zaman geçtiği bilinmiyor, sadece bitiş sayısına bakılır.
    const state = finishLevels(INITIAL_FREQUENCY_POLICY_STATE, 2);
    const decision = evaluateInterstitial(state, GUEST, NOW + 10_000_000);
    expect(decision).toEqual({ show: false, reason: 'below-thresholds' });
  });

  it('reklamsız kullanıcıya hiçbir koşulda reklam göstermez', () => {
    const state = finishLevels(INITIAL_FREQUENCY_POLICY_STATE, 100);
    const decision = evaluateInterstitial(state, { adFree: true, isRegisteredUser: false }, NOW);
    expect(decision).toEqual({ show: false, reason: 'ad-free' });
  });

  it('onLevelFinished ve onAdShown state değiştirmez (immutable) ve doğru alanları günceller', () => {
    const before = INITIAL_FREQUENCY_POLICY_STATE;
    const afterFinish = onLevelFinished(before);
    expect(before).toEqual(INITIAL_FREQUENCY_POLICY_STATE);
    expect(afterFinish).not.toBe(before);
    expect(afterFinish.finishesSinceLastAd).toBe(1);

    const afterAd = onAdShown(afterFinish, NOW);
    expect(afterFinish.lastAdAtMs).toBeNull();
    expect(afterAd.lastAdAtMs).toBe(NOW);
    expect(afterAd.finishesSinceLastAd).toBe(0);
  });

  it('config değerleri (misafir 3/60sn, kayıtlı 6/120sn) varsayılan olarak istenen değerlerdir', () => {
    expect(DEFAULT_FREQUENCY_POLICY.guest).toEqual({ minFinishes: 3, minSecondsBetweenAds: 60 });
    expect(DEFAULT_FREQUENCY_POLICY.registered).toEqual({ minFinishes: 6, minSecondsBetweenAds: 120 });
  });
});
