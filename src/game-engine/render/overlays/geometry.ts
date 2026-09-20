/**
 * DOSYA AMACI: Overlay katmanlarının paylaştığı yerleşim yardımcıları — oda
 * gezme, oda kenarlığının İÇİNDEKİ "padding box" hesabı, kenar şeridi ve etiket
 * konumları, sprite'ı bir noktaya blit etme.
 *
 * NEDEN padding box: DOM'da kenar şeritleri, etiketler ve oda başlığı oda
 * `<div>`'inin `position: absolute` çocukları; yani konumları kenarlığın DIŞINDAN
 * değil İÇ kenarından hesaplanır (`top: 0` = kenarlığın hemen altı). Kenarlık
 * kalınlığı `cells/index.ts`'teki `roomBorderWidth`'ten gelir (tek kaynak).
 */

import type { RoomState } from '../../logic/types';
import type { BoardScene, RoomOffset, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import type { SpriteCache } from '../spriteCache';
import { roomBorderWidth } from '../cells';

export type EdgeSide = 'top' | 'bottom' | 'left' | 'right';
export const EDGE_SIDES: readonly EdgeSide[] = ['top', 'bottom', 'left', 'right'];

/** Kontrol edilmeyen odanın `opacity: 0.4` değeri (GameBoard'daki oda `<div>`'i). */
export const UNCONTROLLED_ALPHA = 0.4;

/** `edgePlacement`: şerit kalınlığı. */
export const EDGE_STRIP_THICKNESS = 4;

/** `renderEdgeLabel`: etiketin dış kutusunun oda kenarından uzaklığı ve boyu. */
const LABEL_SIZE = 24;
const LABEL_OFFSET = 28;

export { NATIVE_CELL_SIZE };

/** Bir odanın kontrol edilip edilmediği — `cells/index.ts`'teki kuralın aynısı. */
export function isRoomControlled(scene: BoardScene, roomId: string): boolean {
    return !scene.controlledRoomIds
        || scene.controlledRoomIds.length === 0
        || scene.controlledRoomIds.includes(roomId);
}

export function forEachRoom(
    scene: BoardScene,
    visit: (room: RoomState, offset: RoomOffset, isControlled: boolean) => void,
): void {
    for (const room of Object.values(scene.rooms)) {
        const offset = scene.roomPositions[room.id];
        if (!offset) continue;
        visit(room, offset, isRoomControlled(scene, room.id));
    }
}

export interface PaddingBox {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

/** Oda kutusunun kenarlık İÇİNDE kalan bölümü (mutlak konumlu çocukların referansı). */
export function paddingBox(offset: RoomOffset, borderWidth: number): PaddingBox {
    const left = offset.left + borderWidth;
    const top = offset.top + borderWidth;
    const width = offset.width - borderWidth * 2;
    const height = offset.height - borderWidth * 2;
    return { left, top, right: left + width, bottom: top + height, width, height };
}

/** Sahnenin oda kenarlığından `paddingBox`'ı. */
export function roomPaddingBox(scene: BoardScene, offset: RoomOffset): PaddingBox {
    return paddingBox(offset, roomBorderWidth(scene));
}

export interface StripRect {
    x: number;
    y: number;
    /** Şeridin uzun kenarı. Kalınlık her zaman `EDGE_STRIP_THICKNESS`. */
    length: number;
    horizontal: boolean;
}

/** `edgePlacement`: dört kenarın 4px'lik şeridi. */
export function edgeStripRect(side: EdgeSide, pb: PaddingBox): StripRect {
    switch (side) {
        case 'top':    return { x: pb.left, y: pb.top, length: pb.width, horizontal: true };
        case 'bottom': return { x: pb.left, y: pb.bottom - EDGE_STRIP_THICKNESS, length: pb.width, horizontal: true };
        case 'left':   return { x: pb.left, y: pb.top, length: pb.height, horizontal: false };
        case 'right':  return { x: pb.right - EDGE_STRIP_THICKNESS, y: pb.top, length: pb.height, horizontal: false };
    }
}

/**
 * `renderEdgeLabel` dış kutusunun MERKEZİ: kenardan `-28px` dışarıda, kenar
 * boyunca ortalı (`left/top: 50%` + `translate(-50%)`).
 */
export function edgeLabelCenter(side: EdgeSide, pb: PaddingBox): { x: number; y: number } {
    const half = LABEL_SIZE / 2;
    const out = LABEL_OFFSET - half;
    switch (side) {
        case 'top':    return { x: pb.left + pb.width / 2, y: pb.top - out };
        case 'bottom': return { x: pb.left + pb.width / 2, y: pb.bottom + out };
        case 'left':   return { x: pb.left - out, y: pb.top + pb.height / 2 };
        case 'right':  return { x: pb.right + out, y: pb.top + pb.height / 2 };
    }
}

/** Sprite'ı sol-üst köşesi `(x, y)` olacak şekilde, kendi boyutunda blit eder. */
export function drawAt<T>(
    ctx: CanvasRenderingContext2D,
    cache: SpriteCache,
    painter: SpritePainter<T>,
    input: T,
    x: number,
    y: number,
): void {
    const { w, h } = painter.size(input);
    ctx.drawImage(cache.get(painter, input), x, y, w, h);
}
