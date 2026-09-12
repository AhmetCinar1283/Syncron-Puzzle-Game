/**
 * DOSYA AMACI: GameDistribution SDK'yı `AdProvider` arayüzüne uyarlar.
 * `game`/`happyTime` kavramlarının GD karşılığı yok — o çağrılar boş kalır.
 * Ödül SADECE `SDK_REWARDED_WATCH_COMPLETE` olayı gelirse verilir (`showAd`
 * promise'i başarıyla çözülse bile — GD dokümantasyonu bunu ayrı bir olay
 * olarak modelliyor, bkz. 02-portal-buildleri.md §6).
 */
import type { AdProvider, InterstitialResult, RewardedResult } from '../../types';
import { loadGdSdk, onGdEvent } from './loadGdSdk';

export const gameDistributionProvider: AdProvider = {
  async init() {
    await loadGdSdk();
  },
  loadingStart() {
    // GD'de karşılığı yok.
  },
  loadingFinished() {
    // Bir sonraki ödüllü reklamı erkenden hazırla — showRewarded() çağrıldığında bekleme olmasın.
    loadGdSdk().then((sdk) => sdk.preloadAd('rewarded')).catch(() => {});
  },
  gameplayStart() {
    // GD'de karşılığı yok.
  },
  gameplayStop() {
    // GD'de karşılığı yok.
  },
  async showInterstitial(): Promise<InterstitialResult> {
    try {
      const sdk = await loadGdSdk();
      await sdk.showAd();
      return { shown: true };
    } catch {
      return { shown: false, reason: 'error' };
    }
  },
  async showRewarded(): Promise<RewardedResult> {
    try {
      const sdk = await loadGdSdk();
      let rewarded = false;
      const unsubscribe = onGdEvent((event) => {
        if (event.name === 'SDK_REWARDED_WATCH_COMPLETE') rewarded = true;
      });
      try {
        await sdk.showAd('rewarded');
      } finally {
        unsubscribe();
      }
      // Sıradaki ödüllü reklamı hemen önceden yükle.
      sdk.preloadAd('rewarded').catch(() => {});
      return rewarded ? { rewarded: true } : { rewarded: false, reason: 'closed' };
    } catch {
      return { rewarded: false, reason: 'error' };
    }
  },
  happyTime() {
    // GD'de karşılığı yok.
  },
};
