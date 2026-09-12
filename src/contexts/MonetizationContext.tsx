/**
 * DOSYA AMACI: `services/monetization`'ın React tarafına ince erişim katmanı.
 * `adService` singleton'ını sarar; feature'lar bu context'i `useAds()` /
 * `useCapabilities()` üzerinden kullanır, `services/monetization`'ı doğrudan
 * import etmez.
 */
'use client';

import React, { createContext, useContext, useMemo } from 'react';
import {
  CURRENT_PLATFORM,
  adService,
  getCapabilities,
  type AdEventListener,
  type InterstitialRequestContext,
  type InterstitialResult,
  type PlatformCapabilities,
  type RewardedResult,
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
  /** Reklam sıklığı politikasının sayaçlarını ilerletir. */
  recordLevelCompleted: () => void;
  /** Oyuncunun kalıcı toplam tamamlama sayısını "ilk 5 level" kuralı için senkronlar. */
  syncCompletedTotal: (persistedTotal: number) => void;
  /** Politikaya göre uygunsa bölüm arası reklamı gösterir; her zaman çözülür. */
  requestInterstitial: (ctx?: InterstitialRequestContext) => Promise<InterstitialResult>;
  /** Ödüllü reklamı gösterir; her zaman çözülür. */
  showRewarded: () => Promise<RewardedResult>;
  /** Reklam gösterimi öncesi/sonrası bildirim alır (ör. ses kısma). Aboneliği kaldıran fonksiyonu döner. */
  onAdEvent: (listener: AdEventListener) => () => void;
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
      recordLevelCompleted: () => adService.recordLevelCompleted(),
      syncCompletedTotal: (persistedTotal) => adService.syncCompletedTotal(persistedTotal),
      requestInterstitial: (ctx) => adService.requestInterstitial(ctx),
      showRewarded: () => adService.showRewarded(),
      onAdEvent: (listener) => adService.onAdEvent(listener),
    }),
    [],
  );

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
