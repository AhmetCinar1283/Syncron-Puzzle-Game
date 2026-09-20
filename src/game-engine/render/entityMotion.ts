/**
 * DOSYA AMACI: Varlıkların (oyuncu, kutu) kare dışı hareket durumu —
 * `physicsWrapper.tsx`'in React state'iyle yaptığı işin canvas karşılığı.
 *
 * NEDEN kare dışında: sprite deseni durum tutmaz ve çizim saf olmalı. DOM'da
 * `prevZRef` + `useState(isLanded)` + `setTimeout` ile tutulan bilgi burada
 * varlık kimliğine göre bir sözlükte yaşar; `BoardCanvas` sahne değişince
 * `update` çağırır, çizim yalnızca OKUR.
 *
 * Efekt seçim zinciri `physicsWrapper`'dan BİREBİR taşındı (faz planı §3.3):
 * ölüm > zafer > çarpma > ışınlanma > iniş. Sıra değişirse ölmüş bir oyuncu
 * zıplamaya devam eder.
 */

import type { Entity } from '../logic/entityTypes';
import type { BoardScene } from './types';
import { NATIVE_CELL_SIZE } from './types';
import { TRACKS, sampleTrack } from './motion';
import type { Transform } from './motion';

/** `landingSquashEffect` süresi — `physicsWrapper`'daki `setTimeout(…, 220)`. */
export const LANDING_MS = 220;

/** `death-*` ve `victory-spin` süreleri. */
const DEATH_MS = 800;
const VICTORY_MS = 800;

/** `customData.deathReason` → keyframe adı. */
const DEATH_TRACKS: Record<string, string> = {
    forbidden: 'death-forbidden',
    crushed: 'death-crushed',
    lava_edge: 'death-lava',
    trail: 'death-trail',
};

const BUMP_PREFIX: Record<string, string> = {
    blocked_push: 'blocked-push',
    conveyor: 'conveyor-reject',
};

/** Bir varlığın süren efekt durumu. */
export interface EntityMotionState {
    /**
     * `prevZRef.current`. DOM'daki tuhaflık korundu: iniş tetiklendiği karede
     * efekt erken döndüğü için ref GÜNCELLENMEZ.
     */
    prevZ: number;
    /** `useEffect`in bağımlılığı: `z` gerçekten değiştiğinde çalışır. */
    lastZ: number;
    /** `isLanded` state'inin canvas karşılığı; `null` = inişte değil. */
    landedUntil: number | null;
    /** Aktif efekt adı, başlangıç damgası ve gerçek süresi. */
    track: { name: string; startedAt: number; durationMs: number } | null;
}

export interface EntityMotionTracker {
    /** Sahne değişince çağrılır; seçim zincirini yeniden uygular. */
    update(scene: BoardScene, now: number): void;
    get(id: number): EntityMotionState | undefined;
    clear(): void;
}

/** Bir varlığın tahtadaki piksel konumu — `physicsWrapper` ile birebir. */
export function entityXY(scene: BoardScene, entity: Entity): { x: number; y: number } {
    const roomId = entity.position.roomId ?? 'main';
    const offset = scene.roomPositions[roomId] ?? { left: 0, top: 0 };
    return {
        x: offset.left + entity.position.col * NATIVE_CELL_SIZE,
        y: offset.top + entity.position.row * NATIVE_CELL_SIZE,
    };
}

/**
 * Bir hücreden fazla atlama veya oda değişimi. DOM'da bu durumda
 * `transition: none` — yani konum interpolasyonu YAPILMAZ.
 */
export function isTeleporting(scene: BoardScene, entity: Entity, prevEntity: Entity | null): boolean {
    if (!prevEntity) return false;
    const here = entityXY(scene, entity);
    const there = entityXY(scene, prevEntity);
    const sameRoom = (prevEntity.position.roomId ?? 'main') === (entity.position.roomId ?? 'main');
    return Math.abs(here.x - there.x) > NATIVE_CELL_SIZE
        || Math.abs(here.y - there.y) > NATIVE_CELL_SIZE
        || !sameRoom;
}

/** Süren bir efekt var mı (döngü uyanık kalmalı mı). */
export function isTrackActive(state: EntityMotionState | undefined, now: number): boolean {
    if (!state?.track) return false;
    const track = TRACKS[state.track.name];
    if (!track) return false;
    if (track.repeat === 'loop') return true;
    return now - state.track.startedAt < state.track.durationMs;
}

