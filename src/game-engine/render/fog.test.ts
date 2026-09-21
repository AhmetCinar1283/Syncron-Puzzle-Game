/**
 * DOSYA AMACI: Sis mantığının saf parçalarını kilitlemek — hücre seviyeleri
 * (`BoardCell`/`RoomOverlays` kuralı), 0.3s geçişin uçları ve `fogKeepRevealed`
 * farkı, varlık opaklığı, geçişsiz ilk kare ve `dim` anahtarı.
 * Tuvale çizim testi yok (00-ilkeler §6.1).
 */

import { describe, expect, it } from 'vitest';
import type { BoardScene } from './types';
import { FOG_TRANSITION_MS, computeFogLevels, createFogTracker } from './fog';
import { dimVariantOf } from './cells/dim';
import { normalCellSprite } from './cells/normal';
import type { CellPaintInput } from './types';

interface RoomOpts { fogOfWar?: boolean; keepRevealed?: boolean; distance?: number; explored?: boolean[] }

/** 1 satırlık, `explored.length` sütunlu oda. */
function makeRoom(id: string, opts: RoomOpts = {}) {
    const width = opts.explored?.length ?? 5;
    return {
        id,
        name: id,
        width,
        fogOfWar: opts.fogOfWar ?? true,
        fogKeepRevealed: opts.keepRevealed,
        fogVisibilityDistance: opts.distance ?? 1,
        grid: [Array.from({ length: width }, (_, col) => ({
            id: `${id}-${col}`,
            type: 'normal',
            position: { row: 0, col },
            customData: { explored: opts.explored ? opts.explored[col] : true },
        }))],
    };
}

function player(col: number, roomId = 'main') {
    return {
        id: 1,
        type: 'player',
        position: { roomId, row: 0, col },
        customData: { playerIndex: 0 },
    };
}

function makeScene(rooms: ReturnType<typeof makeRoom>[], entities: ReturnType<typeof player>[], prev: unknown[] | null = []): BoardScene {
    return {
        rooms: Object.fromEntries(rooms.map(r => [r.id, r])),
        entities,
        prevEntities: prev,
    } as unknown as BoardScene;
}

describe('computeFogLevels', () => {
    it('görünür = 2, keşfedilmiş ama uzak = 1, keşfedilmemiş = 0', () => {
        const room = makeRoom('main', { explored: [true, true, true, false, false] });
        const levels = computeFogLevels(makeScene([room], [player(0)]));
        expect(levels.get('main:0:0')).toBe(2);
        expect(levels.get('main:0:1')).toBe(2);   // mesafe 1 ≤ 1
        expect(levels.get('main:0:2')).toBe(1);   // uzak ama keşfedilmiş
        expect(levels.get('main:0:3')).toBe(0);
    });

    it('fogKeepRevealed: false → keşfedilmiş bayrağı yok sayılır, uzak hücre 0 olur', () => {
        const room = makeRoom('main', { keepRevealed: false, explored: [true, true, true, true, true] });
        const levels = computeFogLevels(makeScene([room], [player(0)]));
        expect(levels.get('main:0:1')).toBe(2);
        expect(levels.get('main:0:2')).toBe(0);
        expect([...levels.values()]).not.toContain(1);
    });

    it('sissiz oda haritaya hiç girmez', () => {
        const room = makeRoom('main', { fogOfWar: false });
        expect(computeFogLevels(makeScene([room], [player(0)])).size).toBe(0);
    });

    it('görünürlük yalnızca kendi odasının oyuncularına bakar', () => {
        const a = makeRoom('a', { explored: [true, true, true] });
        const b = makeRoom('b', { explored: [true, true, true] });
        const levels = computeFogLevels(makeScene([a, b], [player(0, 'a')]));
        expect(levels.get('a:0:0')).toBe(2);
        expect(levels.get('b:0:0')).toBe(1);
    });
});

