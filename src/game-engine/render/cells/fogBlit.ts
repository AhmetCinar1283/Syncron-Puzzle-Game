/**
 * DOSYA AMACI: Sisli hücrelerin KARE DÖNGÜSÜ çizimi — keşfedilmemiş kare ve
 * karartılmış/normal sprite arası geçiş. Rasterizasyon `dim.ts`'te; burada
 * yalnızca `drawImage` ve `globalAlpha` var (00-ilkeler §2.1).
 */

import type { SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import type { SpriteCache } from '../spriteCache';
import { dimVariantOf } from './dim';

/** `BoardCell`'in keşfedilmemiş hücresi: `1px solid rgba(30, 58, 138, 0.05)`. */
const HIDDEN_BORDER = 'rgba(30, 58, 138, 0.05)';

/**
 * Keşfedilmemiş hücrenin kenarı. Zemin (`#020617`) çağıran tarafından zaten
 * doldurulmuş; `box-sizing: border-box` olduğu için kenar İÇERİDE, yani
 * çizgi yarım piksel içeri kaydırılır.
 */
export function drawHiddenBorder(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.strokeStyle = HIDDEN_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, NATIVE_CELL_SIZE - 1, NATIVE_CELL_SIZE - 1);
}

/**
 * Sprite'ı hücreye ORTALI blit eder; taşan parlama için büyütülmüş kutuyu
 * telafi eder. `lit` 1'den küçükse karartılmış varyant çizilir; arada (geçiş)
 * karartılmışın ÜSTÜNE normal, `lit` opaklığıyla bindirilir.
 */
export function blitFogged<T>(
    ctx: CanvasRenderingContext2D,
    cache: SpriteCache,
    painter: SpritePainter<T>,
    input: T,
    x: number,
    y: number,
    lit: number,
): void {
    const { w, h } = painter.size(input);
    const dx = x - (w - NATIVE_CELL_SIZE) / 2;
    const dy = y - (h - NATIVE_CELL_SIZE) / 2;

    if (lit >= 1) {
        ctx.drawImage(cache.get(painter, input), dx, dy, w, h);
        return;
    }

    ctx.drawImage(cache.get(dimVariantOf(painter), input), dx, dy, w, h);
    if (lit <= 0) return;

    const alpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha * lit;
    ctx.drawImage(cache.get(painter, input), dx, dy, w, h);
    ctx.globalAlpha = alpha;
}
