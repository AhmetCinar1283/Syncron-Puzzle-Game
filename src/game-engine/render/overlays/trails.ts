/**
 * DOSYA AMACI: İz (trail) katmanı — `RoomOverlays.tsx`'teki `RoomTrailsImpl`'in
 * birebir portu. Hücre başına komşuluğa göre dört kol + merkezde beyaz nokta.
 *
 * SPRITE: kol `trail|<oyuncu>|<yön>`, nokta `trailnode|<oyuncu>`. Renk yalnızca
 * `playerIndex`'ten türediği için anahtar başka bir şey içermez; parlamalar
 * rasterizasyonda çizilir, kare döngüsünde yalnızca blit (00-ilkeler §2.1).
 *
 * DOM'DAN TAŞINAN İKİ TUHAFLIK (kaynak öyle, görüntü değişmesin diye korundu):
 *   - İz hücreleri oda kenarlığı kadar İÇERİDE DEĞİL, `offset.left + c*64`'te.
 *     Hücreler ise kenarlık kadar içeriden başlıyor; yani iz, hücreye göre
 *     kenarlık kalınlığı (2–3px) kadar sol-üste kayık duruyor.
 *   - Oyuncunun yanındaki hücre kontrolü (`isPlayerLeft` vb.) `roomId`'ye
 *     BAKMIYOR; başka odadaki aynı koordinat da sayılır.
 * Sis (`explored`/`isCurrentlyVisible`) Faz 07'nin: şimdilik her iz görünür.
 * İz katmanı oda `opacity`sinden ETKİLENMEZ (DOM'da oda `<div>`'inin dışında).
 */

import { getPlayerColor } from '../../components/playerColors';
import { buildBoardIndex } from '../../components/board/boardIndex';
import type { BoardScene, SpritePainter } from '../types';
import type { SpriteCache } from '../spriteCache';
import { paintBox } from '../paintTokens';
import type { Box } from '../paintTokens';
import { outerPad } from '../cells/common';
import { NATIVE_CELL_SIZE, drawAt, forEachRoom } from './geometry';

export type TrailDir = 'left' | 'right' | 'up' | 'down';
export interface TrailArmInput { playerIndex: number; dir: TrailDir }
export interface TrailNodeInput { playerIndex: number }

const DIRS: readonly TrailDir[] = ['left', 'right', 'up', 'down'];

/** Kolların hücre içindeki kutusu — `RoomTrailsImpl`'deki `left/top/width/height`. */
const ARMS: Record<TrailDir, Box> = {
    left:  { x: 0,  y: 29, w: 32, h: 6 },
    right: { x: 32, y: 29, w: 32, h: 6 },
    up:    { x: 29, y: 0,  w: 6,  h: 32 },
    down:  { x: 29, y: 32, w: 6,  h: 32 },
};
const NODE: Box = { x: 25, y: 25, w: 14, h: 14 };

const armShadow = (hex: string, glow: string) => `0 0 8px ${hex}, 0 0 16px ${glow}`;
const nodeShadow = (hex: string) => `0 0 10px ${hex}, 0 0 20px ${hex}`;

/** Parlamanın en uzak noktası; oyuncu renginden bağımsız. */
const ARM_PAD = outerPad(armShadow('#000', '#000'));
const NODE_PAD = outerPad(nodeShadow('#000'));

export const trailArmSprite: SpritePainter<TrailArmInput> = {
    key: ({ playerIndex, dir }) => `trail|${playerIndex}|${dir}`,

    size: ({ dir }) => ({ w: ARMS[dir].w + ARM_PAD * 2, h: ARMS[dir].h + ARM_PAD * 2 }),

    draw: (ctx, { playerIndex, dir }) => {
        const { hex, glow } = getPlayerColor(playerIndex);
        const arm = ARMS[dir];
        paintBox(ctx, { x: ARM_PAD, y: ARM_PAD, w: arm.w, h: arm.h }, {
            background: hex,
            boxShadow: armShadow(hex, glow),
        });
    },
};

export const trailNodeSprite: SpritePainter<TrailNodeInput> = {
    key: ({ playerIndex }) => `trailnode|${playerIndex}`,

    size: () => ({ w: NODE.w + NODE_PAD * 2, h: NODE.h + NODE_PAD * 2 }),

    draw: (ctx, { playerIndex }) => {
        const { hex } = getPlayerColor(playerIndex);
        paintBox(ctx, { x: NODE_PAD, y: NODE_PAD, w: NODE.w, h: NODE.h }, {
            background: '#ffffff',
            border: `3px solid ${hex}`,
            borderRadius: '50%',
            boxShadow: nodeShadow(hex),
        });
    },
};

/** İz kollarını ve düğümlerini `static` katmanına çizer. */
export function drawTrails(ctx: CanvasRenderingContext2D, scene: BoardScene, cache: SpriteCache): void {
    const { playerByIndex } = buildBoardIndex(scene.entities);

    forEachRoom(scene, (room, offset) => {
        for (const row of room.grid) {
            for (const cell of row) {
                const playerIndex = cell.customData.trailPlayerIndex as number | undefined;
                if (playerIndex === undefined) continue;

                const r = cell.position.row;
                const c = cell.position.col;
                const x = offset.left + c * NATIVE_CELL_SIZE;
                const y = offset.top + r * NATIVE_CELL_SIZE;

                const player = playerByIndex.get(playerIndex);
                const hasTrail = (dr: number, dc: number) =>
                    room.grid[r + dr]?.[c + dc]?.customData.trailPlayerIndex === playerIndex;
                const hasPlayer = (dr: number, dc: number) =>
                    !!player && player.position.row === r + dr && player.position.col === c + dc;

                const open: Record<TrailDir, boolean> = {
                    left:  hasTrail(0, -1) || hasPlayer(0, -1),
                    right: hasTrail(0, 1)  || hasPlayer(0, 1),
                    up:    hasTrail(-1, 0) || hasPlayer(-1, 0),
                    down:  hasTrail(1, 0)  || hasPlayer(1, 0),
                };

                for (const dir of DIRS) {
                    if (!open[dir]) continue;
                    drawAt(ctx, cache, trailArmSprite, { playerIndex, dir }, x + ARMS[dir].x - ARM_PAD, y + ARMS[dir].y - ARM_PAD);
                }
                drawAt(ctx, cache, trailNodeSprite, { playerIndex }, x + NODE.x - NODE_PAD, y + NODE.y - NODE_PAD);
            }
        }
    });
}
