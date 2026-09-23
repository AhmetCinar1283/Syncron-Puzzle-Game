/**
 * DOSYA AMACI: "Sunucu render'ı bitti, artık tarayıcıdayız" sorusunu tek yerden
 * yanıtlar. Sunucuda ve hidrasyon render'ında `false`, hidrasyondan sonraki ilk
 * istemci render'ında `true` döner.
 *
 * NEDEN EFEKT DEĞİL? Aynı bilgi `useEffect(() => setMounted(true), [])` ile de
 * üretilebilirdi; bu, efekt içinde state set etmek demek (React derleyicisinin
 * `react-hooks/set-state-in-effect` kuralının yakaladığı desen) ve fazladan bir
 * render turu anlamına gelir. `useSyncExternalStore`, React'in bu iş için önerdiği
 * API'dir: sunucu anlık görüntüsü `false`, istemci anlık görüntüsü `true`.
 * Projede aynı yaklaşım `features/settings/hooks/useTouchCapable.ts` içinde de var.
 *
 * Değer hiç değişmediği için abone olacak bir şey yoktur; `subscribe` boş bir
 * temizleyici döndürür.
 */

'use client';

import { useSyncExternalStore } from 'react';

const NOOP_UNSUBSCRIBE = () => {};
const subscribe = () => NOOP_UNSUBSCRIBE;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
