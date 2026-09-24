/**
 * DOSYA AMACI: Hiçbir ifade oynamıyorken maskotun kendi kendine yaptıkları —
 * göz kırpma ve ara sıra etrafa bakınma. SAF ve DETERMİNİSTİK: aynı
 * (tema, tohum, an) → aynı yüz. Rastgelelik yok, durum yok; böylece
 * `render/idle.ts`'in imza karşılaştırması ve videodaki kare seçimi çalışır.
 *
 * Göz kırpma zamanlaması eski `@keyframes playerBlink`'ten BİREBİR taşındı
 * (tema başına periyot, %94,2–%97,8 kapalı pencere) — tüm oyuncular aynı anda
 * kırpar, tıpkı eskisi gibi. Bakınma ise oyuncu başına (tohum = varlık id'si)
 * seçilir, böylece iki oyuncu aynı anda aynı yöne bakmaz.
 */

import type { GameTheme } from '../themes/themeConfig';
import type { FacePose } from './pose';
import { BLINK_FACE, NEUTRAL_FACE } from './pose';

/** Tema başına `playerBlink` süresi (eski satır içi `animation`). */
export const BLINK_MS: Record<GameTheme, number> = {
    legacy: 4000,
    arcade: 4000,
    neon: 4200,
    blueprint: 4400,
    cosmic: 4600,
};

/**
 * `@keyframes playerBlink`: `0%,92%,100% → scaleY(1)`, `96% → scaleY(0.1)`.
 * Gözün kapalı sayıldığı pencere (scaleY < 0.5) periyodun ~%3.6'sı.
 */
const BLINK_CLOSED_FROM = 0.942;
const BLINK_CLOSED_TO = 0.978;

/** Bakınma penceresi (periyot oranı) — kırpmadan uzak, ortada. */
const GLANCE_FROM = 0.35;
const GLANCE_TO = 0.6;
/** Bir periyotta bakınma olasılığı. Oyunu dağıtmayacak kadar seyrek. */
const GLANCE_CHANCE = 0.2;

function periodOf(theme: GameTheme): number {
    return BLINK_MS[theme] ?? 4000;
}

/** `playerBlink` periyodunun kapalı penceresinde miyiz. */
export function blinkClosedAt(theme: GameTheme, now: number): boolean {
    const period = periodOf(theme);
    const t = (((now % period) + period) % period) / period;
    return t >= BLINK_CLOSED_FROM && t < BLINK_CLOSED_TO;
}

/** (tohum, periyot no) → [0,1). Kriptografik değil; yalnızca dağınık görünsün. */
export function hash01(a: number, b: number): number {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

/**
 * Boştaki yüz.
 *
 * @param seed Oyuncuya özgü tohum (varlık id'si). Bakınmanın ne zaman ve hangi
 * yöne olacağını belirler; kırpmayı etkilemez.
 */
export function idleFaceAt(theme: GameTheme, seed: number, now: number): FacePose {
    if (blinkClosedAt(theme, now)) return BLINK_FACE;

    const period = periodOf(theme);
    const cycle = Math.floor(now / period);
    const t = (now - cycle * period) / period;
    if (t < GLANCE_FROM || t >= GLANCE_TO) return NEUTRAL_FACE;

    const r = hash01(seed, cycle);
    if (r >= GLANCE_CHANCE) return NEUTRAL_FACE;
    // Olasılık aralığının yarısı sola, yarısı sağa.
    return { ...NEUTRAL_FACE, lookX: r < GLANCE_CHANCE / 2 ? -1 : 1 };
}
