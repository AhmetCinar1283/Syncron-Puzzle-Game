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
import type { BoardScene, CellPaintInput, LayerName, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE, PHASES } from '../types';
import type { SpriteCache } from '../spriteCache';
import { parseBorder } from '../paintTokens';
import type { FogFrame } from '../fog';
import type { Fades, FadeFrame } from '../fades';
import { roomAlphaOf } from '../fades';
import type { ActivityTracker } from './activity';
import { TRAMPOLINE_ACTIVE_MS } from './activity';
import { blitFogged, drawHiddenBorder } from './fogBlit';
import { normalCellSprite } from './normal';
import { obstacleCellSprite } from './obstacle';
import { forbiddenCellSprite } from './forbidden';
import { BASE_PHASE, ICE_FADE_MS, ICE_PULSE_MS, iceAmbientSprite, iceCellSprite, iceIsAnimated } from './ice';
import { powerCellSprite } from './power';
import { toggleCellSprite } from './toggle';
import { CONVEYOR_CHASE_MS, conveyorAmbientSprite, conveyorCellSprite, conveyorIsAnimated } from './conveyor';
import { drawTrampolineSquash, trampolineCellSprite } from './trampoline';
import {
    TELEPORT_FADE_MS, TELEPORT_VORTEX_MS, teleportAmbientSprite, teleportCellSprite, teleportIsAnimated,
} from './teleport';
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

/**
 * DOM'da görünümü `transition` ile değişen hücre tipleri ve süreleri
 * (`iceCellRenderer.tsx:78` 200ms, `teleportCellRenderer.tsx:116` 600ms; ikisi de
 * `ease`). Eski ve yeni hâlin sprite'ı `globalAlpha` ile çapraz geçirilir.
 */
const FADE_MS: Partial<Record<CellTypes, number>> = {
    ice: ICE_FADE_MS,
    teleport: TELEPORT_FADE_MS,
};

/** Trambolin ezilmesi yalnızca `static`teki yayı ilgilendirir. */
const SQUASH_LAYERS: readonly LayerName[] = ['static'];

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

/**
 * Bir odanın hücrelerini gezer; `visit` her hücre için ekran konumunu alır.
 *
 * `activity` verilmezse (ör. testler) hiçbir hücre etkin sayılmaz — üç geçici
 * durumlu tip (`conveyor`, `teleport`, `trampoline`) dinlenme hâlinde çizilir.
 *
 * `alpha` odanın `opacity`sidir (kontrol edilmeyen oda 0.4); oda geçişi sürüyorsa
 * `fades`ten ara değer gelir.
 */
function forEachCell(
    scene: BoardScene,
    activity: ActivityTracker | null,
    fades: FadeFrame | null,
    visit: (input: CellPaintInput, x: number, y: number, alpha: number, key: string) => void,
): void {
    const inset = roomBorderWidth(scene);
    const occupied = occupiedKeys(scene);

    for (const room of Object.values(scene.rooms)) {
        const offset = scene.roomPositions[room.id];
        if (!offset) continue;
        const isControlled = !scene.controlledRoomIds
            || scene.controlledRoomIds.length === 0
            || scene.controlledRoomIds.includes(room.id);
        const alpha = roomAlphaOf(fades, room.id, isControlled);

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
                    alpha,
                    key,
                );
            });
        });
    }
}

/**
 * Bir hücre hâlinin gövdesi ve — ambient kapalıysa — süsünün taban hâli.
 * Çapraz geçişte iki hâl (eski, yeni) için ayrı ayrı çağrılır.
 */
function drawCellState(
    ctx: CanvasRenderingContext2D,
    cache: SpriteCache,
    input: CellPaintInput,
    x: number,
    y: number,
    lit: number,
    drawBase: boolean,
): void {
    blitFogged(ctx, cache, CELL_SPRITES[input.cell.type], input, x, y, lit);

    const ambient = CELL_AMBIENT_SPRITES[input.cell.type];
    if (drawBase && ambient?.isAnimated(input)) {
        blitFogged(ctx, cache, ambient.painter, { ...input, phase: BASE_PHASE }, x, y, lit);
    }
}

/**
 * Hücrelerin durağan gövdesi. Kontrol edilmeyen oda `globalAlpha = 0.4` ile
 * çizilir (bugünkü `opacity: isControlled ? 1 : 0.4` karşılığı); oda geçişi
 * sürerken ara değer.
 *
 * `ambientMode === 'off'` iken ambient katmanı hiç çizilmediği için (00-ilkeler
 * §2.3) animasyonlu süsler DE buraya, taban fazlarıyla düşer — DOM'da
 * `animation: none` öğeyi gizlemez, taban stilinde bırakır.
 *
 * `fog` verilmişse sis uygulanır: keşfedilmemiş hücre düz kare, karartılmış
 * hücre `dim` varyantı (bkz. dim.ts). `null` = sis yok.
 *
 * `fades` verilmişse: buz ve teleport eski/yeni hâli çapraz geçer, trambolinin
 * yayı ezilir (bkz. `fades.ts`). `null` = geçiş yok, yeni hâl anında.
 */
