/**
 * DOSYA AMACI: Konveyör, teleport ve trambolin hücrelerinin GEÇİCİ "çalışıyor"
 * hâlini tutmak.
 *
 * NEDEN gerekli: bu üç DOM çizicisi görünümünü React state + `setTimeout` ile
 * sürdürüyor — bir varlık gelince/gidince hücre 500–800 ms boyunca farklı arka
 * plan, kenar, gölge ve süslerle çiziliyor. Bu süre sahnenin (`BoardScene`)
 * içinde yazılı DEĞİL; tick'lerden bağımsız akıyor. Sprite deseni (anahtar +
 * 12 faz) durum tutmadığı için bu bilgi burada, çizimin dışında tutulur ve
 * `CellPaintInput.isActive` olarak çizicilere verilir.
 *
 * Kaynaktaki tetikleyiciler birebir taşındı:
 *   - `conveyorCellRenderer`   : `isPowered && (şimdi VEYA önceki karede varlık)` → 800 ms
 *   - `teleportCellRenderer`   : varlık YENİ GELDİ veya YENİ GİTTİ             → 600 ms
 *   - `trampolineCellRenderer` : varlık YENİ GELDİ                             → 500 ms
 *
 * Maskot adımında eklendi (DOM kaynağı YOK, yeni davranış):
 *   - `target`                 : kendi rengindeki oyuncu üstüne KİLİTLENDİ     → 900 ms
 *     Hücre "sevinir" (halka ve simge büyür, ikinci halka). Yalnızca tick İÇİNDE
 *     gözlenen geçişte tetiklenir (`scene.prevEntities` varken): filmin ilk
 *     karesinde zaten kilitli duran oyuncu her hamlede yeniden sevindirmez.
 *
 * DOM'da `useEffect`in bağımlılıkları varlık KİMLİKLERİ olduğu için yerinde
 * duran bir varlık zamanlayıcıyı tazelemez; buradaki imza (`sig`) aynı kuralı
 * uygular.
 */

import type { Entity } from '../../logic/entityTypes';
import { cellKey } from '../../components/board/boardIndex';
import type { BoardScene } from '../types';

/** Kaynak dosyalardaki `setTimeout` süreleri. */
export const CONVEYOR_ACTIVE_MS = 800;
export const TELEPORT_ACTIVE_MS = 600;
export const TRAMPOLINE_ACTIVE_MS = 500;
export const TARGET_CHEER_MS = 900;

export interface ActivityTracker {
    /** Sahne değişince çağrılır. Aktif küme değiştiyse `true` döner. */
    update(scene: BoardScene, now: number): boolean;
    /** Süresi dolanları atar. Aktif küme değiştiyse `true` döner. */
    expire(now: number): boolean;
    isActive(key: string): boolean;
    /** En yakın bitiş damgası (ms) veya hiç aktif yoksa `null`. */
    nextExpiry(): number | null;
    clear(): void;
}

/** Hücre → üstünde KİLİTLİ oyuncu varsa kimliği (hedef hücrenin sevinmesi için). */
function lockedIdsByCell(entities: Entity[] | null): Map<string, string | number> {
    const map = new Map<string, string | number>();
    if (!entities) return map;
    for (const e of entities) {
        if (e.type !== 'player' || !e.customData.isLocked) continue;
        map.set(cellKey(e.position.roomId ?? 'main', e.position.row, e.position.col), e.id);
    }
    return map;
}

/** Hücre → üstündeki varlığın kimliği. Boşsa hücre listede yoktur. */
function entityIdsByCell(entities: Entity[] | null): Map<string, string | number> {
    const map = new Map<string, string | number>();
    if (!entities) return map;
    for (const entity of entities) {
        map.set(cellKey(entity.position.roomId ?? 'main', entity.position.row, entity.position.col), entity.id);
    }
    return map;
}

function durationFor(type: string): number {
    if (type === 'conveyor') return CONVEYOR_ACTIVE_MS;
    if (type === 'teleport') return TELEPORT_ACTIVE_MS;
    if (type === 'trampoline') return TRAMPOLINE_ACTIVE_MS;
    if (type === 'target') return TARGET_CHEER_MS;
    return 0;
}

function isTriggered(type: string, electrified: boolean, hasNow: boolean, hasPrev: boolean): boolean {
    if (type === 'conveyor') return electrified && (hasNow || hasPrev);
    if (type === 'teleport') return (hasNow && !hasPrev) || (!hasNow && hasPrev);
    if (type === 'trampoline') return hasNow && !hasPrev;
    return false;
}

export function createActivityTracker(): ActivityTracker {
    /** Hücre → aktifliğin bittiği zaman damgası. */
    const until = new Map<string, number>();
    /** Hücre → son görülen (varlık, önceki varlık, elektrik) imzası. */
    const sigs = new Map<string, string>();

    function prune(now: number): boolean {
        let changed = false;
        for (const [key, end] of until) {
            if (end <= now) {
                until.delete(key);
                changed = true;
            }
        }
        return changed;
    }

    return {
        update(scene, now) {
            let changed = prune(now);
            const nowIds = entityIdsByCell(scene.entities);
            const prevIds = entityIdsByCell(scene.prevEntities);
            const lockedNow = lockedIdsByCell(scene.entities);
            const lockedPrev = lockedIdsByCell(scene.prevEntities);

            for (const room of Object.values(scene.rooms)) {
                for (const row of room.grid) {
                    for (const cell of row) {
                        const duration = durationFor(cell.type);
                        if (duration === 0) continue;

                        const key = cellKey(room.id, cell.position.row, cell.position.col);
                        const nowId = nowIds.get(key);
                        const prevId = prevIds.get(key);
                        const sig = `${nowId ?? '-'}|${prevId ?? '-'}|${cell.isElectrified ? 1 : 0}`
                            + `|${lockedNow.get(key) ?? '-'}|${lockedPrev.get(key) ?? '-'}`;
                        // DOM'da `useEffect` yalnızca bağımlılıkları değişince
                        // koşar; yerinde duran varlık zamanlayıcıyı tazelemez.
                        if (sigs.get(key) === sig) continue;
                        sigs.set(key, sig);

                        const cheered = cell.type === 'target' && scene.prevEntities !== null
                            && lockedNow.has(key) && !lockedPrev.has(key);
                        if (!cheered && !isTriggered(cell.type, cell.isElectrified, nowId !== undefined, prevId !== undefined)) continue;
                        if (!until.has(key)) changed = true;
                        until.set(key, now + duration);
                    }
                }
            }
            return changed;
        },

        expire(now) {
            return prune(now);
        },

        isActive(key) {
            return until.has(key);
        },

        nextExpiry() {
            let soonest: number | null = null;
            for (const end of until.values()) {
                if (soonest === null || end < soonest) soonest = end;
            }
            return soonest;
        },

        clear() {
            until.clear();
            sigs.clear();
        },
    };
}
