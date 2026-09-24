/**
 * DOSYA AMACI: `cells/activity.ts`'in DOM çizicilerindeki React state +
 * `setTimeout` davranışını birebir yeniden ürettiğini kanıtlamak — tetikleme
 * koşulları, süreler ve "yerinde duran varlık zamanlayıcıyı TAZELEMEZ" kuralı.
 *
 * Saf mantık; canvas/`document` gerekmez (00-ilkeler §6.1).
 */

import { describe, expect, it } from 'vitest';
import type { Cell, CellTypes } from '../../logic/cellTypes';
import type { Entity } from '../../logic/entityTypes';
import type { BoardScene } from '../types';
import { cellKey } from '../../components/board/boardIndex';
import {
    CONVEYOR_ACTIVE_MS,
    TELEPORT_ACTIVE_MS,
    TRAMPOLINE_ACTIVE_MS,
    createActivityTracker,
} from './activity';

const ROOM = 'main';

function makeCell(type: CellTypes, col: number, isElectrified = false): Cell {
    return {
        id: `${type}-${col}`,
        type,
        position: { row: 0, col },
        def: { friction: 1, isWalkable: true },
        isElectrified,
        customData: {},
    };
}

function makeEntity(id: string, col: number): Entity {
    return { id, position: { roomId: ROOM, row: 0, col } } as unknown as Entity;
}

/** Tek odalı, tek satırlı sahne. `forEachCell` dışındaki alanlar okunmuyor. */
function makeScene(cells: Cell[], entities: Entity[], prevEntities: Entity[] | null): BoardScene {
    return {
        rooms: { [ROOM]: { id: ROOM, grid: [cells] } },
        entities,
        prevEntities,
        roomPositions: {},
        totalWidth: 0,
        totalHeight: 0,
        theme: 'neon',
        ambientMode: 'on',
        frameMs: 60,
        tickStartedAt: 0,
    } as unknown as BoardScene;
}

const keyAt = (col: number) => cellKey(ROOM, 0, col);

describe('createActivityTracker — tetikleyiciler', () => {
    it('teleport: varlık GELİNCE ve GİDİNCE 600 ms etkin olur', () => {
        const cells = [makeCell('teleport', 0)];
        const tracker = createActivityTracker();
        const entity = makeEntity('e1', 0);

        expect(tracker.update(makeScene(cells, [entity], null), 0)).toBe(true);
        expect(tracker.isActive(keyAt(0))).toBe(true);
        expect(tracker.nextExpiry()).toBe(TELEPORT_ACTIVE_MS);

        // Süre dolunca söner.
        expect(tracker.expire(TELEPORT_ACTIVE_MS)).toBe(true);
        expect(tracker.isActive(keyAt(0))).toBe(false);

        // Ayrılış da tetikler.
        tracker.update(makeScene(cells, [], [entity]), 1000);
        expect(tracker.isActive(keyAt(0))).toBe(true);
    });

    it('trambolin: yalnızca varlık GELİNCE tetiklenir, gidince tetiklenmez', () => {
        const cells = [makeCell('trampoline', 0)];
        const tracker = createActivityTracker();
        const entity = makeEntity('e1', 0);

        tracker.update(makeScene(cells, [entity], null), 0);
        expect(tracker.nextExpiry()).toBe(TRAMPOLINE_ACTIVE_MS);
        tracker.expire(TRAMPOLINE_ACTIVE_MS);

        tracker.update(makeScene(cells, [], [entity]), 1000);
        expect(tracker.isActive(keyAt(0))).toBe(false);
    });

    it('konveyör: yalnızca ELEKTRİKLİYKEN tetiklenir', () => {
        const entity = makeEntity('e1', 0);
        const off = createActivityTracker();
        off.update(makeScene([makeCell('conveyor', 0, false)], [entity], null), 0);
        expect(off.isActive(keyAt(0))).toBe(false);

        const on = createActivityTracker();
        on.update(makeScene([makeCell('conveyor', 0, true)], [entity], null), 0);
        expect(on.isActive(keyAt(0))).toBe(true);
        expect(on.nextExpiry()).toBe(CONVEYOR_ACTIVE_MS);
    });

    it('geçici hâli olmayan tipler hiç etkin olmaz', () => {
        const tracker = createActivityTracker();
        const cells = [makeCell('ice', 0), makeCell('power', 1), makeCell('target', 2)];
        const entities = [makeEntity('a', 0), makeEntity('b', 1), makeEntity('c', 2)];
        expect(tracker.update(makeScene(cells, entities, null), 0)).toBe(false);
        expect(tracker.nextExpiry()).toBeNull();
    });
});

