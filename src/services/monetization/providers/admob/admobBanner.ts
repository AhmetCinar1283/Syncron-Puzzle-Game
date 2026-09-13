/**
 * DOSYA AMACI: AdMob alt banner'ını yönetir (göster / gizle / boyut bildirimi).
 * Banner native bir katman olarak WebView'in ÜSTÜNE çizilir — WebView'i
 * küçültmez. Bu yüzden gerçek yüksekliği `onBannerSize` ile dışarı bildirilir;
 * sayfa düzeni o kadar boşluk açar (bkz. components/common/AdBannerMount.tsx).
 */
import {
  AdMob,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { ADMOB_CONFIG } from './admobConfig';
import { getConsentOutcome } from './admobConsent';

/**
 * Banner ile oyun içeriği arasında bırakılan güvenlik boşluğu (dp).
 * Oyuncu grid'in alt kenarına dokunurken yanlışlıkla reklama basmasın diye
 * banner'ın raporlanan yüksekliğine eklenir (AdMob geçersiz tıklama politikası).
 */
export const BANNER_SAFE_GAP_PX = 8;

type BannerSizeListener = (heightPx: number) => void;

let sizeListener: BannerSizeListener | null = null;
let handles: PluginListenerHandle[] = [];
let visible = false;
let lastHeight = 0;

/** Banner yüksekliği değiştiğinde haber verir (0 = banner yok). */
export function onBannerSize(listener: BannerSizeListener | null): void {
  sizeListener = listener;
  if (listener) listener(visible ? lastHeight : 0);
}

function report(heightPx: number): void {
  lastHeight = heightPx;
  sizeListener?.(heightPx);
}

async function attachListeners(): Promise<void> {
  if (handles.length > 0) return;
  handles = await Promise.all([
    AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
      report(size.height > 0 ? size.height + BANNER_SAFE_GAP_PX : 0);
    }),
    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
      // Doldurulamayan banner ekranda yer kaplamamalı.
      report(0);
    }),
  ]);
}

export async function showAdMobBanner(): Promise<void> {
  await attachListeners();
  if (visible) {
    await AdMob.resumeBanner();
    return;
  }
  await AdMob.showBanner({
    adId: ADMOB_CONFIG.bannerId,
    isTesting: ADMOB_CONFIG.usingTestIds,
    npa: getConsentOutcome().nonPersonalized,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
  });
  visible = true;
}

export async function hideAdMobBanner(): Promise<void> {
  if (!visible) return;
  visible = false;
  report(0);
  await AdMob.hideBanner();
}

/** Uygulama arka plandan dönünce banner'ı yeniden görünür kılar. */
export async function resumeAdMobBanner(): Promise<void> {
  if (!visible) return;
  await AdMob.resumeBanner();
  report(lastHeight);
}

/** Banner şu an ekranda mı (yaşam döngüsü kararları için). */
export function isBannerVisible(): boolean {
  return visible;
}
