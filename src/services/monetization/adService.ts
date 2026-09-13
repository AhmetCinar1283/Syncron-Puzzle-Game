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
  onLevelFinished,
  type FrequencyPolicyState,
} from './policy/frequencyPolicy';
import { noopProvider } from './providers/noopProvider';

export interface InterstitialRequestContext {
  /**
   * Oyuncu hesap oluşturmuş mu (anonim değil mi). Misafir oyuncuya daha sık
   * reklam gösterilir — eşikler `policy/policyConfig.ts`'te. Belirtilmezse
   * misafir varsayılır (daha sık reklam tarafı, güvenli varsayılan).
   */
  isRegisteredUser?: boolean;
}

class AdService {
  private providerPromise: Promise<AdProvider> | null = null;
  private gameplayActive = false;
  private policyState: FrequencyPolicyState = INITIAL_FREQUENCY_POLICY_STATE;
  private listeners = new Set<AdEventListener>();
  private fullscreenAdOpen = false;
  private bannerRequested = false;

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

  /**
   * Sağlayıcıyı erkenden yükler/başlatır. Android'de rıza (UMP) akışının ilk
   * açılışta çalışması buna bağlıdır; diğer platformlarda zararsızdır.
   */
  prewarm(): void {
    this.getProvider().catch(() => {});
  }

  /**
   * Tam ekran bir reklam şu an açık mı. Fiziksel geri tuşu gibi global
   * kısayolların reklam açıkken beklenmeyen bir şey yapmaması için kullanılır
   * (bkz. components/common/BackButtonManager.tsx).
   */
  isFullscreenAdOpen(): boolean {
    return this.fullscreenAdOpen;
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

  async loadingStart(): Promise<void> {
    const provider = await this.getProvider();
    provider.loadingStart();
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

  /**
   * Bir level bittiğinde sıklık politikasının sayacını ilerletir.
   * BAŞARI ve BAŞARISIZLIK (kazanma / restart-ölüm) ayrımı YOKTUR — ikisi de
   * bir "bitiş"tir. `requestInterstitial`'dan ÖNCE çağrılmalıdır ki karar bu
   * bitişi de hesaba katsın.
   */
  recordLevelFinished(): void {
    this.policyState = onLevelFinished(this.policyState);
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
      { adFree: isAdFree(), isRegisteredUser: ctx.isRegisteredUser ?? false },
      Date.now(),
      DEFAULT_FREQUENCY_POLICY,
    );
    if (!decision.show) {
      return { shown: false };
    }

    try {
      const provider = await this.getProvider();
      this.fullscreenAdOpen = true;
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
      this.fullscreenAdOpen = false;
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
      this.fullscreenAdOpen = true;
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
      this.fullscreenAdOpen = false;
      this.emit('after-ad');
    }
  }

  /**
   * Kalıcı alt banner'ı gösterir. Platform desteklemiyorsa ya da oyuncu
   * reklamsız hak kazandıysa hiçbir şey yapmaz; asla throw etmez.
   */
  async showBanner(): Promise<void> {
    if (!getCapabilities(CURRENT_PLATFORM).bannerAds || isAdFree()) return;
    this.bannerRequested = true;
    try {
      const provider = await this.getProvider();
      await withTimeout(provider.showBanner?.() ?? Promise.resolve(), AD_TIMEOUTS_MS.banner, 'showBanner');
    } catch (err) {
      console.warn('[monetization] Banner gösterilemedi:', err);
    }
  }

  /** Banner'ı gizler (sayfa kapanışı, reklamsız hak). Asla throw etmez. */
  async hideBanner(): Promise<void> {
    if (!this.bannerRequested) return;
    this.bannerRequested = false;
    try {
      const provider = await this.getProvider();
      await withTimeout(provider.hideBanner?.() ?? Promise.resolve(), AD_TIMEOUTS_MS.banner, 'hideBanner');
    } catch (err) {
      console.warn('[monetization] Banner gizlenemedi:', err);
    }
  }

  /**
   * Banner yüksekliği (CSS px) değiştiğinde haber verir; 0 = banner yok.
   * Aboneliği kaldıran fonksiyonu döner.
   */
  onBannerHeight(listener: (heightPx: number) => void): () => void {
    let active = true;
    this.getProvider()
      .then((provider) => {
        if (!active) return;
        provider.onBannerHeight?.((heightPx) => {
          if (active) listener(heightPx);
        });
      })
      .catch(() => {});
    return () => {
      active = false;
      this.getProvider().then((provider) => provider.onBannerHeight?.(null)).catch(() => {});
    };
  }

  /**
   * Kullanıcıya "reklam tercihleri" girişi sunulmalı mı. Sağlayıcı başlatılmamışsa
   * ya da desteklemiyorsa `false` döner (buton hiç gösterilmez).
   */
  async isAdPrivacyOptionsRequired(): Promise<boolean> {
    if (!getCapabilities(CURRENT_PLATFORM).interstitialAds) return false;
    try {
      const provider = await this.getProvider();
      return provider.privacyOptionsRequired?.() ?? false;
    } catch {
      return false;
    }
  }

  /** Rıza tercihleri formunu açar. Açılamazsa `false` döner; asla throw etmez. */
  async openAdPrivacyOptions(): Promise<boolean> {
    try {
      const provider = await this.getProvider();
      return (await provider.openPrivacyOptions?.()) ?? false;
    } catch (err) {
      console.warn('[monetization] Reklam tercihleri formu açılamadı:', err);
      return false;
    }
  }

  /** Sadece dev/debug panelinde politika durumunu göstermek için. */
  getPolicyStateSnapshot(): Readonly<FrequencyPolicyState> {
    return this.policyState;
  }
}

/** Uygulama genelinde tek örnek (singleton) — `MonetizationContext` bunu sarar. */
export const adService = new AdService();
