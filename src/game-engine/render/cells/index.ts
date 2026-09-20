/**
 * DOSYA AMACI: Hücre tipi → rasterleyici kaydı ve hücre katmanlarının çizimi.
 * `static` katmanına hücrelerin durağan gövdesini, `ambient` katmanına
 * animasyonlu süslerini blit eder.
 *
 * Faz 03'te kayıt TAMAMLANDI: `CELL_SPRITES` artık `Partial` değil, on iki
 * `CellTypes` değerinin hepsini içeren tam bir `Record`. `normal`'a düşen yedek
 * yol ve onun `console.warn`'ı kaldırıldı — yeni bir hücre tipi eklendiğinde
 * derleyici burayı hata verecek (faz planı §2.3).
 */

import type { CellTypes } from '../../logic/cellTypes';
import { getThemeConfig } from '../../themes/themeConfig';
import { cellKey } from '../../components/board/boardIndex';
import type { BoardScene, CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE, PHASES } from '../types';
import type { SpriteCache } from '../spriteCache';
import { parseBorder } from '../paintTokens';
import type { ActivityTracker } from './activity';
import { normalCellSprite } from './normal';
import { obstacleCellSprite } from './obstacle';
import { forbiddenCellSprite } from './forbidden';
import { BASE_PHASE, ICE_PULSE_MS, iceAmbientSprite, iceCellSprite, iceIsAnimated } from './ice';
import { powerCellSprite } from './power';
import { toggleCellSprite } from './toggle';
import { CONVEYOR_CHASE_MS, conveyorAmbientSprite, conveyorCellSprite, conveyorIsAnimated } from './conveyor';
import { trampolineCellSprite } from './trampoline';
import { TELEPORT_VORTEX_MS, teleportAmbientSprite, teleportCellSprite, teleportIsAnimated } from './teleport';
import { TARGET_PULSE_MS, targetAmbientSprite, targetCellSprite, targetIsAnimated } from './target';
import { controlSwitchCellSprite } from './controlSwitch';
import { directionDeflectorCellSprite } from './directionDeflector';

/** Bir hücrenin animasyonlu süsü. Kaydı olmayan tip ambient katmanında çizilmez. */
export interface AmbientSprite {
    painter: SpritePainter<CellPaintInput>;
    /** Bu hücre ŞU DURUMDA animasyonlu mu? Değilse süs `static` katmanındadır. */
    isAnimated(input: CellPaintInput): boolean;
    /** Süsün bir tam döngüsünün ms cinsinden süresi. */
    periodMs: number;
}

export const CELL_SPRITES: Record<CellTypes, SpritePainter<CellPaintInput>> = {
    normal: normalCellSprite,
    obstacle: obstacleCellSprite,
    forbidden: forbiddenCellSprite,
    ice: iceCellSprite,
    power: powerCellSprite,
    toggle: toggleCellSprite,
    conveyor: conveyorCellSprite,
    trampoline: trampolineCellSprite,
    teleport: teleportCellSprite,
    target: targetCellSprite,
    control_switch: controlSwitchCellSprite,
    direction_deflector: directionDeflectorCellSprite,
};

export const CELL_AMBIENT_SPRITES: Partial<Record<CellTypes, AmbientSprite>> = {
    ice:      { painter: iceAmbientSprite,      isAnimated: iceIsAnimated,      periodMs: ICE_PULSE_MS },
    conveyor: { painter: conveyorAmbientSprite, isAnimated: conveyorIsAnimated, periodMs: CONVEYOR_CHASE_MS },
    teleport: { painter: teleportAmbientSprite, isAnimated: teleportIsAnimated, periodMs: TELEPORT_VORTEX_MS },
    target:   { painter: targetAmbientSprite,   isAnimated: targetIsAnimated,   periodMs: TARGET_PULSE_MS },
};

/** `BoardCell`'in her hücrenin ARDINA koyduğu düz renk. */
const CELL_BACKDROP = '#020617';

/** `isOccupied`: bu karede VEYA bir önceki karede üzerinde varlık olan hücreler. */
function occupiedKeys(scene: BoardScene): Set<string> {
    const keys = new Set<string>();
    for (const list of [scene.entities, scene.prevEntities]) {
        if (!list) continue;
        for (const entity of list) {
            keys.add(cellKey(entity.position.roomId ?? 'main', entity.position.row, entity.position.col));
        }
    }
    return keys;
}

/** `static` katmanının varlık bağımlılığı için ucuz imza (bkz. `BoardCanvas`). */
export function occupancySignature(scene: BoardScene): string {
    return Array.from(occupiedKeys(scene)).sort().join('|');
}