describe('createActivityTracker — tazeleme kuralı', () => {
    it('YERİNDE DURAN varlık zamanlayıcıyı tazelemez (DOM useEffect bağımlılığı)', () => {
        const cells = [makeCell('trampoline', 0)];
        const tracker = createActivityTracker();
        const entity = makeEntity('e1', 0);

        tracker.update(makeScene(cells, [entity], null), 0);
        expect(tracker.nextExpiry()).toBe(TRAMPOLINE_ACTIVE_MS);

        // Aynı varlık aynı hücrede: imza değişmedi → bitiş damgası ileri kaymaz.
        tracker.update(makeScene(cells, [entity], null), 200);
        expect(tracker.nextExpiry()).toBe(TRAMPOLINE_ACTIVE_MS);
    });

    it('BAŞKA bir varlık gelirse yeniden tetiklenir', () => {
        const cells = [makeCell('trampoline', 0)];
        const tracker = createActivityTracker();

        tracker.update(makeScene(cells, [makeEntity('e1', 0)], null), 0);
        tracker.update(makeScene(cells, [makeEntity('e2', 0)], null), 200);
        expect(tracker.nextExpiry()).toBe(200 + TRAMPOLINE_ACTIVE_MS);
    });
});

describe('createActivityTracker — süre yönetimi', () => {
    it('expire yalnızca gerçekten bir şey söndüğünde true döner', () => {
        const tracker = createActivityTracker();
        tracker.update(makeScene([makeCell('teleport', 0)], [makeEntity('e1', 0)], null), 0);

        expect(tracker.expire(TELEPORT_ACTIVE_MS - 1)).toBe(false);
        expect(tracker.expire(TELEPORT_ACTIVE_MS)).toBe(true);
        expect(tracker.expire(TELEPORT_ACTIVE_MS)).toBe(false);
    });

    it('nextExpiry en YAKIN bitişi verir', () => {
        const tracker = createActivityTracker();
        const cells = [makeCell('conveyor', 0, true), makeCell('trampoline', 1)];
        tracker.update(makeScene(cells, [makeEntity('a', 0), makeEntity('b', 1)], null), 0);
        // 800 ms ve 500 ms → 500.
        expect(tracker.nextExpiry()).toBe(TRAMPOLINE_ACTIVE_MS);
    });

    it('clear her şeyi sıfırlar ve aynı varlık yeniden tetikleyebilir', () => {
        const cells = [makeCell('teleport', 0)];
        const tracker = createActivityTracker();
        const entity = makeEntity('e1', 0);

        tracker.update(makeScene(cells, [entity], null), 0);
        tracker.clear();
        expect(tracker.isActive(keyAt(0))).toBe(false);
        expect(tracker.nextExpiry()).toBeNull();

        tracker.update(makeScene(cells, [entity], null), 100);
        expect(tracker.isActive(keyAt(0))).toBe(true);
    });
});

describe('createActivityTracker — hedef sevinci', () => {
    const target = (playerIndex = 0): Cell => ({ ...makeCell('target', 2), customData: { playerIndex } });
    const lockedPlayer = (col: number, locked: boolean) =>
        ({ id: 1, type: 'player', position: { roomId: ROOM, row: 0, col }, customData: { isLocked: locked } }) as unknown as Entity;

    it('tick içinde oyuncu hedefe KİLİTLENİNCE 900 ms sevinir', () => {
        const t = createActivityTracker();
        const before = makeScene([target()], [lockedPlayer(1, false)], [lockedPlayer(1, false)]);
        t.update(before, 0);
        const after = makeScene([target()], [lockedPlayer(2, true)], [lockedPlayer(1, false)]);
        expect(t.update(after, 100)).toBe(true);
        expect(t.isActive(keyAt(2))).toBe(true);
        expect(t.expire(999)).toBe(false);
        expect(t.expire(1000)).toBe(true);
    });

    it('filmin ilk karesinde (prevEntities yok) zaten kilitli oyuncu sevindirmez', () => {
        const t = createActivityTracker();
        t.update(makeScene([target()], [lockedPlayer(2, true)], null), 0);
        expect(t.isActive(keyAt(2))).toBe(false);
    });

    it('kilitlenmeden hedefe uğrayan sevindirmez', () => {
        const t = createActivityTracker();
        t.update(makeScene([target()], [lockedPlayer(2, false)], [lockedPlayer(1, false)]), 0);
        expect(t.isActive(keyAt(2))).toBe(false);
    });
});
