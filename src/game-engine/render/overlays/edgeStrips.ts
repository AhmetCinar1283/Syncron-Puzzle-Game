/**
 * DOSYA AMACI: Oda kenar şeritleri — `GameBoard.tsx`'teki `renderEdgeStrip`'in
 * portu. Üç durum:
 *   - `wall`         → düz şerit, DURAĞAN (`static` katmanı).
 *   - `lava`/`portal`→ akan gradient + dış parlama + `edge-glow-pulse` nabzı,
 *                      ANİMASYONLU (`ambient` katmanı).
 *
 * AKAN GRADIENT: DOM'da 3 kat uzunlukta bir katman `edge-slide-*` ile
 * `0 → -%66.667 → 0` kaydırılıyor. Burada 3 kat uzunlukta TEK sprite bir kez
 * rasterize edilir; kare döngüsünde `drawImage`'ın KAYNAK dikdörtgeni kaydırılır
 * (00-ilkeler §3.2'nin doğal hâli — 12 ayrı sprite gerekmez). Parlama ayrı bir
 * sprite; nabız `globalAlpha` ile hesaplanır, sprite'a girmez.
 *
 * Anahtarlar `kind|eksen|uzunluk`: uzunluk görüntüyü belirler (gradient o kadar
 * uzun), oda kimliği ya da konumu belirlemez.
 */

import type { BoardScene, SpritePainter } from '../types';
import type { SpriteCache } from '../spriteCache';
import type { FadeFrame } from '../fades';
import { applyBackground, paintBox } from '../paintTokens';
import { outerPad } from '../cells/common';
import {
    EDGE_SIDES, EDGE_STRIP_THICKNESS, drawAt, edgeStripRect, forEachRoom, roomPaddingBox,
} from './geometry';
import { EDGE_TIMING, edgeFlowFraction, edgePulseOpacity } from './timing';

export type FlowKind = 'lava' | 'portal';
export interface EdgeStripInput { kind: FlowKind; horizontal: boolean; length: number }

const WALL_COLOR = 'rgba(30, 58, 138, 0.4)';

const STYLE: Record<FlowKind, { stops: string; glow: string }> = {
    lava: {
        stops: '#ef4444, #f97316, #ef4444, #ef4444',
        glow: '0 0 10px #ef4444, 0 0 20px rgba(239, 68, 68, 0.5)',
    },
    portal: {
        stops: '#8b5cf6, #ec4899, #8b5cf6, #8b5cf6',
        glow: '0 0 10px #a855f7, 0 0 20px rgba(168, 85, 247, 0.5)',
    },
};

const GLOW_PAD = outerPad(STYLE.lava.glow);

const axisKey = ({ kind, horizontal, length }: EdgeStripInput) => `${kind}|${horizontal ? 'h' : 'v'}|${length}`;

/** 3 kat uzunlukta gradient; `edge-slide-*`'in kaydırdığı iç katman. */
export const edgeFlowSprite: SpritePainter<EdgeStripInput> = {
    key: (input) => `edgeflow|${axisKey(input)}`,

    size: ({ horizontal, length }) => (horizontal
        ? { w: length * 3, h: EDGE_STRIP_THICKNESS }
        : { w: EDGE_STRIP_THICKNESS, h: length * 3 }),

    draw: (ctx, input) => {
        const { w, h } = edgeFlowSprite.size(input);
        const angle = input.horizontal ? '90deg' : '180deg';
        applyBackground(ctx, { x: 0, y: 0, w, h }, `linear-gradient(${angle}, ${STYLE[input.kind].stops})`);
    },
};

/** Şeridin dış `box-shadow`u; şeridin kendi kutusu boş kalır. */
export const edgeGlowSprite: SpritePainter<EdgeStripInput> = {
    key: (input) => `edgeglow|${axisKey(input)}`,

    size: ({ horizontal, length }) => (horizontal
        ? { w: length + GLOW_PAD * 2, h: EDGE_STRIP_THICKNESS + GLOW_PAD * 2 }
        : { w: EDGE_STRIP_THICKNESS + GLOW_PAD * 2, h: length + GLOW_PAD * 2 }),

    draw: (ctx, { kind, horizontal, length }) => {
        const w = horizontal ? length : EDGE_STRIP_THICKNESS;
        const h = horizontal ? EDGE_STRIP_THICKNESS : length;
        paintBox(ctx, { x: GLOW_PAD, y: GLOW_PAD, w, h }, { boxShadow: STYLE[kind].glow });
    },
};

/** `wall` kenarları — `static` katmanı. Oda `opacity`sine tabidir. */
export function drawWallStrips(ctx: CanvasRenderingContext2D, scene: BoardScene, fades: FadeFrame | null = null): void {
    forEachRoom(scene, (room, offset, _isControlled, alpha) => {
        const pb = roomPaddingBox(scene, offset);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = WALL_COLOR;
        for (const side of EDGE_SIDES) {
            const type = room.edges[side]?.type;
            if (!type || type === 'lava' || type === 'portal') continue;
            const r = edgeStripRect(side, pb);
            ctx.fillRect(r.x, r.y, r.horizontal ? r.length : EDGE_STRIP_THICKNESS, r.horizontal ? EDGE_STRIP_THICKNESS : r.length);
        }
        ctx.restore();
    }, fades);
}

/**
 * `lava`/`portal` kenarları.
 *
 * @param now `null` = `ambientMode === 'off'` taban hâli (kayma 0, opaklık 1).
 * @returns Animasyonlu bir şerit çizildiyse `true`.
 */
export function drawFlowStrips(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    now: number | null,
    fades: FadeFrame | null = null,
): boolean {
    let drawn = false;

    forEachRoom(scene, (room, offset, _isControlled, alpha) => {
        const pb = roomPaddingBox(scene, offset);
        for (const side of EDGE_SIDES) {
            const kind = room.edges[side]?.type;
            if (kind !== 'lava' && kind !== 'portal') continue;
            drawn = true;

            const rect = edgeStripRect(side, pb);
            const input: EdgeStripInput = { kind, horizontal: rect.horizontal, length: rect.length };
            const timing = EDGE_TIMING[kind];
            const pulse = now === null ? 1 : edgePulseOpacity(now, timing.pulseMs);
            const fraction = now === null ? 0 : edgeFlowFraction(now, timing.flowMs);

            ctx.save();
            ctx.globalAlpha = alpha * pulse;
            drawAt(ctx, cache, edgeGlowSprite, input, rect.x - GLOW_PAD, rect.y - GLOW_PAD);

            // Kaynak dikdörtgeni kaydırılır: sprite tuvali DPR ölçekli olduğu için
            // CSS pikselinden tuval pikseline oran sprite'tan okunur.
            const flow = cache.get(edgeFlowSprite, input);
            const shift = rect.length * 2 * fraction;
            const t = EDGE_STRIP_THICKNESS;
            if (rect.horizontal) {
                const k = flow.width / (rect.length * 3);
                ctx.drawImage(flow, shift * k, 0, rect.length * k, flow.height, rect.x, rect.y, rect.length, t);
            } else {
                const k = flow.height / (rect.length * 3);
                ctx.drawImage(flow, 0, shift * k, flow.width, rect.length * k, rect.x, rect.y, t, rect.length);
            }
            ctx.restore();
        }
    }, fades);

    return drawn;
}