/**
 * Oda çerçevesinin kenar kalınlığı. DOM'da oda `<div>`'i `box-sizing:border-box`
 * ve kenarı İÇERİDE olduğu için ızgara o kadar içeriden başlar. Beş temanın
 * hiçbirinde kalınlık `isControlled`'a göre değişmiyor, bu yüzden `true` yeterli.
 */
export function roomBorderWidth(scene: BoardScene): number {
    return parseBorder(getThemeConfig(scene.theme).board.border(true))?.width ?? 0;
}

/** Sprite hücreye ORTALI blit edilir; taşan parlama için büyütülmüş kutuyu telafi eder. */
function blit(ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement, x: number, y: number, w: number, h: number): void {
    ctx.drawImage(sprite, x - (w - NATIVE_CELL_SIZE) / 2, y - (h - NATIVE_CELL_SIZE) / 2, w, h);
}

/**
 * Bir odanın hücrelerini gezer; `visit` her hücre için ekran konumunu alır.
 *
 * `activity` verilmezse (ör. testler) hiçbir hücre etkin sayılmaz — üç geçici
 * durumlu tip (`conveyor`, `teleport`, `trampoline`) dinlenme hâlinde çizilir.
 */
function forEachCell(
    scene: BoardScene,
    activity: ActivityTracker | null,
    visit: (input: CellPaintInput, x: number, y: number, isControlled: boolean) => void,
): void {
    const inset = roomBorderWidth(scene);
    const occupied = occupiedKeys(scene);

    for (const room of Object.values(scene.rooms)) {
        const offset = scene.roomPositions[room.id];
        if (!offset) continue;
        const isControlled = !scene.controlledRoomIds
            || scene.controlledRoomIds.length === 0
            || scene.controlledRoomIds.includes(room.id);

        room.grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                const key = cellKey(room.id, cell.position.row, cell.position.col);
                visit(
                    {
                        cell,
                        theme: scene.theme,
                        isOccupied: occupied.has(key),
                        isActive: activity?.isActive(key) ?? false,
                        phase: 0,
                    },
                    offset.left + inset + c * NATIVE_CELL_SIZE,
                    offset.top + inset + r * NATIVE_CELL_SIZE,
                    isControlled,
                );
            });
        });
    }
}

/**
 * Hücrelerin durağan gövdesi. Kontrol edilmeyen oda `globalAlpha = 0.4` ile
 * çizilir (bugünkü `opacity: isControlled ? 1 : 0.4` karşılığı).
 *
 * `ambientMode === 'off'` iken ambient katmanı hiç çizilmediği için (00-ilkeler
 * §2.3) animasyonlu süsler DE buraya, taban fazlarıyla düşer — DOM'da
 * `animation: none` öğeyi gizlemez, taban stilinde bırakır.
 */
export function drawCellsStatic(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    activity: ActivityTracker | null = null,
): void {
    const drawBase = scene.ambientMode === 'off';

    forEachCell(scene, activity, (input, x, y, isControlled) => {
        ctx.save();
        ctx.globalAlpha = isControlled ? 1 : 0.4;

        ctx.fillStyle = CELL_BACKDROP;
        ctx.fillRect(x, y, NATIVE_CELL_SIZE, NATIVE_CELL_SIZE);

        const painter = CELL_SPRITES[input.cell.type];
        const { w, h } = painter.size(input);
        blit(ctx, cache.get(painter, input), x, y, w, h);

        const ambient = CELL_AMBIENT_SPRITES[input.cell.type];
        if (drawBase && ambient?.isAnimated(input)) {
            const base = { ...input, phase: BASE_PHASE };
            const size = ambient.painter.size(base);
            blit(ctx, cache.get(ambient.painter, base), x, y, size.w, size.h);
        }
        ctx.restore();
    });
}

/**
 * Hücrelerin animasyonlu süsleri. Canlı hesaplanmaz: zamandan faz seçilip
 * önbellekteki sprite blit edilir (00-ilkeler §3.2).
 *
 * @returns Çizilen canlı bir süs varsa `true` — çağıran döngüyü uyanık tutmalı.
 */
export function drawCellsAmbient(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    now: number,
    activity: ActivityTracker | null = null,
): boolean {
    let alive = false;

    forEachCell(scene, activity, (input, x, y, isControlled) => {
        const ambient = CELL_AMBIENT_SPRITES[input.cell.type];
        if (!ambient || !ambient.isAnimated(input)) return;
        alive = true;

        const phase = Math.floor(((now % ambient.periodMs) / ambient.periodMs) * PHASES) % PHASES;
        const withPhase = { ...input, phase };
        const { w, h } = ambient.painter.size(withPhase);

        ctx.save();
        ctx.globalAlpha = isControlled ? 1 : 0.4;
        blit(ctx, cache.get(ambient.painter, withPhase), x, y, w, h);
        ctx.restore();
    });

    return alive;
}
