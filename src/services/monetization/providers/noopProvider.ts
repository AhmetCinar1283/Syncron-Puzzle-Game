/**
 * DOSYA AMACI: Hiçbir SDK'ya bağlanmayan, her çağrısı anında ve zararsız çözülen
 * sağlayıcı. Web ve Electron build'lerinin (reklamsız) varsayılan davranışıdır.
 */
import type { AdProvider, InterstitialResult, RewardedResult } from '../types';

export const noopProvider: AdProvider = {
  async init() {
    // Yapılacak bir şey yok.
  },
  loadingFinished() {
    // Yapılacak bir şey yok.
  },
  gameplayStart() {
    // Yapılacak bir şey yok.
  },
  gameplayStop() {
    // Yapılacak bir şey yok.
  },
  async showInterstitial(): Promise<InterstitialResult> {
    return { shown: false, reason: 'unsupported' };
  },
  async showRewarded(): Promise<RewardedResult> {
    return { rewarded: false, reason: 'unsupported' };
  },
  happyTime() {
    // Yapılacak bir şey yok.
  },
};
