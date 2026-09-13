/**
 * DOSYA AMACI: AdMob bölüm arası reklamının yükleme + gösterme akışını
 * `InterstitialResult`'a çevirir. Yalnızca YÜKLEME kısa bir zaman aşımına tabidir
 * (no-fill'de oyuncu beklemez); reklam ekrana geldikten sonra süre sınırı yoktur.
 */
import { AdMob, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import type { InterstitialResult } from '../../types';
import { ADMOB_CONFIG } from './admobConfig';
import { getConsentOutcome } from './admobConsent';
import { ADMOB_LOAD_TIMEOUT_MS } from './admobTimeouts';
import { listen, raceAdEvents } from './admobEvents';

async function prepare(): Promise<'loaded' | 'no-fill' | 'timeout'> {
  const race = raceAdEvents(
    (finish) => [
      listen(InterstitialAdPluginEvents.Loaded, () => finish('loaded')),
      listen(InterstitialAdPluginEvents.FailedToLoad, () => finish('no-fill')),
    ],
    ADMOB_LOAD_TIMEOUT_MS,
  );

  AdMob.prepareInterstitial({
    adId: ADMOB_CONFIG.interstitialId,
    isTesting: ADMOB_CONFIG.usingTestIds,
    npa: getConsentOutcome().nonPersonalized,
    immersiveMode: true,
  }).catch(() => race.finish('no-fill'));

  const outcome = await race.settled;
  if (outcome === 'loaded') return 'loaded';
  if (outcome === 'timeout') return 'timeout';
  return 'no-fill';
}

export async function showAdMobInterstitial(): Promise<InterstitialResult> {
  const prepared = await prepare();
  if (prepared !== 'loaded') {
    return { shown: false, reason: prepared === 'timeout' ? 'timeout' : 'no-fill' };
  }

  // Kullanıcı kapatana (Dismissed) kadar bekle. Asılma koruması adService'in dış
  // zaman aşımındadır (bkz. policy/policyConfig.ts).
  const race = raceAdEvents(
    (finish) => [
      listen(InterstitialAdPluginEvents.Dismissed, () => finish('dismissed')),
      listen(InterstitialAdPluginEvents.FailedToShow, () => finish('failed')),
    ],
    null,
  );

  AdMob.showInterstitial().catch((err) => {
    console.warn('[admob] Bölüm arası reklam gösterilemedi:', err);
    race.finish('failed');
  });

  const outcome = await race.settled;
  return outcome === 'dismissed' ? { shown: true } : { shown: false, reason: 'error' };
}