describe('createFogTracker', () => {
    const room = makeRoom('main', { explored: [true, true, true, true, true] });
    const at0 = makeScene([room], [player(0)]);
    const at4 = makeScene([room], [player(4)]);

    it('sis yokken frame() null döner ve sürüm artmaz', () => {
        const tracker = createFogTracker();
        expect(tracker.update(makeScene([makeRoom('main', { fogOfWar: false })], [player(0)]), 0)).toBe(false);
        expect(tracker.frame(0)).toBeNull();
        expect(tracker.revision()).toBe(0);
    });

    it('ilk kare (prevEntities === null) geçişsiz yazılır', () => {
        const tracker = createFogTracker();
        tracker.update(makeScene([room], [player(0)], null), 100);
        const frame = tracker.frame(100)!;
        expect(frame.transitioning).toBe(false);
        expect(frame.lit('main:0:0')).toBe(1);
        expect(frame.lit('main:0:4')).toBe(0);
    });

    it('seviyeler değişmediyse false döner ve sürüm artmaz', () => {
        const tracker = createFogTracker();
        tracker.update(at0, 0);
        const rev = tracker.revision();
        expect(tracker.update({ ...at0 }, 50)).toBe(false);
        expect(tracker.revision()).toBe(rev);
    });

    it('görünürlük değişince geçiş 300ms sürer: başta eski, sonda yeni değer', () => {
        const tracker = createFogTracker();
        tracker.update(makeScene([room], [player(0)], null), 0);
        expect(tracker.update(at4, 1000)).toBe(true);

        const start = tracker.frame(1000)!;
        expect(start.transitioning).toBe(true);
        expect(start.lit('main:0:0')).toBeCloseTo(1, 5);   // 2 → 1: eskiden görünürdü
        expect(start.lit('main:0:4')).toBeCloseTo(0, 5);   // 1 → 2: eskiden karartılmıştı

        const mid = tracker.frame(1000 + FOG_TRANSITION_MS / 2)!;
        expect(mid.lit('main:0:0')).toBeGreaterThan(0);
        expect(mid.lit('main:0:0')).toBeLessThan(1);
        expect(mid.lit('main:0:4')).toBeGreaterThan(0);
        expect(mid.lit('main:0:4')).toBeLessThan(1);

        const end = tracker.frame(1000 + FOG_TRANSITION_MS)!;
        expect(end.transitioning).toBe(false);
        expect(end.lit('main:0:0')).toBe(0);
        expect(end.lit('main:0:4')).toBe(1);
    });

    it('RAF damgası başlangıçtan önce gelirse ilerleme 0\'a kenetlenir', () => {
        const tracker = createFogTracker();
        tracker.update(makeScene([room], [player(0)], null), 0);
        tracker.update(at4, 1000);
        expect(tracker.frame(990)!.lit('main:0:0')).toBeCloseTo(1, 5);
    });

    it('sürüm her seviye değişiminde artar (static sinyalinin terimi)', () => {
        const tracker = createFogTracker();
        tracker.update(at0, 0);
        const before = tracker.revision();
        tracker.update(at4, 10);
        expect(tracker.revision()).toBe(before + 1);
    });

    it('keşfedilmemiş ↔ keşfedilmiş geçişi ANLIK (DOM ağacı değişiyor)', () => {
        const hiddenRoom = makeRoom('main', { keepRevealed: false, explored: [true, true, true, true, true] });
        const tracker = createFogTracker();
        tracker.update(makeScene([hiddenRoom], [player(0)], null), 0);
        tracker.update(makeScene([hiddenRoom], [player(2)]), 1000);
        const frame = tracker.frame(1000)!;
        // (0:4 hücresi 0 → 0; 0:2 hücresi 0 → 2, anlık görünür.)
        expect(frame.explored('main:0:2')).toBe(true);
        expect(frame.lit('main:0:2')).toBe(1);
    });

    it('varlık opaklığı: oyuncu keşfedilmiş hücrede 1, kutu yalnızca görünür hücrede 1', () => {
        const tracker = createFogTracker();
        tracker.update(makeScene([room], [player(0)], null), 0);
        const frame = tracker.frame(0)!;
        expect(frame.entityAlpha('main:0:4', true)).toBe(1);    // uzak hücre, oyuncu
        expect(frame.entityAlpha('main:0:4', false)).toBe(0);   // uzak hücre, kutu
        expect(frame.entityAlpha('main:0:0', false)).toBe(1);   // yakın hücre, kutu
    });

    it('sisli olmayan hücrede (haritada yok) her şey tam görünür', () => {
        const tracker = createFogTracker();
        tracker.update(makeScene([room], [player(0)], null), 0);
        const frame = tracker.frame(0)!;
        expect(frame.explored('baska:0:0')).toBe(true);
        expect(frame.lit('baska:0:0')).toBe(1);
        expect(frame.entityAlpha('baska:0:0', false)).toBe(1);
    });

    it('clear() sürümü artırır ve sis durumunu boşaltır', () => {
        const tracker = createFogTracker();
        tracker.update(at0, 0);
        const rev = tracker.revision();
        tracker.clear();
        expect(tracker.frame(0)).toBeNull();
        expect(tracker.revision()).toBeGreaterThan(rev);
    });
});

describe('dimVariantOf', () => {
    const input = { cell: { type: 'normal' }, theme: 'legacy', isOccupied: false, isActive: false, phase: 0 } as unknown as CellPaintInput;
    const dim = dimVariantOf(normalCellSprite);

    it('anahtar temel anahtar + "|dim"; temel anahtardan farklı', () => {
        expect(dim.key(input)).toBe(`${normalCellSprite.key(input)}|dim`);
        expect(dim.key(input)).not.toBe(normalCellSprite.key(input));
    });

    it('boyut temel sprite ile aynı', () => {
        expect(dim.size(input)).toEqual(normalCellSprite.size(input));
    });

    it('aynı temel için hep aynı nesne (kare başına ayırma yok)', () => {
        expect(dimVariantOf(normalCellSprite)).toBe(dim);
    });
});
