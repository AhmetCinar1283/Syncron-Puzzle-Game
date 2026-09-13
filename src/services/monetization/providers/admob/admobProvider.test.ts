/**
 * DOSYA AMACI: `admobProvider`'ın birim testleri. En kritik iki davranışı
 * doğrular: (1) ödül SADECE `Rewarded` olayı geldiyse verilir — kullanıcı
 * videoyu yarıda kapatırsa verilmez, (2) yüklenemeyen (no-fill) reklam oyuncuyu
 * bekletmeden `no-fill` ile döner. Ayrıca kimliklerin env yokken Google'ın test
 * kimliklerine düştüğünü kontrol eder.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (payload?: unknown) => void;

/** Eklentinin olay veri yolunu taklit eder. */
const listeners = new Map<string, Set<Listener>>();

function emit(eventName: string, payload?: unknown): void {
  for (const fn of listeners.get(eventName) ?? []) fn(payload);
}

const adMobMock = {
  initialize: vi.fn(async () => {}),
  requestConsentInfo: vi.fn(async () => ({
    status: 'NOT_REQUIRED',
    canRequestAds: true,
    isConsentFormAvailable: false,
    privacyOptionsRequirementStatus: 'NOT_REQUIRED',
  })),
  showConsentForm: vi.fn(async () => ({
    status: 'OBTAINED',
    canRequestAds: true,
    privacyOptionsRequirementStatus: 'REQUIRED',
  })),
  showPrivacyOptionsForm: vi.fn(async () => {}),
  prepareInterstitial: vi.fn(async () => ({ adUnitId: 'x' })),
  showInterstitial: vi.fn(async () => {}),
  prepareRewardVideoAd: vi.fn(async () => ({ adUnitId: 'x' })),
  showRewardVideoAd: vi.fn(async () => ({ type: 'coins', amount: 1 })),
  showBanner: vi.fn(async () => {}),
  hideBanner: vi.fn(async () => {}),
  resumeBanner: vi.fn(async () => {}),
  addListener: vi.fn(async (eventName: string, fn: Listener) => {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName)!.add(fn);
    return { remove: async () => { listeners.get(eventName)?.delete(fn); } };
  }),
};

vi.mock('@capacitor-community/admob', () => ({
  AdMob: adMobMock,
  MaxAdContentRating: { General: 'General' },
  AdmobConsentStatus: { NOT_REQUIRED: 'NOT_REQUIRED', OBTAINED: 'OBTAINED', REQUIRED: 'REQUIRED', UNKNOWN: 'UNKNOWN' },
  AdmobConsentDebugGeography: { DISABLED: 0, EEA: 1 },
  InterstitialAdPluginEvents: {
    Loaded: 'interstitialAdLoaded',
    FailedToLoad: 'interstitialAdFailedToLoad',
    Dismissed: 'interstitialAdDismissed',
    FailedToShow: 'interstitialAdFailedToShow',
  },
  RewardAdPluginEvents: {
    Loaded: 'rewardedVideoAdLoaded',
    FailedToLoad: 'rewardedVideoAdFailedToLoad',
    Rewarded: 'rewardedVideoAdReward',
    Dismissed: 'rewardedVideoAdDismissed',
    FailedToShow: 'rewardedVideoAdFailedToShow',
  },
  BannerAdPluginEvents: { SizeChanged: 'bannerAdSizeChanged', FailedToLoad: 'bannerAdFailedToLoad' },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
  BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
}));

vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn(async () => ({ remove: async () => {} })) },
}));

/** Modülleri sıfırdan yükler (sağlayıcı içi `preloaded` durumu paylaşılmasın). */
async function loadProvider() {
  vi.resetModules();
  listeners.clear();
  const mod = await import('./admobProvider');
  return mod.admobProvider;
}

