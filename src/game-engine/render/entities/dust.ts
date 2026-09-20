/**
 * DOSYA AMACI: Buzda kayarken çıkan üç toz parçacığı — `ice-dust-particle`
 * sınıfı ve `iceDustLeft/Right/Up/Down` keyframe'lerinin canvas karşılığı.
 *
 * NEDEN faza örneklenmiş sprite yok: parçacığın GÖRÜNTÜSÜ zamanla değişmiyor,
 * yalnızca konumu, ölçeği ve opaklığı akıyor. Üçü de kare döngüsünde serbest
 * çağrılar (00-ilkeler §2.1) ve `overlays/timing.ts` aynı gerekçeyle aynı yolu
 * seçmişti. Tek bir 6px'lik parlak nokta sprite'ı yeterli.
 */

import type { Direction } from '../../logic/types';
import type { SpritePainter } from '../types';
import { outerGlow } from '../paintTokens';

/** `.ice-trail-*`: `220ms infinite linear`. */
export const ICE_DUST_MS = 220;

/** `.ice-dust-particle`: 6px daire + `0 0 5px` parlama. */
const DOT_SIZE = 6;
const DOT_GLOW = 5;
const DOT_FILL = 'rgba(165,243,252,0.85)';
const DOT_SHADOW = 'rgba(165,243,252,1)';

/** `physicsWrapper`'daki üç parçacığın `animationDelay` ve taban ofsetleri. */
const PARTICLES = [
    { delayMs: 0, left: 0, top: 0 },
    { delayMs: 70, left: 4, top: 4 },
    { delayMs: 140, left: -4, top: 2 },
];

/** `@keyframes iceDust*`: `0% → translate(A) scale(1) opacity .8`, `100% → translate(B) scale(.1) opacity 0`. */
const DUST_PATHS: Record<Direction, { fromX: number; fromY: number; toX: number; toY: number }> = {
    left: { fromX: 16, fromY: 48, toX: 56, toY: 40 },
    right: { fromX: 48, fromY: 48, toX: 8, toY: 40 },
    up: { fromX: 32, fromY: 48, toX: 32, toY: 80 },
    down: { fromX: 32, fromY: 16, toX: 32, toY: -16 },
};

export const iceDustSprite: SpritePainter<Record<string, never>> = {
    key: () => 'icedust',
    size: () => ({ w: DOT_SIZE + DOT_GLOW * 2, h: DOT_SIZE + DOT_GLOW * 2 }),
    draw(ctx) {
        const c = DOT_GLOW + DOT_SIZE / 2;
        ctx.fillStyle = DOT_FILL;
        const dot = () => {
            ctx.beginPath();
            ctx.arc(c, c, DOT_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
        };
        outerGlow(ctx, dot, DOT_SHADOW, DOT_GLOW);
        dot();
    },
};

export interface DustParticle {
    /** Parçacığın MERKEZİ, 64'lük varlık kutusunun koordinatlarında. */
    x: number;
    y: number;
    scale: number;
    alpha: number;
}

/** Üç parçacığın `now` anındaki hâli. */
export function dustParticlesAt(direction: Direction, now: number): DustParticle[] {
    const path = DUST_PATHS[direction];
    const half = DOT_SIZE / 2;

    return PARTICLES.map(({ delayMs, left, top }) => {
        const raw = (now - delayMs) / ICE_DUST_MS;
        const t = ((raw % 1) + 1) % 1;
        return {
            x: left + path.fromX + (path.toX - path.fromX) * t + half,
            y: top + path.fromY + (path.toY - path.fromY) * t + half,
            scale: 1 - 0.9 * t,
            alpha: 0.8 - 0.8 * t,
        };
    });
}
