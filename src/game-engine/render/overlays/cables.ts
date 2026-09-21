/**
 * DOSYA AMACI: Kablo katmanı — `RoomOverlays.tsx`'teki `RoomCablesImpl`'in birebir
 * portu. `right`/`down` bağlantıları için ince şerit + hücre merkezinde beyaz nokta.
 *
 * SPRITE: `cable|h`, `cable|v`, `cablenode` — üç girdi, hepsi bu kadar. Anahtar
 * `cell.id`, konum veya `cableConnections` İÇERMEZ; hangi şeridin çizileceği
 * blit anında seçilir.
 *
 * Katman opaklığı DOM'da `isCurrentlyVisible ? 0.65 : 0.15`; sis Faz 07'de
 * `FogFrame` ile bağlandı (keşfedilmemiş hücre ve komşusu çizilmez). Kablolar izlerin ÜSTÜNDE (kaynakta `zIndex` 6'ya karşı 5)
 * ve oda `opacity`sinden ETKİLENMEZ (DOM'da oda `<div>`'inin dışında). Şerit
 * konumu iz gibi kenarlık kadar içeri ÖTELENMEZ (bkz. trails.ts başlığı).
 */

import { cellKey } from '../../components/board/boardIndex';
import type { BoardScene, SpritePainter } from '../types';
import type { SpriteCache } from '../spriteCache';
import type { FogFrame } from '../fog';
import { paintBox } from '../paintTokens';
import type { Box } from '../paintTokens';
import { outerPad } from '../cells/common';
import { NATIVE_CELL_SIZE, drawAt, forEachRoom } from './geometry';

/** `isCurrentlyVisible ? 0.65 : 0.15` — `RoomCablesImpl`'deki sis opaklığı. */
const CABLE_ALPHA = 0.65;
const CABLE_ALPHA_DIM = 0.15;

const STRIP_COLOR = 'rgba(251, 191, 36, 0.85)';
const STRIP_SHADOW = '0 0 4px rgba(234, 179, 8, 0.6)';
const NODE_SHADOW = '0 0 4px rgba(234, 179, 8, 0.8)';

/** Şeritlerin hücre içindeki kutusu; `right` 64px, komşu hücrenin merkezine kadar uzanır. */
const STRIPS = {
    h: { x: 32, y: 31, w: 64, h: 2 },
    v: { x: 31, y: 32, w: 2, h: 64 },
} as const satisfies Record<string, Box>;
const NODE: Box = { x: 30, y: 30, w: 4, h: 4 };

const STRIP_PAD = outerPad(STRIP_SHADOW);
const NODE_PAD = outerPad(NODE_SHADOW);

export interface CableStripInput { axis: 'h' | 'v' }

export const cableStripSprite: SpritePainter<CableStripInput> = {
    key: ({ axis }) => `cable|${axis}`,

    size: ({ axis }) => ({ w: STRIPS[axis].w + STRIP_PAD * 2, h: STRIPS[axis].h + STRIP_PAD * 2 }),

    draw: (ctx, { axis }) => {
        const strip = STRIPS[axis];
        paintBox(ctx, { x: STRIP_PAD, y: STRIP_PAD, w: strip.w, h: strip.h }, {
            background: STRIP_COLOR,
            boxShadow: STRIP_SHADOW,
        });
    },
};

export const cableNodeSprite: SpritePainter<Record<string, never>> = {
    key: () => 'cablenode',

    size: () => ({ w: NODE.w + NODE_PAD * 2, h: NODE.h + NODE_PAD * 2 }),

    draw: (ctx) => {
        paintBox(ctx, { x: NODE_PAD, y: NODE_PAD, w: NODE.w, h: NODE.h }, {
            background: '#ffffff',
            borderRadius: '50%',
            boxShadow: NODE_SHADOW,
        });
    },
};

/** Elektrikli (veya güç) hücrelerin kablolarını `static` katmanına çizer. */
export function drawCables(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    fog: FogFrame | null = null,
): void {
    ctx.save();

    forEachRoom(scene, (room, offset) => {
        for (const row of room.grid) {
            for (const cell of row) {
                if (!cell.isElectrified && cell.type !== 'power') continue;

                const r = cell.position.row;
                const c = cell.position.col;
                const key = cellKey(room.id, r, c);
                if (fog && !fog.explored(key)) continue;

                ctx.globalAlpha = fog
                    ? CABLE_ALPHA_DIM + (CABLE_ALPHA - CABLE_ALPHA_DIM) * fog.lit(key)
                    : CABLE_ALPHA;

                const x = offset.left + c * NATIVE_CELL_SIZE;
                const y = offset.top + r * NATIVE_CELL_SIZE;
                const connections = (cell.customData.cableConnections as string[]) ?? [];

                for (const [dir, axis, dr, dc] of [['right', 'h', 0, 1], ['down', 'v', 1, 0]] as const) {
                    if (!connections.includes(dir)) continue;
                    // Şerit komşu hücrenin merkezine uzanır; komşu keşfedilmemişse çizilmez.
                    if (fog) {
                        const neighbor = room.grid[r + dr]?.[c + dc];
                        if (!neighbor || !fog.explored(cellKey(room.id, neighbor.position.row, neighbor.position.col))) continue;
                    }
                    drawAt(ctx, cache, cableStripSprite, { axis }, x + STRIPS[axis].x - STRIP_PAD, y + STRIPS[axis].y - STRIP_PAD);
                }
                drawAt(ctx, cache, cableNodeSprite, {}, x + NODE.x - NODE_PAD, y + NODE.y - NODE_PAD);
            }
        }
    });

    ctx.restore();
}
