/**
 * DOSYA AMACI: Dekoratif animasyon bütçesini cihaza göre belirler.
 *
 * NEDEN: Oyun Capacitor ile WebView'e paketleniyor; giriş seviyesi Android
 * cihazlarda arka plan partikülleri + sürekli dönen süsler kare düşmesine yol
 * açıyor. Tek bir "kademe" değeri üretip CSS'e `data-motion` olarak veriyoruz;
 * `lite` kademesinde `.home-ambient` animasyonları susar ve partikül tuvali
 * yerini statik bir gradient katmanına bırakır (bkz. src/app/home.css). Oyun
 * tahtasında ise hücrelerin sürekli dönen/parlayan süsleri tamamen kapanır
 * (bkz. src/game-engine/components/board/boardKeyframes.ts).
 *
 * İŞLEVSEL animasyonlar (kayma, zafer patlaması) bu kademeden etkilenmez —
 * navigasyon `animationend` olayına bağlıdır, kapatılsa menü kilitlenir.
 */

import { useEffect, useState } from 'react';
import { userStorageGet, userStorageSet } from '@/lib/userStorage';

/** Otomatik tespiti geçersiz kılan tercih anahtarı. */
export const MOTION_TIER_KEY = 'motionTier';

/** Kademeyi sabitler; `null` otomatik tespite döner. */
export function setMotionTierOverride(tier: MotionTier | null): void {
  userStorageSet(MOTION_TIER_KEY, tier ?? '');
}

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

  // Elle geçersiz kılma. Otomatik tespit yalnızca çekirdek ve RAM'e bakıyor;
  // 8 çekirdekli ama zayıf GPU'lu telefonlar `full` çıkabiliyor. Bu anahtar
  // hem cihazda test etmeyi hem de ileride bir ayar düğmesi eklemeyi sağlar.
  const override = userStorageGet(MOTION_TIER_KEY);
  if (override === 'lite' || override === 'full') return override;

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