describe('admobProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('env tanımlı değilken Google test kimliklerini kullanır', async () => {
    vi.resetModules();
    const { ADMOB_CONFIG, ADMOB_TEST_IDS } = await import('./admobConfig');
    expect(ADMOB_CONFIG.interstitialId).toBe(ADMOB_TEST_IDS.interstitial);
    expect(ADMOB_CONFIG.rewardedId).toBe(ADMOB_TEST_IDS.rewarded);
    expect(ADMOB_CONFIG.bannerId).toBe(ADMOB_TEST_IDS.banner);
    expect(ADMOB_CONFIG.usingTestIds).toBe(true);
  });

  it('showRewarded: Rewarded olayı gelmezse ödül verilmez', async () => {
    const provider = await loadProvider();
    adMobMock.showRewardVideoAd.mockImplementation(async () => {
      emit('rewardedVideoAdDismissed');
      return { type: 'coins', amount: 1 };
    });
    queueMicrotask(() => emit('rewardedVideoAdLoaded'));
    const result = await provider.showRewarded();
    expect(result).toEqual({ rewarded: false, reason: 'closed' });
  });

  it('showRewarded: Rewarded olayı gelirse ödül verilir', async () => {
    const provider = await loadProvider();
    adMobMock.showRewardVideoAd.mockImplementation(async () => {
      emit('rewardedVideoAdReward', { type: 'coins', amount: 1 });
      emit('rewardedVideoAdDismissed');
      return { type: 'coins', amount: 1 };
    });
    queueMicrotask(() => emit('rewardedVideoAdLoaded'));
    const result = await provider.showRewarded();
    expect(result).toEqual({ rewarded: true });
  });

  it('showRewarded: reklam yüklenemezse no-fill döner ve gösterim denenmez', async () => {
    const provider = await loadProvider();
    queueMicrotask(() => emit('rewardedVideoAdFailedToLoad'));
    const result = await provider.showRewarded();
    expect(result).toEqual({ rewarded: false, reason: 'no-fill' });
    expect(adMobMock.showRewardVideoAd).not.toHaveBeenCalled();
  });

  it('showInterstitial: yüklenip kapatılırsa shown:true döner', async () => {
    const provider = await loadProvider();
    adMobMock.showInterstitial.mockImplementation(async () => {
      emit('interstitialAdDismissed');
    });
    queueMicrotask(() => emit('interstitialAdLoaded'));
    const result = await provider.showInterstitial();
    expect(result).toEqual({ shown: true });
  });

  it('showInterstitial: yüklenemezse no-fill döner', async () => {
    const provider = await loadProvider();
    queueMicrotask(() => emit('interstitialAdFailedToLoad'));
    const result = await provider.showInterstitial();
    expect(result).toEqual({ shown: false, reason: 'no-fill' });
    expect(adMobMock.showInterstitial).not.toHaveBeenCalled();
  });

  it('banner: yükseklik değişimi dinleyiciye güvenlik boşluğuyla bildirilir', async () => {
    const provider = await loadProvider();
    const seen: number[] = [];
    provider.onBannerHeight?.((h) => seen.push(h));
    await provider.showBanner?.();
    emit('bannerAdSizeChanged', { width: 360, height: 50 });
    const { BANNER_SAFE_GAP_PX } = await import('./admobBanner');
    expect(seen.at(-1)).toBe(50 + BANNER_SAFE_GAP_PX);

    emit('bannerAdFailedToLoad');
    expect(seen.at(-1)).toBe(0);
  });

  it('init: rıza akışı AdMob.initialize çağrısından önce çalışır', async () => {
    const provider = await loadProvider();
    const order: string[] = [];
    adMobMock.requestConsentInfo.mockImplementation(async () => {
      order.push('consent');
      return {
        status: 'NOT_REQUIRED',
        canRequestAds: true,
        isConsentFormAvailable: false,
        privacyOptionsRequirementStatus: 'NOT_REQUIRED',
      };
    });
    adMobMock.initialize.mockImplementation(async () => { order.push('initialize'); });
    await provider.init();
    expect(order).toEqual(['consent', 'initialize']);
  });
});
