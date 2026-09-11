/**
 * DOSYA AMACI: Geliştirme sırasında (`NEXT_PUBLIC_PLATFORM=mock`) reklam akışını
 * tarayıcıda uçtan uca göstermek için sahte sağlayıcı. Davranışı `scenario.ts`
 * üzerinden seçilen senaryoya (başarı/no-fill/hata/zaman aşımı/erken kapatma) göre
 * değişir; hiçbir gerçek SDK'ya bağlanmaz.
 */
import type { AdProvider, AdUnavailableReason, InterstitialResult, RewardedResult } from '../../types';
import { getMockScenario } from './scenario';
import { showMockAd } from './mockAdOverlay';

const AD_DURATION_MS = 3000;
/** 'timeout' senaryosunda kasıtlı olarak hiç dönmeyen bir promise — adService'in
 * withTimeout sarmalayıcısının devreye girip devreye almadığını test etmek için. */
function foreverPending<T>(): Promise<T> {
  return new Promise(() => {});
}

type AdRunResult = { completed: true } | { completed: false; reason: AdUnavailableReason };

async function runAd(kind: 'interstitial' | 'rewarded'): Promise<AdRunResult> {
  const scenario = getMockScenario();

  if (scenario === 'no-fill') {
    return { completed: false, reason: 'no-fill' };
  }
  if (scenario === 'error') {
    throw new Error('[mockProvider] Sahte reklam sağlayıcı hatası (test senaryosu).');
  }
  if (scenario === 'timeout') {
    return foreverPending();
  }
  if (scenario === 'user-closed') {
    return { completed: false, reason: 'closed' };
  }

  const outcome = await showMockAd({ kind, durationMs: AD_DURATION_MS });
  return outcome === 'completed' ? { completed: true } : { completed: false, reason: 'closed' };
}

export const mockProvider: AdProvider = {
  async init() {
    // Sahte sağlayıcının başlatılacak bir SDK'sı yok.
  },
  loadingFinished() {
    console.info('[mockProvider] loadingFinished');
  },
  gameplayStart() {
    console.info('[mockProvider] gameplayStart');
  },
  gameplayStop() {
    console.info('[mockProvider] gameplayStop');
  },
  async showInterstitial(): Promise<InterstitialResult> {
    const result = await runAd('interstitial');
    return result.completed ? { shown: true } : { shown: false, reason: result.reason };
  },
  async showRewarded(): Promise<RewardedResult> {
    const result = await runAd('rewarded');
    return result.completed ? { rewarded: true } : { rewarded: false, reason: result.reason };
  },
  happyTime() {
    console.info('[mockProvider] happyTime');
  },
};
