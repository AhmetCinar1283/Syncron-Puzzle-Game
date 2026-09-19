// Hücre tetiklenmesi regresyon testleri.
//
// Kural: bir nesne (player, box, ileride eklenecek diğer entity'ler) bir kareye
// nasıl geldiğinden bağımsız olarak — normal adım, itilme, kenar portalından
// sarmalama, teleport çıkışı, trambolinden iniş — vardığı karenin davranışı
// tetiklenmeli ve nesnenin fiziği (yön + force) o davranışa doğru girdi olmalı.

import { describe, it, expect } from 'vitest';
import { processSingleTick } from './intentLoop';
import { CELL_DEFS } from '../cells/registry';
import { Cell, CellTypes } from '../cellTypes';
import { Entity } from '../entityTypes';
import { RoomState, ActionIntent, EdgeConfig } from '../types';
import { LevelBounds } from './getNextTopologyPosition';

const N: CellTypes = 'normal';
const I: CellTypes = 'ice';
const FORBIDDEN: CellTypes = 'forbidden';
const PORTAL: EdgeConfig = { type: 'portal' };

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
    };
}

function mkEntity(type: 'player' | 'box', id: number, row: number, col: number): Entity {
    return {
        id, type,
        position: { row, col, roomId: 'main' },
        physics: { direction: 'right', force: 0, z: 0 },
        def: { mass: 1, resistance: 1, isSolid: true },
        traits: new Set(type === 'player' ? ['player_controlled'] : ['pushable']),
        isElectrified: false,
        customData: type === 'player' ? { playerIndex: 0 } : {},
    };
}

function boundsOf(room: RoomState): LevelBounds {
    return { rooms: { main: { rows: room.height, cols: room.width, edges: room.edges } } };
}

/** Bir turu (tüm fizik sönümlenene kadar) oynatır — useGameEngine'in döngüsünün aynısı. */
function playTurn(entities: Entity[], room: RoomState, intents: ActionIntent[], maxTicks = 30) {
    const rooms = { main: room };
    const bounds = boundsOf(room);
    let live = entities;
    let pending = intents;
    for (let t = 0; t < maxTicks; t++) {
        const active = live.some(
            e => !e.customData._destroyed && (e.physics.force > 0 || e.physics.z > 0),
        );
        if (pending.length === 0 && !active) break;
        pending = processSingleTick(live, rooms, pending, bounds).pendingNextTick;
        live = live.filter(e => !e.customData._destroyed); // useGameEngine ile aynı
    }
}

const step = (id: number, direction: 'up' | 'down' | 'left' | 'right'): ActionIntent[] =>
    [{ entityId: id, type: 'mutate_entity', newDirection: direction, newForce: 1 }];

describe('buz — itilen nesne de kayar', () => {
    it('itilen kutu buzda engel görene kadar kayar', () => {
        const room = mkRoom([[N, N, I, I, I, N]]);
        const player = mkEntity('player', 1, 0, 0);
        const box = mkEntity('box', 2, 0, 1);

        playTurn([player, box], room, step(1, 'right'));

        // 1,2,3,4 buzdan kayar; 5 normal zemin olduğu için orada durur
        expect(box.position.col).toBe(5);
        expect(box.physics.force).toBe(0);
        expect(player.position.col).toBe(1);
    });

    it('itilen kutu buzun ucundaki duvara çarpıp durur', () => {
        const room = mkRoom([[N, N, I, I, I, I]]);
        const player = mkEntity('player', 1, 0, 0);
        const box = mkEntity('box', 2, 0, 1);

        playTurn([player, box], room, step(1, 'right'));

        expect(box.position.col).toBe(5);
        expect(box.physics.force).toBe(0);
    });
});

