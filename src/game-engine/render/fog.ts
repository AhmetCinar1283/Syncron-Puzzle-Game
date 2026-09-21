/**
 * DOSYA AMACI: Sis (fog of war) durumunun canvas karşılığı — hücre başına
 * seviye hesabı, 0.3s karartma geçişi ve çizicilerin okuduğu kare görünümü.
 *
 * Kaynak: `BoardCell.tsx` (`isExplored`/`isCurrentlyVisible`), `GameBoard.tsx`
 * (varlık `opacity`si) ve `RoomOverlays.tsx` (iz/kablo opaklığı). Görünürlük
 * kuralı YENİDEN YAZILMADI: `boardIndex.ts`'in `isCellVisible`/`playersIn`'i
 * kullanılıyor.
 *
 * SEVİYE (hücre başına):
 *   0 = keşfedilmemiş (düz kare, süs/iz/kablo/varlık yok)
 *   1 = keşfedilmiş ama şu an görünmüyor (karartılmış)
 *   2 = görünür
 *
 * GEÇİŞ: DOM'da `transition: filter 0.3s ease` yalnızca 1↔2 arasında işler;
 * 0'a girip çıkmak DOM ağacını değiştirdiği için anlıktır. Burada da öyle.
 * Geçiş TEK bir küresel ilerleme değeriyle sürer (faz planı §2.1): sis
 * seviyeleri değiştiği an `startedAt` yazılır, çizim her karede `frame(now)`
 * ile oradan ilerlemeyi okur. Hücre başına zamanlayıcı yok.
 *
 * Saf dosya: tuvale dokunmaz, `performance` okumaz (`now` dışarıdan gelir).
 */

import type { BoardIndex } from '../components/board/boardIndex';
import { buildBoardIndex, cellKey, isCellVisible, playersIn } from '../components/board/boardIndex';
import { EASE_CSS } from './motion';
import type { BoardScene } from './types';

/** `BoardCell`'deki `transition: filter 0.3s ease` ve varlık `opacity` geçişi. */
export const FOG_TRANSITION_MS = 300;

export type FogLevel = 0 | 1 | 2;

/**
 * Sisli odaların her hücresinin seviyesi. Sissiz odalar haritaya HİÇ girmez:
 * haritada olmayan hücre "sis yok" demektir (bkz. `FogFrame`).
 */
export function computeFogLevels(scene: BoardScene): Map<string, FogLevel> {
    const levels = new Map<string, FogLevel>();
    let index: BoardIndex | null = null;

    for (const room of Object.values(scene.rooms)) {
        if (!room.fogOfWar) continue;
        index ??= buildBoardIndex(scene.entities);
        const players = playersIn(index, room.id);

        for (const row of room.grid) {
            for (const cell of row) {
                const r = cell.position.row;
                const c = cell.position.col;
                const visible = isCellVisible(room, players, r, c);
                // `BoardCell`/`RoomOverlays.explored()` ile aynı kural.
                const explored = room.fogKeepRevealed !== false ? !!cell.customData.explored : visible;
                levels.set(cellKey(room.id, r, c), !explored ? 0 : visible ? 2 : 1);
            }
        }
    }
    return levels;
}

/** Çizicilerin bir karede okuduğu sis görünümü. Sis yoksa `frame()` `null` döner. */
export interface FogFrame {
    /** Geçiş sürüyor: katman bir kare daha çizilmeli (00-ilkeler §2.2). */
    transitioning: boolean;
    /** Hücre çizilecek kadar keşfedilmiş mi? Sissiz hücre için `true`. */
    explored(key: string): boolean;
    /** 0 = tam karartılmış, 1 = normal; ikisi arası geçiş anı. Sissiz hücre için 1. */
    lit(key: string): number;
    /**
     * Varlığın opaklığı. Oyuncu keşfedilmiş hücrede hep görünür; diğer varlıklar
     * yalnızca görünür hücrede (`GameBoard`'daki `opacity` kuralı).
     */
    entityAlpha(key: string, isPlayer: boolean): number;
}

export interface FogTracker {
    /**
     * Sahne değişince çağrılır. Seviyelerden biri değiştiyse `true`.
     * İlk kare (`prevEntities === null`) geçişsiz yazılır: yeni bir tur
     * başlarken eski turun karartma durumundan animasyon oynamasın.
     */
    update(scene: BoardScene, now: number): boolean;
    frame(now: number): FogFrame | null;
    /** Seviyeler her değiştiğinde artar — `static` katmanının birleşik sinyalinin terimi. */
    revision(): number;
    clear(): void;
}

const litOfLevel = (level: FogLevel): number => (level === 2 ? 1 : 0);

function sameLevels(a: Map<string, FogLevel>, b: Map<string, FogLevel>): boolean {
    if (a.size !== b.size) return false;
    for (const [key, level] of a) {
        if (b.get(key) !== level) return false;
    }
    return true;
}

export function createFogTracker(): FogTracker {
    let current = new Map<string, FogLevel>();
    let from = current;
    let startedAt = 0;
    let animating = false;
    let revision = 0;

    return {
        update(scene, now) {
            const next = computeFogLevels(scene);
            if (sameLevels(current, next)) return false;

            const snap = scene.prevEntities === null;
            from = snap ? next : current;
            animating = false;
            if (!snap) {
                for (const [key, level] of next) {
                    const before = current.get(key);
                    if (before !== undefined && before !== level) { animating = true; break; }
                }
            }
            current = next;
            startedAt = now;
            revision++;
            return true;
        },

        frame(now) {
            if (current.size === 0) return null;

            // RAF damgası `performance.now()`tan biraz önce olabilir; negatif ilerleme 0'a kenetlenir.
            const t = animating ? Math.min(1, Math.max(0, (now - startedAt) / FOG_TRANSITION_MS)) : 1;
            const e = t >= 1 ? 1 : EASE_CSS(t);

            return {
                transitioning: animating && t < 1,

                explored: key => current.get(key) !== 0,

                lit(key) {
                    const to = current.get(key);
                    if (to === undefined) return 1;
                    const before = from.get(key) ?? to;
                    // 0'a girip çıkmak anlıktır (DOM ağacı değişiyor).
                    if (before === to || before === 0 || to === 0) return litOfLevel(to);
                    return litOfLevel(before) + (litOfLevel(to) - litOfLevel(before)) * e;
                },

                entityAlpha(key, isPlayer) {
                    const to = current.get(key);
                    if (to === undefined) return 1;
                    const before = from.get(key) ?? to;
                    const alphaOf = (level: FogLevel) => ((isPlayer ? level > 0 : level === 2) ? 1 : 0);
                    return alphaOf(before) + (alphaOf(to) - alphaOf(before)) * e;
                },
            };
        },

        revision: () => revision,

        clear() {
            current = new Map();
            from = current;
            animating = false;
            revision++;
        },
    };
}
