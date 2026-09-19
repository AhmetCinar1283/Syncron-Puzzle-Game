/**
 * DOSYA AMACI: Ana menünün dekoratif animasyon bütçesini cihaza göre belirler.
 *
 * NEDEN: Oyun Capacitor ile WebView'e paketleniyor; giriş seviyesi Android
 * cihazlarda arka plan partikülleri + sürekli dönen süsler kare düşmesine yol
 * açıyor. Tek bir "kademe" değeri üretip CSS'e `data-motion` olarak veriyoruz;
 * `lite` kademesinde `.home-ambient` animasyonları susar ve partikül tuvali
 * yerini statik bir gradient katmanına bırakır (bkz. src/app/home.css).
 *
 * İŞLEVSEL animasyonlar (kayma, zafer patlaması) bu kademeden etkilenmez —
 * navigasyon `animationend` olayına bağlıdır, kapatılsa menü kilitlenir.
 */

import { useEffect, useState } from 'react';

export type MotionTier = 'full' | 'lite';

/** `lite` kademesine düşüren eşikler. Daha düşüğü = daha zayıf cihaz. */
const MIN_CORES = 4;
const MIN_MEMORY_GB = 4;

interface DeviceNavigator extends Navigator {
  deviceMemory?: number;
}

/**
 * Cihazın hareket kademesini döndürür. SSR'da (window yokken) `full` döner;
 * gerçek ölçüm mount sonrası `useMotionTier` ile yapılır, böylece sunucu ve
 * istemci ilk render'ı ayrışmaz.
 */
export function detectMotionTier(): MotionTier {
  if (typeof window === 'undefined') return 'full';

  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return 'lite';
    }
  } catch {
    // matchMedia desteklenmiyorsa donanım ölçütlerine düş.
  }

  const nav = navigator as DeviceNavigator;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;

  if (cores <= MIN_CORES || memory <= MIN_MEMORY_GB) return 'lite';

  return 'full';
}

/**
 * Hareket kademesini mount sonrası ölçer. SSR ile istemci ilk render'ının
 * ayrışmaması için ilk değer daima `full`'dür.
 */
export function useMotionTier(): MotionTier {
  const [tier, setTier] = useState<MotionTier>('full');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTier(detectMotionTier());
  }, []);

  return tier;
}
