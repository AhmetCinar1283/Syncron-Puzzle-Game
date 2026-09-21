/**
 * DOSYA AMACI: Oyun içi dokunsal geri bildirim (haptik) sarmalayıcısı.
 *
 * NEDEN: Mobilde "anında tepki" hissinin büyük kısmı dokunsaldır. Swipe eşiği
 * aşıldığı ANDA — daha simülasyon başlamadan — kısa bir titreşim vermek,
 * gerçek gecikmeyi değiştirmeden algılanan gecikmeyi belirgin şekilde düşürür.
 *
 * Native'de Capacitor Haptics kullanılır (Android'in kendi haptik sabitleri —
 * keskin bir "tık", ham titreşim değil). Web'de `navigator.vibrate` yedeği
 * devreye girer. İkisi de yoksa sessizce hiçbir şey yapılmaz.
 *
 * Tüm fonksiyonlar fire-and-forget: asla `await` edilmeleri gerekmez, asla
 * hata fırlatmazlar. Girdi yolunda çağrıldıkları için bir kare bile
 * bloklamamalıdırlar.
 */

import { settingsService } from '@/services/settings';

export type HapticStrength = 'light' | 'medium' | 'heavy';

/** Web yedeğinde kullanılan titreşim süreleri (ms). */
const VIBRATE_MS: Record<HapticStrength, number> = {
  light: 10,
  medium: 20,
  heavy: 35,
};

/**
 * Aynı anda birden fazla haptik tetiklenirse (ör. bir turda hem hamle hem
 * çarpışma) cihaz sıraya alır ve gecikme birikir. Bu pencere içindeki ikinci
 * çağrı yutulur.
 */
const THROTTLE_MS = 40;

let lastFiredAt = 0;

/** Capacitor Haptics eklentisi — ilk kullanımda dinamik olarak yüklenir. */
type HapticsPlugin = {
  impact: (opts: { style: string }) => Promise<void>;
  notification: (opts: { type: string }) => Promise<void>;
};
type HapticsModule = {
  Haptics: HapticsPlugin;
  ImpactStyle: Record<string, string>;
  NotificationType: Record<string, string>;
};

let hapticsModule: HapticsModule | null = null;
let hapticsLoadStarted = false;
let isNative: boolean | null = null;

function checkNative(): boolean {
  if (isNative !== null) return isNative;
  if (typeof window === 'undefined') {
    isNative = false;
    return false;
  }
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  isNative = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  return isNative;
}

function loadHaptics(): void {
  if (hapticsLoadStarted) return;
  hapticsLoadStarted = true;
  import('@capacitor/haptics')
    .then((mod) => {
      hapticsModule = mod as unknown as HapticsModule;
    })
    .catch(() => { /* eklenti yoksa web yedeği kullanılır */ });
}

/** Kullanıcı haptiği kapatmadıysa true (varsayılan: açık). */
export function hapticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return settingsService.getSettings().controls.haptics;
}

export function setHapticsEnabled(next: boolean): void {
  settingsService.updateSettings({ controls: { haptics: next } });
}

function webVibrate(ms: number): void {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  if (typeof nav.vibrate !== 'function') return;
  try { nav.vibrate(ms); } catch { /* bazı tarayıcılar kullanıcı jesti olmadan reddeder */ }
}

/**
 * Kısa bir darbe. `light` hamle/swipe için, `medium` çarpma/engel için,
 * `heavy` ölüm için.
 */
export function hapticImpact(strength: HapticStrength = 'light'): void {
  if (!hapticsEnabled()) return;

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastFiredAt < THROTTLE_MS) return;
  lastFiredAt = now;

  if (checkNative()) {
    loadHaptics();
    const mod = hapticsModule;
    if (mod) {
      const style = mod.ImpactStyle[strength.charAt(0).toUpperCase() + strength.slice(1)]
        ?? mod.ImpactStyle.Light;
      mod.Haptics.impact({ style }).catch(() => {});
      return;
    }
    // Modül henüz yüklenmediyse bu seferlik web yedeğine düş.
  }

  webVibrate(VIBRATE_MS[strength]);
}

/** Tur sonucu bildirimi: kazanma (`success`) / kaybetme (`error`). */
export function hapticNotify(type: 'success' | 'error' | 'warning'): void {
  if (!hapticsEnabled()) return;

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  lastFiredAt = now;

  if (checkNative()) {
    loadHaptics();
    const mod = hapticsModule;
    if (mod) {
      const capType = mod.NotificationType[type.charAt(0).toUpperCase() + type.slice(1)]
        ?? mod.NotificationType.Success;
      mod.Haptics.notification({ type: capType }).catch(() => {});
      return;
    }
  }

  // Web yedeği: kazanmada iki kısa, kaybetmede tek uzun titreşim.
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  if (typeof nav.vibrate !== 'function') return;
  try {
    nav.vibrate(type === 'success' ? [15, 60, 25] : [60]);
  } catch { /* yoksay */ }
}

/**
 * Uygulama açılışında eklentiyi önceden yükler; ilk haptik çağrısının dinamik
 * import'u beklemesini engeller.
 */
export function warmUpHaptics(): void {
  if (checkNative()) loadHaptics();
}