/**
 * Süren efektin dönüşümü, yoksa `null`.
 *
 * `once` (CSS'te `fill-mode` yok) biten efekt taban stile DÖNER; `hold-last`
 * (`forwards`) son karede KALIR; `loop` (`infinite`) sonsuza kadar örneklenir.
 */
export function trackTransformOf(state: EntityMotionState | undefined, now: number): Transform | null {
    if (!state?.track) return null;
    const track = TRACKS[state.track.name];
    if (!track) return null;
    const elapsed = now - state.track.startedAt;
    if (track.repeat === 'once' && elapsed >= state.track.durationMs) return null;
    return sampleTrack(track, elapsed, state.track.durationMs);
}

/** `physicsWrapper`'ın `customAnimation` zinciri — SIRA BAĞLAYICI. */
function selectTrack(
    entity: Entity,
    teleporting: boolean,
    landed: boolean,
    frameMs: number,
): { name: string; durationMs: number } | null {
    const { bumpDirection, bumpReason, deathReason, isVictory } = entity.customData as {
        bumpDirection?: string;
        bumpReason?: string;
        deathReason?: string;
        isVictory?: boolean;
    };

    if (deathReason) {
        // Tanınmayan bir sebep DOM'da da animasyonsuz kalır ve zincir burada
        // BİTER — ölü bir varlık zafer veya çarpma efektine düşmez.
        const name = DEATH_TRACKS[deathReason];
        return name ? { name, durationMs: DEATH_MS } : null;
    }
    if (isVictory) return { name: 'victory-spin', durationMs: VICTORY_MS };
    if (bumpDirection) {
        const name = bumpReason === 'collision'
            ? 'collision-shake'
            : `${BUMP_PREFIX[bumpReason ?? ''] ?? 'bump'}-${bumpDirection}`;
        return { name, durationMs: frameMs };
    }
    if (teleporting) return { name: 'teleportInEffect', durationMs: frameMs };
    if (landed) return { name: 'landingSquashEffect', durationMs: LANDING_MS };
    return null;
}

export function createEntityMotionTracker(): EntityMotionTracker {
    const states = new Map<number, EntityMotionState>();

    return {
        update(scene, now) {
            const prevById = new Map<number, Entity>();
            for (const entity of scene.prevEntities ?? []) prevById.set(entity.id, entity);

            const seen = new Set<number>();

            for (const entity of scene.entities) {
                seen.add(entity.id);
                const z = entity.physics.z;
                let state = states.get(entity.id);
                if (!state) {
                    state = { prevZ: z, lastZ: z, landedUntil: null, track: null };
                    states.set(entity.id, state);
                }

                // `useEffect(..., [z])`: yalnızca z DEĞİŞİNCE çalışır.
                if (z !== state.lastZ) {
                    state.lastZ = z;
                    if (state.prevZ > 0 && z === 0) state.landedUntil = now + LANDING_MS;
                    else state.prevZ = z;
                }
                if (state.landedUntil !== null && now >= state.landedUntil) state.landedUntil = null;

                const teleporting = isTeleporting(scene, entity, prevById.get(entity.id) ?? null);
                const selection = selectTrack(entity, teleporting, state.landedUntil !== null, scene.frameMs);

                if (!selection) {
                    state.track = null;
                    continue;
                }
                const current = state.track;
                const sameName = current?.name === selection.name;
                // Süren bir iniş veya sonsuz zafer dönüşü yeni tick'te BAŞTAN
                // başlamaz; tek seferlik efektler (çarpma, ışınlanma) ise DOM'da
                // `animation` dizgisi her tick'te yenilendiği için yeniden tetiklenir.
                const keep = sameName
                    && (selection.name === 'landingSquashEffect' || TRACKS[selection.name]?.repeat === 'loop');
                if (!keep) {
                    state.track = { name: selection.name, startedAt: now, durationMs: selection.durationMs };
                }
            }

            for (const id of Array.from(states.keys())) {
                if (!seen.has(id)) states.delete(id);
            }
        },

        get(id) {
            return states.get(id);
        },

        clear() {
            states.clear();
        },
    };
}
