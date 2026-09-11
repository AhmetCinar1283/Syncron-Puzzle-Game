/**
 * DOSYA AMACI: Reklam adaptör katmanının tek giriş noktası. Sağlayıcıyı tembel
 * yükler/başlatır, her sağlayıcı çağrısını zaman aşımı + try/catch ile sarar
 * (asla throw etmez — bkz. 00-mimari-ilkeler.md §4), sıklık politikasını uygular
 * ve oynanış başladı/durdu bildirimlerini tekilleştirir.
 */
import type { AdEvent, AdEventListener, AdProvider, InterstitialResult, RewardedResult } from './types';
import { CURRENT_PLATFORM } from './platform';
import { getCapabilities } from './capabilities';
import { loadProviderFor } from './providerRegistry';
import { withTimeout } from './withTimeout';
import { isAdFree } from './entitlement';
import { AD_TIMEOUTS_MS, DEFAULT_FREQUENCY_POLICY } from './policy/policyConfig';
import {
  INITIAL_FREQUENCY_POLICY_STATE,
  evaluateInterstitial,
  onAdShown,
  onLevelCompleted,
  type FrequencyPolicyState,
} from './policy/frequencyPolicy';
import { noopProvider } from './providers/noopProvider';

export interface InterstitialRequestContext {
  /** Bu geçiş bir hata/başarısız doğrulama sonrasında mı gerçekleşiyor. */
  afterError?: boolean;
  /** Bu geçiş bir "yeniden başlatma" sonrasında mı gerçekleşiyor. */
  afterRestart?: boolean;
}

class AdService {
  private providerPromise: Promise<AdProvider> | null = null;
  private gameplayActive = false;
  private policyState: FrequencyPolicyState = INITIAL_FREQUENCY_POLICY_STATE;
  private listeners = new Set<AdEventListener>();

  /** İlk çağrıda sağlayıcıyı yükler ve başlatır; sonraki çağrılar aynı promise'i paylaşır. */
  private getProvider(): Promise<AdProvider> {
    if (!this.providerPromise) {
      this.providerPromise = loadProviderFor(CURRENT_PLATFORM)
        .then(async (provider) => {
          await withTimeout(provider.init(), AD_TIMEOUTS_MS.init, 'init');
          return provider;
        })
        .catch((err) => {
          console.warn('[monetization] Sağlayıcı başlatılamadı, noop\'a düşülüyor:', err);
          return noopProvider;
        });
    }
    return this.providerPromise;
  }

  private emit(event: AdEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.warn('[monetization] Olay dinleyicisi hata fırlattı:', err);
      }
    }
  }

  /** Reklam gösterimi öncesi/sonrası bildirim alır (ör. ses kısma). Aboneliği kaldıran fonksiyonu döner. */
  onAdEvent(listener: AdEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async loadingFinished(): Promise<void> {
    const provider = await this.getProvider();
    provider.loadingFinished();
  }

  async gameplayStart(): Promise<void> {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    const provider = await this.getProvider();
    provider.gameplayStart();
  }

  async gameplayStop(): Promise<void> {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    const provider = await this.getProvider();
    provider.gameplayStop();
  }

  async happyTime(): Promise<void> {
    const provider = await this.getProvider();
    provider.happyTime();
  }

  /** Bir level tamamlandığında sıklık politikasının sayaçlarını ilerletir. */
  recordLevelCompleted(): void {
    this.policyState = onLevelCompleted(this.policyState);
  }

  /**
   * "İlk 5 level" kuralı oyuncunun TÜM ZAMANLARDAKİ tamamlama sayısına bakar,
   * yalnızca bu oturumdakine değil. `usePlayAds`, Redux/Dexie'den okuduğu kalıcı
   * sayıyı burada senkronlar. Asla geriye almaz — bu oturumda `recordLevelCompleted`
   * ile ilerleyen sayaç, kalıcı kaynak henüz yüklenmeden düşürülmez.
   */
  syncCompletedTotal(persistedTotal: number): void {
    if (persistedTotal > this.policyState.totalCompleted) {
      this.policyState = { ...this.policyState, totalCompleted: persistedTotal };
    }
  }

  /**
   * Politikaya göre uygunsa bölüm arası reklamı gösterir. Sağlayıcı desteklemiyorsa,
   * politika reddediyorsa ya da her şey başarısız olsa bile PROMISE HER ZAMAN ÇÖZÜLÜR
   * — çağıran taraf (play akışı) asla bloklanmaz.
   */
  async requestInterstitial(ctx: InterstitialRequestContext = {}): Promise<InterstitialResult> {
    const capabilities = getCapabilities(CURRENT_PLATFORM);
    if (!capabilities.interstitialAds) {
      return { shown: false, reason: 'unsupported' };
    }

    const decision = evaluateInterstitial(
      this.policyState,
      { adFree: isAdFree(), afterError: ctx.afterError, afterRestart: ctx.afterRestart },
      Date.now(),
      DEFAULT_FREQUENCY_POLICY,
    );
    if (!decision.show) {
      return { shown: false };
    }

    try {
      const provider = await this.getProvider();
      this.emit('before-ad');
      const result = await withTimeout(
        provider.showInterstitial(),
        AD_TIMEOUTS_MS.interstitial,
        'showInterstitial',
      );
      if (result.shown) {
        this.policyState = onAdShown(this.policyState, Date.now());
      }
      return result;
    } catch (err) {
      console.warn('[monetization] Bölüm arası reklam başarısız/zaman aşımı:', err);
      return { shown: false, reason: 'error' };
    } finally {
      this.emit('after-ad');
    }
  }

  /**
   * Ödüllü reklamı gösterir. Sağlayıcı desteklemiyorsa ya da hata/zaman aşımı
   * olursa `rewarded:false` ile (asla throw etmeden) döner.
   */
  async showRewarded(): Promise<RewardedResult> {
    const capabilities = getCapabilities(CURRENT_PLATFORM);
    if (!capabilities.rewardedAds) {
      return { rewarded: false, reason: 'unsupported' };
    }

    try {
      const provider = await this.getProvider();
      this.emit('before-ad');
      const result = await withTimeout(provider.showRewarded(), AD_TIMEOUTS_MS.rewarded, 'showRewarded');
      if (result.rewarded) {
        this.policyState = onAdShown(this.policyState, Date.now());
      }
      return result;
    } catch (err) {
      console.warn('[monetization] Ödüllü reklam başarısız/zaman aşımı:', err);
      return { rewarded: false, reason: 'error' };
    } finally {
      this.emit('after-ad');
    }
  }

  /** Sadece dev/debug panelinde politika durumunu göstermek için. */
  getPolicyStateSnapshot(): Readonly<FrequencyPolicyState> {
    return this.policyState;
  }
}

/** Uygulama genelinde tek örnek (singleton) — `MonetizationContext` bunu sarar. */
export const adService = new AdService();
