/**
 * DOSYA AMACI: AdMob'u `AdProvider` arayüzüne uyarlar (Android/Capacitor
 * build'i). `loadingStart`/`gameplayStart` gibi portal kavramlarının AdMob'da
 * karşılığı yoktur; sıklık kararı zaten platformdan bağımsız olarak
 * `policy/frequencyPolicy.ts`'te verilir.
 */
import type { AdProvider, InterstitialResult, RewardedResult } from '../../types';
import { initAdMob } from './admobInit';
import { getConsentOutcome, openPrivacyOptionsForm } from './admobConsent';
import { attachAdMobLifecycle } from './admobLifecycle';
import { showAdMobInterstitial } from './admobInterstitial';
import { preloadAdMobRewarded, showAdMobRewarded } from './admobRewarded';
import { hideAdMobBanner, onBannerSize, showAdMobBanner } from './admobBanner';

export const admobProvider: AdProvider = {
  async init() {
    await initAdMob();
    await attachAdMobLifecycle();
  },
  loadingStart() {
    // AdMob'da karşılığı yok.
  },
  loadingFinished() {
    // Level oynanmaya hazır: ödüllü reklamı erkenden hazırla ki istendiğinde beklenmesin.
    preloadAdMobRewarded().catch(() => {});
  },
  gameplayStart() {
    // AdMob'da karşılığı yok — reklam anını sıklık politikası belirler.
  },
  gameplayStop() {
    // AdMob'da karşılığı yok.
  },
  showInterstitial(): Promise<InterstitialResult> {
    return showAdMobInterstitial();
  },
  showRewarded(): Promise<RewardedResult> {
    return showAdMobRewarded();
  },
  happyTime() {
    // AdMob'da karşılığı yok.
  },
  showBanner(): Promise<void> {
    return showAdMobBanner();
  },
  hideBanner(): Promise<void> {
    return hideAdMobBanner();
  },
  onBannerHeight(listener) {
    onBannerSize(listener);
  },
  privacyOptionsRequired(): boolean {
    return getConsentOutcome().privacyOptionsRequired;
  },
  openPrivacyOptions(): Promise<boolean> {
    return openPrivacyOptionsForm();
  },
};
