/**
 * DOSYA AMACI: Cihazın dokunmatik kontrol ayarları (ekran tuşları, swipe,
 * titreşim) için uygun olup olmadığını söyler: Capacitor native platform ya da
 * birincil işaretleyici parmak (`pointer: coarse`). SSR'da `false` döner, böylece
 * sunucu ve istemci ilk render'ı ayrışmaz.
 */

'use client';

import { useSyncExternalStore } from 'react';

const COARSE_QUERY = '(pointer: coarse)';

function isTouchCapable(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return true;
  try {
    return window.matchMedia?.(COARSE_QUERY).matches ?? false;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia?.(COARSE_QUERY);
  query?.addEventListener?.('change', onChange);
  return () => query?.removeEventListener?.('change', onChange);
}

export function useTouchCapable(): boolean {
  return useSyncExternalStore(subscribe, isTouchCapable, () => false);
}
