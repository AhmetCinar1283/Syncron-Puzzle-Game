/**
 * DOSYA AMACI: Overlay animasyonlarının zaman fonksiyonları — `boardKeyframes.ts`
 * ve `GameBoard.tsx`'teki CSS animasyonlarının SAF karşılıkları. Hepsi `now`
 * (ms) alır ve çizim durumunu döndürür; tuvale dokunmaz.
 *
 * NEDEN faz örneklemesi yok: bunlar sprite'ı değiştirmiyor, yalnızca blit'in
 * `globalAlpha`/kaynak konumu/dönüşümünü sürüyor (00-ilkeler §2.1'in izin verdiği
 * çağrılar). Bu yüzden 12 sprite yerine sürekli zamandan hesaplanıyor.
 *
 * `now === null` = `ambientMode === 'off'`: DOM'da `animation: none` öğeyi
 * gizlemez, taban stilinde bırakır. Çağıranlar bu durumu kendileri ele alır.
 */

import { easeInOut } from '../cells/ice';

/** `edge-glow-pulse` / `label-breath` süreleri — bkz. `GameBoard.tsx`. */
export const EDGE_TIMING = {
    lava:   { flowMs: 4000, pulseMs: 1500 },
    portal: { flowMs: 3000, pulseMs: 1200 },
} as const;

export const LABEL_BREATH_MS = 2500;
export const PORTAL_SPIN_MS = 6000;
export const PORTAL_CRAWL_MS = 1200;
/** `@keyframes crawlPath { to { stroke-dashoffset: -20 } }`. */
export const CRAWL_DISTANCE = 20;

function cycle(now: number, periodMs: number): number {
    return (((now % periodMs) + periodMs) % periodMs) / periodMs;
}

/**
 * 0 → 1 → 0 ease-in-out eğrisi: `0%/100%` ve `50%` anahtar kareli, `infinite
 * ease-in-out` zamanlamalı CSS animasyonlarının ortak biçimi (`icePulse`,
 * `edge-glow-pulse`, `label-breath`).
 */
export function breathCurve(t: number): number {
    return t < 0.5 ? easeInOut(t / 0.5) : 1 - easeInOut((t - 0.5) / 0.5);
}

/** `edge-glow-pulse`: opaklık 0.85 → 1 → 0.85. */
export function edgePulseOpacity(now: number, periodMs: number): number {
    return 0.85 + 0.15 * breathCurve(cycle(now, periodMs));
}

/**
 * `edge-slide-*`: `0% → 50% → 100%` = `0 → -66.667% → 0`, `linear`. Dönen değer
 * 0..1 üçgen dalgadır; kaynak dikdörtgeninin kayması `2 × uzunluk × değer`.
 */
export function edgeFlowFraction(now: number, periodMs: number): number {
    const p = cycle(now, periodMs);
    return p < 0.5 ? p / 0.5 : (1 - p) / 0.5;
}

/** `label-breath`: ölçek 1 → 1.15 → 1, opaklık 0.82 → 1 → 0.82. */
export function labelBreath(now: number): { scale: number; opacity: number } {
    const u = breathCurve(cycle(now, LABEL_BREATH_MS));
    return { scale: 1 + 0.15 * u, opacity: 0.82 + 0.18 * u };
}

/** `portal-spin`: 6 sn'de bir tam tur (radyan). */
export function portalSpinAngle(now: number): number {
    return cycle(now, PORTAL_SPIN_MS) * Math.PI * 2;
}

/** `crawlPath`: `stroke-dashoffset` 0 → -20, `linear`. */
export function crawlDashOffset(now: number): number {
    return -CRAWL_DISTANCE * cycle(now, PORTAL_CRAWL_MS);
}
