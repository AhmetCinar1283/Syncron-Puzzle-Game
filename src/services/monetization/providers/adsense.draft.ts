/**
 * DOSYA AMACI: Eski `AdSenseLoader` bileşeninin taşındığı, ileride Google H5 Games
 * Ads (`adBreak`) sağlayıcısına dönüştürülecek TASLAK. `providerRegistry.ts`
 * içinde HİÇBİR platforma bağlı değildir — hesap onaylanana kadar hiçbir build'de
 * yüklenmez (bkz. .plans/monetization/README.md "Kapsam Dışı").
 *
 * AdSense hesabı onaylanınca yapılacaklar:
 * 1. `capabilities.ts`'te ilgili platforma `interstitialAds/rewardedAds: true` ver.
 * 2. `providerRegistry.ts`'e bu dosyayı dinamik import ile bağla.
 * 3. `<script src=ADSENSE_SRC>` etiketini (aşağıdaki client id ile) uygun bir
 *    yükleyiciye (Next `<Script>`) koy ve `window.adsbygoogle.push({..., adBreak: 'on'})`
 *    ile `adBreak` API'sini bu dosyadan çağır.
 */
import type { AdProvider, InterstitialResult, RewardedResult } from '../types';

/** Eski `AdSenseLoader.tsx`'ten taşınan script URL'si ve client id. */
export const ADSENSE_SCRIPT_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3798429741438186';
export const ADSENSE_CLIENT_ID = 'ca-pub-3798429741438186';

declare global {
  interface Window {
    adsbygoogle?: { loaded?: boolean } & unknown[];
  }
}

/**
 * `adBreak`'in gerçek H5 Games Ads davranışı: SDK, `beforeReward`/`adDismissed`
 * gibi callback'lerle sonucu bildirir. Bu taslak henüz o entegrasyonu yapmaz —
 * kayıtlı olmadığı için hiçbir zaman çağrılmaz.
 */
export const adsenseDraftProvider: AdProvider = {
  async init() {
    throw new Error('[adsense.draft] Henüz bağlanmadı — hesap onayı bekleniyor.');
  },
  loadingFinished() {},
  gameplayStart() {},
  gameplayStop() {},
  async showInterstitial(): Promise<InterstitialResult> {
    return { shown: false, reason: 'unsupported' };
  },
  async showRewarded(): Promise<RewardedResult> {
    return { rewarded: false, reason: 'unsupported' };
  },
  happyTime() {},
};