describe('kenar portalı — çıkılan hücre tetiklenir', () => {
    it('kutu kenar portalından geçtikten sonra buzda kaymaya devam eder', () => {
        // Sol kenardan çıkıp sağ kenardan girer; giriş karesi buz.
        const room = mkRoom([[N, N, N, N, I, I]], { left: PORTAL, right: PORTAL });
        const player = mkEntity('player', 1, 0, 1);
        const box = mkEntity('box', 2, 0, 0);

        playTurn([player, box], room, step(1, 'left'));

        // box: 0 -> (portal) 5 -> 4 (buz) -> 3 (normal, durur)
        expect(box.position.col).toBe(3);
        expect(box.physics.direction).toBe('left'); // itiş yönünü devraldı
        expect(box.physics.force).toBe(0);
    });

    it('kutu kenar portalından konveyöre çıkarsa fırlatılır', () => {
        const room = mkRoom([[N, N, N, N, N, 'conveyor']], { left: PORTAL, right: PORTAL });
        room.grid[0][5].customData.direction = 'left';
        const player = mkEntity('player', 1, 0, 1);
        const box = mkEntity('box', 2, 0, 0);

        playTurn([player, box], room, step(1, 'left'));

        // konveyör force 3 verir: 5 -> 4 -> 3 -> 2
        expect(box.position.col).toBe(2);
    });

    it('oyuncu kenar portalından trambolinin üstüne çıkarsa zıplatılır', () => {
        const room = mkRoom([[N, N, N, N, N, 'trampoline']], { left: PORTAL, right: PORTAL });
        room.grid[0][5].customData.direction = 'left';
        room.grid[0][5].customData.force = 3;
        const player = mkEntity('player', 1, 0, 0);

        playTurn([player], room, step(1, 'left'));

        expect(player.position.col).toBe(2);
        expect(player.physics.z).toBe(0);
    });

    it('oyuncu kenar portalından ışınlayıcıya çıkarsa ışınlanır', () => {
        const room = mkRoom([[N, 'teleport', N, N, N, 'teleport']], { left: PORTAL, right: PORTAL });
        room.grid[0][5].customData.targetPos = { row: 0, col: 1, roomId: 'main' };
        const player = mkEntity('player', 1, 0, 0);

        playTurn([player], room, step(1, 'left'));

        // 0 -> (portal) 5 -> (teleport) 1 -> 0 (hız korunur, bir kare daha)
        expect(player.position.col).toBe(0);
    });
});

describe('ışınlayıcı — hız korunur', () => {
    it('ışınlanan kutu çıkıştaki buzda kaymaya devam eder', () => {
        const room = mkRoom([[N, N, 'teleport', N, 'teleport', I, I, N]]);
        room.grid[0][2].customData.targetPos = { row: 0, col: 4, roomId: 'main' };
        const player = mkEntity('player', 1, 0, 0);
        const box = mkEntity('box', 2, 0, 1);

        playTurn([player, box], room, step(1, 'right'));

        // 1 -> 2 (giriş) -> 4 (çıkış) -> 5,6 buz -> 7 normal, durur
        expect(box.position.col).toBe(7);
        expect(box.physics.force).toBe(0);
    });
});

describe('trambolinden iniş', () => {
    it('sürtünmeli zemine inen nesne durur', () => {
        const room = mkRoom([['trampoline', N, N, N, N, N]]);
        room.grid[0][0].customData.direction = 'right';
        room.grid[0][0].customData.force = 3;
        const player = mkEntity('player', 1, 0, 1);

        playTurn([player], room, step(1, 'left'));

        expect(player.position.col).toBe(3);
        expect(player.physics.force).toBe(0);
    });

    it('buza inen nesne kaymaya devam eder', () => {
        const room = mkRoom([['trampoline', N, N, I, I, N]]);
        room.grid[0][0].customData.direction = 'right';
        room.grid[0][0].customData.force = 3;
        const player = mkEntity('player', 1, 0, 1);

        playTurn([player], room, step(1, 'left'));

        // 3'e iner (buz), 4 buz, 5 normal zeminde durur
        expect(player.position.col).toBe(5);
        expect(player.physics.force).toBe(0);
    });

    // Uçuşun menzili z ile harcanır; iniş anındaki force bayat bir değerdir.
    // Tek bir buz karesi, trambolinin gücü kadar ekstra adım kazandırmamalı.
    it('tek buz karesine inen oyuncu sadece bir kare kayar', () => {
        const room = mkRoom([[N, 'trampoline', N, N, I, N, N, N, N]]);
        room.grid[0][1].customData.direction = 'right';
        room.grid[0][1].customData.force = 3;
        const player = mkEntity('player', 1, 0, 0);

        playTurn([player], room, step(1, 'right'));

        // 4'e iner (buz) → 5'e kayar (normal) → durur. 6/7'ye ilerlemez.
        expect(player.position.col).toBe(5);
        expect(player.physics.force).toBe(0);
    });

    it('tek buz karesine inen kutu sadece bir kare kayar', () => {
        const room = mkRoom([[N, N, 'trampoline', N, N, I, N, N, N]]);
        room.grid[0][2].customData.direction = 'right';
        room.grid[0][2].customData.force = 3;
        const player = mkEntity('player', 1, 0, 0);
        const box = mkEntity('box', 2, 0, 1);

        playTurn([player, box], room, step(1, 'right'));

        expect(box.position.col).toBe(6);
        expect(box.physics.force).toBe(0);
    });

    it('buz uzunluğu kadar kayar, ilk sürtünmeli karede durur', () => {
        const room = mkRoom([[N, 'trampoline', N, N, I, I, N, N, N]]);
        room.grid[0][1].customData.direction = 'right';
        room.grid[0][1].customData.force = 3;
        const player = mkEntity('player', 1, 0, 0);

        playTurn([player], room, step(1, 'right'));

        // 4 (buz) → 5 (buz) → 6 (normal) → durur
        expect(player.position.col).toBe(6);
        expect(player.physics.force).toBe(0);
    });
});

