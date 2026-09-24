/**
 * DOSYA AMACI: CrazyGames HTML5 SDK v3'ü `AdProvider` arayüzüne uyarlar.
 * Callback tabanlı `requestAd` çağrısını Promise'e çevirir; hata kodlarını
 * `AdUnavailableReason`'a eşler (bkz. 00-mimari-ilkeler.md §4 — hiçbir çağrı
 * burada throw etmez, `adService` zaten timeout+try/catch ile sarıyor ama
 * hata kodu ayrımı burada kaybolmasın diye Promise reject/resolve doğru kullanılır).
 */
import type { AdProvider, AdUnavailableReason, InterstitialResult, RewardedResult } from '../../types';
import type { CrazyGamesAdError } from './crazyGamesSdkTypes';
import { loadCrazyGamesSdk } from './loadCrazyGamesSdk';

function mapErrorReason(error: CrazyGamesAdError): AdUnavailableReason {
  switch (error.code) {
    case 'unfilled':
      return 'no-fill';
    case 'adblock':
    case 'other':
      return 'error';
    case 'adCooldown':
      return 'unsupported';
    // Basic Launch'ta CrazyGames reklamları kapatır; Full Launch'ta kendiliğinden açılır.
    case 'adsDisabledBasicLaunch':
      return 'ads-disabled';
    default:
      return 'error';
  }
}

function requestAd(adType: 'midgame' | 'rewarded'): Promise<{ completed: true } | { completed: false; reason: AdUnavailableReason }> {
  return loadCrazyGamesSdk().then(
    (sdk) =>
      new Promise((resolve) => {
        sdk.ad.requestAd(adType, {
          adFinished: () => resolve({ completed: true }),
          adError: (error) => resolve({ completed: false, reason: mapErrorReason(error) }),
        });
      }),
  );
}

export const crazyGamesProvider: AdProvider = {
  async init() {
    await loadCrazyGamesSdk();
  },
  loadingStart() {
    loadCrazyGamesSdk().then((sdk) => sdk.game.loadingStart()).catch(() => {});
  },
  loadingFinished() {
    loadCrazyGamesSdk().then((sdk) => sdk.game.loadingStop()).catch(() => {});
  },
  gameplayStart() {
    loadCrazyGamesSdk().then((sdk) => sdk.game.gameplayStart()).catch(() => {});
  },
  gameplayStop() {
    loadCrazyGamesSdk().then((sdk) => sdk.game.gameplayStop()).catch(() => {});
  },
  async showInterstitial(): Promise<InterstitialResult> {
    const result = await requestAd('midgame');
    return result.completed ? { shown: true } : { shown: false, reason: result.reason };
  },
  async showRewarded(): Promise<RewardedResult> {
    const result = await requestAd('rewarded');
    return result.completed ? { rewarded: true } : { rewarded: false, reason: result.reason };
  },
  happyTime() {
    loadCrazyGamesSdk().then((sdk) => sdk.game.happytime()).catch(() => {});
  },
};
