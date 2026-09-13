'use client';

/**
 * DOSYA AMACI: Kalıcı alt banner'ı uygulama ömrü boyunca açık tutar ve native
 * banner'ın gerçek yüksekliğini `--ad-banner-height` CSS değişkenine yazar.
 * Banner WebView'in ÜSTÜNE çizildiği için sayfa düzeni bu değişken kadar boşluk
 * açar (bkz. app/globals.css `html.has-ad-banner`).
 */

import { useEffect } from 'react';
import { useAds } from '@/contexts/MonetizationContext';

export default function AdBannerMount() {
  const { capabilities, showBanner, hideBanner, onBannerHeight } = useAds();
  const bannerSupported = capabilities.bannerAds;

  useEffect(() => {
    if (!bannerSupported) return;

    const root = document.documentElement;
    const applyHeight = (heightPx: number) => {
      root.style.setProperty('--ad-banner-height', `${heightPx}px`);
      root.classList.toggle('has-ad-banner', heightPx > 0);
    };

    const unsubscribe = onBannerHeight(applyHeight);
    showBanner();

    return () => {
      unsubscribe();
      applyHeight(0);
      hideBanner();
    };
  }, [bannerSupported, showBanner, hideBanner, onBannerHeight]);

  return null;
}
