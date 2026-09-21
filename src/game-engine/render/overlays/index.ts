/**
 * DOSYA AMACI: Overlay katmanlarının (oda çerçevesi, iz, kablo, kenar şeritleri,
 * kenar etiketleri, portal yolları) `static` ve `ambient` çizimlerini sıraya
 * dizmek. `BoardCanvas` yalnızca buradaki üç fonksiyonu çağırır.
 *
 * Z-SIRASI kaynak DOM'daki `zIndex` değerlerinden alındı (tahmin değil):
 *   hücreler < iz (5) < kablo (6) < portal svg (80) < kenar şeritleri (90) < etiketler (95).
 * Plan metni "kablolar → izler" yazıyordu; kaynak tersini söylüyor, kablolar izlerin
 * ÜSTÜNDE. Plan ayrıca `ambient`i "şeritler → etiketler → yollar → hücre süsleri"
 * diye sıralıyordu; kaynakta hücre süsleri EN ALTTA, yollar şeritlerin altında.
 *
 *   static : çerçeve → (hücreler) → iz → kablo → wall şeritleri → başlık
 *   ambient: (hücre süsleri) → portal yolları → lava/portal şeritleri → etiketler
 *
 * `ambientMode === 'off'`: ambient katmanı hiç çizilmez; animasyonlu parçalar
 * taban hâlleriyle `static`e düşer (DOM'da `animation: none` öğeyi gizlemez).
 */

import type { BoardScene } from '../types';
import type { SpriteCache } from '../spriteCache';
import type { FogFrame } from '../fog';
import type { FadeFrame } from '../fades';
import { drawCables } from './cables';
import { drawEdgeLabels } from './edgeLabels';
import { drawFlowStrips, drawWallStrips } from './edgeStrips';
import { drawPortalPaths } from './portalPaths';
import { drawRoomFrames, drawRoomTitles, observeRoomFades } from './roomFrame';
import { drawTrails } from './trails';

export { drawRoomFrames, observeRoomFades };

/** Hücrelerin ÜSTÜNE, `static` katmanına. */
export function drawStaticOverlays(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    fog: FogFrame | null = null,
    fades: FadeFrame | null = null,
): void {
    const drawBase = scene.ambientMode === 'off';

    drawTrails(ctx, scene, cache, fog);
    drawCables(ctx, scene, cache, fog);
    if (drawBase) drawPortalPaths(ctx, scene, cache, null);
    drawWallStrips(ctx, scene, fades);
    if (drawBase) {
        drawFlowStrips(ctx, scene, cache, null, fades);
        drawEdgeLabels(ctx, scene, cache, null, fades);
    }
    drawRoomTitles(ctx, scene, fades);
}

/**
 * Hücre süslerinin ÜSTÜNE, `ambient` katmanına.
 *
 * @returns Canlı bir parça çizildiyse `true` — çağıran döngüyü uyanık tutmalı.
 */
export function drawAmbientOverlays(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    now: number,
    fades: FadeFrame | null = null,
): boolean {
    const paths = drawPortalPaths(ctx, scene, cache, now);
    const strips = drawFlowStrips(ctx, scene, cache, now, fades);
    const labels = drawEdgeLabels(ctx, scene, cache, now, fades);
    return paths || strips || labels;
}