export function drawCellsStatic(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    activity: ActivityTracker | null = null,
    fog: FogFrame | null = null,
    fades: FadeFrame | null = null,
): void {
    const drawBase = scene.ambientMode === 'off';

    forEachCell(scene, activity, fades, (input, x, y, alpha, key) => {
        ctx.save();
        ctx.globalAlpha = alpha;

        ctx.fillStyle = CELL_BACKDROP;
        ctx.fillRect(x, y, NATIVE_CELL_SIZE, NATIVE_CELL_SIZE);

        if (fog && !fog.explored(key)) {
            drawHiddenBorder(ctx, x, y);
            ctx.restore();
            return;
        }
        const lit = fog ? fog.lit(key) : 1;
        const type = input.cell.type;
        const fade = fades?.cell(key) ?? null;

        if (fade && type === 'trampoline') {
            drawTrampolineSquash(ctx, cache, input, x, y, lit, fade.elapsedMs);
        } else if (fade && FADE_MS[type]) {
            ctx.globalAlpha = alpha * (1 - fade.e);
            drawCellState(ctx, cache, fade.from, x, y, lit, drawBase);
            ctx.globalAlpha = alpha * fade.e;
            drawCellState(ctx, cache, input, x, y, lit, drawBase);
        } else {
            drawCellState(ctx, cache, input, x, y, lit, drawBase);
        }
        ctx.restore();
    });
}

/**
 * Hücrelerin animasyonlu süsleri. Canlı hesaplanmaz: zamandan faz seçilip
 * önbellekteki sprite blit edilir (00-ilkeler §3.2).
 *
 * Çapraz geçişte (buz/teleport) süs animasyona GİRİYORSA yeni süs `e` ile
 * belirir, ÇIKIYORSA eski süs `1 − e` ile söner; DOM'da aynı öğe olduğu için
 * bu, süsün ölçek/opaklık geçişinin yaklaşığıdır.
 *
 * @returns Yeni hâlde canlı bir süs varsa `true` — çağıran döngüyü uyanık tutmalı.
 *          (Sönen eski süs döngüyü tutmaz; geçişi `KeepAlive` sürer.)
 */
export function drawCellsAmbient(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    now: number,
    activity: ActivityTracker | null = null,
    fog: FogFrame | null = null,
    fades: FadeFrame | null = null,
): boolean {
    let alive = false;

    forEachCell(scene, activity, fades, (input, x, y, alpha, key) => {
        const ambient = CELL_AMBIENT_SPRITES[input.cell.type];
        if (!ambient) return;
        // Keşfedilmemiş hücrede süs yok (DOM'da hücre düz kare).
        if (fog && !fog.explored(key)) return;

        const fade = FADE_MS[input.cell.type] ? fades?.cell(key) ?? null : null;
        const animated = ambient.isAnimated(input);
        const wasAnimated = fade !== null && ambient.isAnimated(fade.from);
        if (!animated && !wasAnimated) return;
        if (animated) alive = true;

        const phase = Math.floor(((now % ambient.periodMs) / ambient.periodMs) * PHASES) % PHASES;
        const lit = fog ? fog.lit(key) : 1;

        ctx.save();
        if (wasAnimated && fade) {
            ctx.globalAlpha = alpha * (1 - fade.e);
            blitFogged(ctx, cache, ambient.painter, { ...fade.from, phase }, x, y, lit);
        }
        if (animated) {
            ctx.globalAlpha = fade ? alpha * fade.e : alpha;
            blitFogged(ctx, cache, ambient.painter, { ...input, phase }, x, y, lit);
        }
        ctx.restore();
    });

    return alive;
}

/**
 * Buz/teleport görünümü değişti mi, trambolin yayı ezilmeye başladı mı: sahne
 * veya etkinlik durumu her değiştiğinde çağrılır (ve etkinlik zamanlayıcısı
 * söndüğünde). Eski hâli `fades`e yazar, geçiş süresince katmanları `KeepAlive`
 * ile uyanık tutturur.
 *
 * @param snap Yeni tur veya tema değişimi: hâli yazar, geçiş BAŞLATMAZ.
 * @returns Yeni bir geçiş başladıysa `true` — çağıran katmanları kirletmeli.
 */
export function observeCellFades(
    scene: BoardScene,
    activity: ActivityTracker | null,
    fades: Fades,
    now: number,
    snap: boolean,
): boolean {
    let started = false;

    forEachCell(scene, activity, null, (input, _x, _y, _alpha, key) => {
        const type = input.cell.type;
        // Trambolin: yalnızca ETKİNLEŞİRKEN ezilir; sönerken geçiş yok.
        const ms = type === 'trampoline' ? (input.isActive ? TRAMPOLINE_ACTIVE_MS : 0) : (FADE_MS[type] ?? -1);
        if (ms < 0) return;

        const layers = type === 'trampoline' ? SQUASH_LAYERS : undefined;
        if (fades.observeCell(key, CELL_SPRITES[type].key(input), input, now, ms, snap, layers)) started = true;
    });

    return started;
}
