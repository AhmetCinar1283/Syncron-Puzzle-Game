/**
 * DOSYA AMACI: Uygulamanın Capacitor native kabuğu (Android) içinde çalışıp
 * çalışmadığını söyler. SSR'da `false` döner; böylece sunucu ve istemci ilk
 * render'ı ayrışmaz.
 *
 * NEDEN EFEKT DEĞİL? `useEffect` içinde `setIsCapacitor(true)` demek, efekt
 * içinde state set etmek (bkz. `react-hooks/set-state-in-effect`) ve fazladan bir
 * render turu demekti. `useSyncExternalStore` React'in bu iş için önerdiği API'dir
 * ve `features/settings/hooks/useTouchCapable.ts` ile aynı düzeni izler.
 *
 * Değer çalışma sırasında değişmez (kabuk build zamanında bellidir), bu yüzden
 * `subscribe` hiçbir şeye abone olmaz.
 */

'use client';

import { useSyncExternalStore } from 'react';

type CapacitorGlobal = { Capacitor?: { isNativePlatform?: () => boolean } };

function isNativePlatform(): boolean {
  const cap = (window as unknown as CapacitorGlobal).Capacitor;
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
}

const NOOP_UNSUBSCRIBE = () => {};
const subscribe = () => NOOP_UNSUBSCRIBE;

export function useNativePlatform(): boolean {
  return useSyncExternalStore(subscribe, isNativePlatform, () => false);
}