describe('konveyör fırlatması — buz menzili kısaltmaz', () => {
    it('konveyör force 3 + tek buz karesi = 4 kare', () => {
        const room = mkRoom([[N, 'conveyor', I, N, N, N, N, N]]);
        room.grid[0][1].customData.direction = 'right';
        const player = mkEntity('player', 1, 0, 0);

        playTurn([player], room, step(1, 'right'));

        // Buz karesi adım harcatmaz: 2(buz),3,4,5 → 5'te durur
        expect(player.position.col).toBe(5);
    });

    it('konveyör force 3, buzsuz = 3 kare', () => {
        const room = mkRoom([[N, 'conveyor', N, N, N, N, N, N]]);
        room.grid[0][1].customData.direction = 'right';
        const player = mkEntity('player', 1, 0, 0);

        playTurn([player], room, step(1, 'right'));

        expect(player.position.col).toBe(4);
    });
});

// Yasaklı hücre nesneyi hücrenin üstünde yok etmeli. Yok etme bir tick
// gecikirse nesne ölmeden önce bir kare daha ilerler ve arkasındakini iter.
describe('yasaklı hücre — kaymadan, girdiği karede yok eder', () => {
    it('buzda kayan oyuncu yasaklı karenin üstünde ölür', () => {
        const room = mkRoom([[N, I, I, FORBIDDEN, N, N, N]]);
        const player = mkEntity('player', 1, 0, 0);

        playTurn([player], room, step(1, 'right'));

        expect(player.position.col).toBe(3);
        expect(player.customData._destroyed).toBe(true);
        expect(player.customData.deathReason).toBe('forbidden');
    });

    it('doğrudan adım atan oyuncu yasaklı karenin üstünde ölür', () => {
        const room = mkRoom([[N, FORBIDDEN, N, N]]);
        const player = mkEntity('player', 1, 0, 0);

        playTurn([player], room, step(1, 'right'));

        expect(player.position.col).toBe(1);
        expect(player.customData._destroyed).toBe(true);
    });

    it('itilen kutu yasaklı karenin üstünde yok olur', () => {
        const room = mkRoom([[N, N, FORBIDDEN, N, N]]);
        const player = mkEntity('player', 1, 0, 0);
        const box = mkEntity('box', 2, 0, 1);

        playTurn([player, box], room, step(1, 'right'));

        expect(box.position.col).toBe(2);
        expect(box.customData._destroyed).toBe(true);
    });

    it('yasaklı karede yok olan kutu arkasındaki kutuyu itmez', () => {
        const room = mkRoom([[N, I, I, FORBIDDEN, N, N, N]]);
        const player = mkEntity('player', 1, 0, 0);
        const box = mkEntity('box', 2, 0, 1);
        const boxBehind = mkEntity('box', 3, 0, 4); // yasaklı karenin arkasında

        playTurn([player, box, boxBehind], room, step(1, 'right'));

        expect(box.position.col).toBe(3);
        expect(box.customData._destroyed).toBe(true);
        expect(boxBehind.position.col).toBe(4); // yerinden oynamadı
        expect(boxBehind.customData._destroyed).toBeUndefined();
    });

    it('konveyörün fırlattığı oyuncu yasaklı karenin üstünde ölür', () => {
        const room = mkRoom([[N, 'conveyor', N, FORBIDDEN, N, N, N]]);
        room.grid[0][1].customData.direction = 'right';
        const player = mkEntity('player', 1, 0, 0);

        playTurn([player], room, step(1, 'right'));

        expect(player.position.col).toBe(3);
        expect(player.customData._destroyed).toBe(true);
    });

    it('trambolinle yasaklı karelerin üstünden uçan nesne ölmez', () => {
        const room = mkRoom([[N, 'trampoline', FORBIDDEN, FORBIDDEN, N, N, N]]);
        room.grid[0][1].customData.direction = 'right';
        room.grid[0][1].customData.force = 3;
        const player = mkEntity('player', 1, 0, 0);

        playTurn([player], room, step(1, 'right'));

        expect(player.position.col).toBe(4);
        expect(player.customData._destroyed).toBeUndefined();
    });
});
