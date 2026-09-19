// Izgara değişiklik takibi (gridRevision) regresyon testleri.
//
// Kural: `useGameEngine` bir tick'in snapshot'ı için ızgarayı YALNIZCA
// `markGridDirty()` tetiklendiğinde kopyalar; aksi halde önceki tick'in `rooms`
// nesnesini referansla paylaşır. Dolayısıyla ızgarayı değiştiren HER motor
// yolunun dirty işaretlemesi şart — işaretlenmezse oyuncu, değişikliği
// (kırılan engel, çizilen iz, elektriklenen hücre) ekranda göremez.

import { describe, it, expect } from 'vitest';
import { processSingleTick } from './intentLoop';
import { beginGridTracking, isGridDirty, markGridDirty } from './gridRevision';
import { CELL_DEFS } from '../cells/registry';
import { Cell, CellTypes } from '../cellTypes';
import { Entity } from '../entityTypes';
import { RoomState, ActionIntent, EdgeConfig } from '../types';
import { LevelBounds } from './getNextTopologyPosition';

const N: CellTypes = 'normal';

function mkCell(row: number, col: number, type: CellTypes): Cell {
    return {
        id: `c${row}_${col}`,
        type,
        position: { row, col, roomId: 'main' },
        def: CELL_DEFS[type],
        isElectrified: false,
        customData: {},
    };
}

function mkRoom(
    map: CellTypes[][],
    extra: Partial<RoomState> = {},
    edges: Partial<Record<'top' | 'bottom' | 'left' | 'right', EdgeConfig>> = {},
): RoomState {
    return {
        id: 'main', name: 'Main', width: map[0].length, height: map.length, x: 0, y: 0,
        edges: {
            top: { type: 'wall' }, bottom: { type: 'wall' },
            left: { type: 'wall' }, right: { type: 'wall' },
            ...edges,
        },
        grid: map.map((row, r) => row.map((type, c) => mkCell(r, c, type))),
        ...extra,
    };
}

function mkPlayer(id: number, row: number, col: number): Entity {
    return {
        id, type: 'player',
        position: { row, col, roomId: 'main' },
        physics: { direction: 'right', force: 0, z: 0 },
        def: { mass: 1, resistance: 1, isSolid: true },
        traits: new Set(['player_controlled']),
        isElectrified: false,
        customData: { playerIndex: 0 },
    };
}

function boundsOf(room: RoomState, trailCollision = false): LevelBounds {
    return {
        rooms: { main: { rows: room.height, cols: room.width, edges: room.edges } },
        trailCollision,
    };
}

const step = (id: number, direction: 'up' | 'down' | 'left' | 'right'): ActionIntent[] =>
    [{ entityId: id, type: 'mutate_entity', newDirection: direction, newForce: 1 }];

/** Bir turu oynatıp ızgaranın hiç değişip değişmediğini döndürür. */
function runTurnTracked(
    entities: Entity[],
    room: RoomState,
    intents: ActionIntent[],
    trailCollision = false,
    maxTicks = 30,
): boolean {
    const rooms = { main: room };
    const bounds = boundsOf(room, trailCollision);
    const mark = beginGridTracking();
    let live = entities;
    let pending = intents;
    for (let t = 0; t < maxTicks; t++) {
        const active = live.some(
            e => !e.customData._destroyed && (e.physics.force > 0 || e.physics.z > 0),
        );
        if (pending.length === 0 && !active) break;
        pending = processSingleTick(live, rooms, pending, bounds).pendingNextTick;
        live = live.filter(e => !e.customData._destroyed);
    }
    return isGridDirty(mark);
}

describe('gridRevision sayacı', () => {
    it('işaretleme olmadan temiz kalır', () => {
        const mark = beginGridTracking();
        expect(isGridDirty(mark)).toBe(false);
    });

    it('markGridDirty sonrası kirli olur', () => {
        const mark = beginGridTracking();
        markGridDirty();
        expect(isGridDirty(mark)).toBe(true);
    });

    it('her takip penceresi bağımsızdır', () => {
        const first = beginGridTracking();
        markGridDirty();
        expect(isGridDirty(first)).toBe(true);

        const second = beginGridTracking();
        expect(isGridDirty(second)).toBe(false);
    });
});

describe('motor yolları ızgara değişikliğini bildirir', () => {
    it('düz bir hamle ızgarayı değiştirmez (kopyalama atlanabilir)', () => {
        const room = mkRoom([
            [N, N, N],
            [N, N, N],
        ]);
        const player = mkPlayer(1, 0, 0);
        expect(runTurnTracked([player], room, step(1, 'right'))).toBe(false);
    });

    it('iz (trail) bırakan hamle ızgarayı kirletir', () => {
        const room = mkRoom([
            [N, N, N],
            [N, N, N],
        ]);
        const player = mkPlayer(1, 0, 0);
        const dirty = runTurnTracked([player], room, step(1, 'right'), /* trailCollision */ true);

        expect(dirty).toBe(true);
        // Gerçekten iz bırakılmış olmalı — testin kendisi boşa düşmesin.
        expect(room.grid[0][0].customData.trailPlayerIndex).toBe(0);
    });

    it('sis (fog) altında keşfedilen hücre ızgarayı kirletir', () => {
        const room = mkRoom(
            [
                [N, N, N],
                [N, N, N],
            ],
            { fogOfWar: true, fogVisibilityDistance: 1.5 },
        );
        const player = mkPlayer(1, 0, 0);
        const dirty = runTurnTracked([player], room, step(1, 'right'));

        expect(dirty).toBe(true);
        expect(room.grid[0][1].customData.explored).toBe(true);
    });
});
