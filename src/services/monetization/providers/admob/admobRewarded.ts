/**
 * DOSYA AMACI: AdMob ödüllü reklamının yükleme + gösterme akışını
 * `RewardedResult`'a çevirir. Ödül YALNIZCA `Rewarded` olayı geldiyse verilir;
 * kullanıcı videoyu yarıda kapatırsa ödül verilmez (`reason: 'closed'`).
 */
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { RewardedResult } from '../../types';
import { ADMOB_CONFIG } from './admobConfig';
import { getConsentOutcome } from './admobConsent';
import { ADMOB_LOAD_TIMEOUT_MS } from './admobTimeouts';
import { listen, raceAdEvents } from './admobEvents';

/** Bir ödüllü reklam hazır bekliyor mu (preload sonucu). */
let preloaded = false;

/** Ödüllü reklamı önceden yükler; çağıran sonucu beklemek zorunda değildir. */
export async function preloadAdMobRewarded(): Promise<boolean> {
  const race = raceAdEvents(
    (finish) => [
      listen(RewardAdPluginEvents.Loaded, () => finish('loaded')),
      listen(RewardAdPluginEvents.FailedToLoad, () => finish('no-fill')),
    ],
    ADMOB_LOAD_TIMEOUT_MS,
  );

  AdMob.prepareRewardVideoAd({
    adId: ADMOB_CONFIG.rewardedId,
    isTesting: ADMOB_CONFIG.usingTestIds,
    npa: getConsentOutcome().nonPersonalized,
    immersiveMode: true,
  }).catch(() => race.finish('no-fill'));

  preloaded = (await race.settled) === 'loaded';
  return preloaded;
}

export async function showAdMobRewarded(): Promise<RewardedResult> {
  const ready = preloaded || (await preloadAdMobRewarded());
  preloaded = false;
  if (!ready) {
    return { rewarded: false, reason: 'no-fill' };
  }

  // `Rewarded` olayı ödülü işaretler; yarışı `Dismissed`/`FailedToShow` bitirir.
  let rewarded = false;
  const race = raceAdEvents(
    (finish) => [
      listen(RewardAdPluginEvents.Rewarded, () => {
        rewarded = true;
      }),
      listen(RewardAdPluginEvents.Dismissed, () => finish('dismissed')),
      listen(RewardAdPluginEvents.FailedToShow, () => finish('failed')),
    ],
    // Süre sınırı yok — video + son kart süresi kullanıcıya aittir.
    null,
  );

  AdMob.showRewardVideoAd().catch((err) => {
    console.warn('[admob] Ödüllü reklam gösterilemedi:', err);
    race.finish('failed');
  });

  const outcome = await race.settled;
  // Sıradakini arka planda hazırla (sonucu beklenmez).
  preloadAdMobRewarded().catch(() => {});

  if (outcome === 'failed') return { rewarded: false, reason: 'error' };
  return rewarded ? { rewarded: true } : { rewarded: false, reason: 'closed' };
}
