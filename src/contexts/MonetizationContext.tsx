/**
 * DOSYA AMACI: `services/monetization`'ın React tarafına ince erişim katmanı.
 * `adService` singleton'ını sarar; feature'lar bu context'i `useAds()` /
 * `useCapabilities()` üzerinden kullanır, `services/monetization`'ı doğrudan
 * import etmez.
 */
'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import {
  CURRENT_PLATFORM,
  adService,
  getCapabilities,
  getRewardedAvailability,
  runRewardedAction,
  type AdEventListener,
  type InterstitialRequestContext,
  type InterstitialResult,
  type PlatformCapabilities,
  type RewardedActionId,
  type RewardedActionOutcome,
  type RewardedAvailability,
  type RewardedResult,
  type RunRewardedActionParams,
} from '@/services/monetization';

interface MonetizationContextType {
  capabilities: PlatformCapabilities;
  /** Level içeriği yüklenmeye BAŞLADIĞINDA bir kez çağrılır. */
  loadingStart: () => Promise<void>;
  /** Level içeriği oynanmaya hazır olduğunda bir kez çağrılır. */
  loadingFinished: () => Promise<void>;
  /** Aktif oynanış başladı. */
  gameplayStart: () => Promise<void>;
  /** Aktif oynanış durdu (menü, win overlay, reklam öncesi). */
  gameplayStop: () => Promise<void>;
  /** "Mutlu an" bildirimi (level tamamlandı gibi). */
  happyTime: () => Promise<void>;
  /** Bir level bittiğinde (kazanma VEYA restart/ölüm) sıklık sayacını ilerletir. */
  recordLevelFinished: () => void;
  /** Politikaya göre uygunsa bölüm arası reklamı gösterir; her zaman çözülür. */
  requestInterstitial: (ctx?: InterstitialRequestContext) => Promise<InterstitialResult>;
  /** Ödüllü reklamı gösterir; her zaman çözülür. */
  showRewarded: () => Promise<RewardedResult>;
  /** Bir ödüllü aksiyonun şu an nasıl sunulacağı (reklam / ücretsiz / engelli). */
  getRewardedAvailability: (actionId: RewardedActionId, scopeKey: string) => RewardedAvailability;
  /** Ödüllü aksiyon akışını (reklam → claim → kota) yürütür; her zaman çözülür. */
  runRewardedAction: <T>(params: RunRewardedActionParams<T>) => Promise<RewardedActionOutcome<T>>;
  /** Reklam gösterimi öncesi/sonrası bildirim alır (ör. ses kısma). Aboneliği kaldıran fonksiyonu döner. */
  onAdEvent: (listener: AdEventListener) => () => void;
  /** Kalıcı alt banner'ı gösterir (platform destekliyorsa). */
  showBanner: () => Promise<void>;
  /** Kalıcı alt banner'ı gizler. */
  hideBanner: () => Promise<void>;
  /** Banner yüksekliği (CSS px) değiştiğinde haber verir; 0 = banner yok. */
  onBannerHeight: (listener: (heightPx: number) => void) => () => void;
}

const MonetizationContext = createContext<MonetizationContextType | undefined>(undefined);

export function MonetizationProvider({ children }: { children: React.ReactNode }) {
  // adService bir singleton olduğu için context değeri sabittir; state gerekmez.
  const value = useMemo<MonetizationContextType>(
    () => ({
      capabilities: getCapabilities(CURRENT_PLATFORM),
      loadingStart: () => adService.loadingStart(),
      loadingFinished: () => adService.loadingFinished(),
      gameplayStart: () => adService.gameplayStart(),
      gameplayStop: () => adService.gameplayStop(),
      happyTime: () => adService.happyTime(),
      recordLevelFinished: () => adService.recordLevelFinished(),
      requestInterstitial: (ctx) => adService.requestInterstitial(ctx),
      showRewarded: () => adService.showRewarded(),
      getRewardedAvailability,
      runRewardedAction,
      onAdEvent: (listener) => adService.onAdEvent(listener),
      showBanner: () => adService.showBanner(),
      hideBanner: () => adService.hideBanner(),
      onBannerHeight: (listener) => adService.onBannerHeight(listener),
    }),
    [],
  );

  // Sağlayıcıyı erken başlat: Android'de rıza (UMP) akışının İLK AÇILIŞTA
  // çalışması buna bağlı; diğer platformlarda zararsız bir no-op.
  useEffect(() => {
    adService.prewarm();
  }, []);

  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>;
}

export function useAds(): MonetizationContextType {
  const context = useContext(MonetizationContext);
  if (!context) {
    throw new Error('useAds must be used within a MonetizationProvider');
  }
  return context;
}

export function useCapabilities(): PlatformCapabilities {
  return useAds().capabilities;
}
