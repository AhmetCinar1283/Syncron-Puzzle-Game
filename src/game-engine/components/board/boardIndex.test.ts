// Tahta arama indeksi testleri.
//
// Bu indeks, GameBoard'un hücre başına `entities.find/filter` taramalarının
// yerine geçti. Semantiğin birebir korunması şart: `find` İLK eşleşeni
// döndürürdü, `filter` ise ölü oyuncuları eliyordu.

import { describe, it, expect } from 'vitest';
import { buildBoardIndex, cellKey, isCellVisible, playersIn, playersSignature } from './boardIndex';
import { Entity } from '../../logic/entityTypes';
import { RoomState } from '../../logic/types';

function mkEntity(id: number, type: string, row: number, col: number, extra: Record<string, unknown> = {}, roomId = 'main'): Entity {
    return {
        id,
        type,
        position: { row, col, roomId },
        physics: { direction: 'right', force: 0, z: 0 },
        def: { mass: 1, resistance: 1, isSolid: true },
        traits: new Set(),
        isElectrified: false,
        customData: extra,
    } as unknown as Entity;
}

function mkRoom(extra: Partial<RoomState> = {}): RoomState {
    return {
        id: 'main', name: 'Main', width: 3, height: 3, x: 0, y: 0,
        edges: { top: { type: 'wall' }, bottom: { type: 'wall' }, left: { type: 'wall' }, right: { type: 'wall' } },
        grid: [],
        ...extra,
    } as RoomState;
}

describe('buildBoardIndex', () => {
    it('hücre aramasında ilk varlığı korur (eski `find` semantiği)', () => {
        const first = mkEntity(1, 'box', 1, 1);
        const second = mkEntity(2, 'player', 1, 1, { playerIndex: 0 });
        const index = buildBoardIndex([first, second]);

        expect(index.entityAt.get(cellKey('main', 1, 1))).toBe(first);
    });

    it('roomId yoksa "main" varsayar', () => {
        const entity = mkEntity(1, 'box', 0, 2);
        delete (entity.position as { roomId?: string }).roomId;
        const index = buildBoardIndex([entity]);

        expect(index.entityAt.get(cellKey('main', 0, 2))).toBe(entity);
    });

    it('yalnızca yaşayan oyuncuları odaya göre toplar', () => {
        const alive = mkEntity(1, 'player', 0, 0, { playerIndex: 0 });
        const dead = mkEntity(2, 'player', 0, 1, { playerIndex: 1, _destroyed: true });
        const box = mkEntity(3, 'box', 0, 2);
        const other = mkEntity(4, 'player', 0, 0, { playerIndex: 2 }, 'second');
        const index = buildBoardIndex([alive, dead, box, other]);

        expect(playersIn(index, 'main')).toEqual([alive]);
        expect(playersIn(index, 'second')).toEqual([other]);
        expect(playersIn(index, 'yok')).toEqual([]);
    });

    it('oyuncuyu playerIndex ile bulur, ölüyü atlar', () => {
        const alive = mkEntity(1, 'player', 0, 0, { playerIndex: 0 });
        const dead = mkEntity(2, 'player', 2, 2, { playerIndex: 1, _destroyed: true });
        const index = buildBoardIndex([alive, dead]);

        expect(index.playerByIndex.get(0)).toBe(alive);
        expect(index.playerByIndex.get(1)).toBeUndefined();
    });

    it('id ile arama sağlar (önceki karedeki hali için)', () => {
        const entity = mkEntity(7, 'box', 1, 0);
        expect(buildBoardIndex([entity]).byId.get(7)).toBe(entity);
    });
});

describe('isCellVisible', () => {
    it('sis kapalıysa her hücre görünür', () => {
        expect(isCellVisible(mkRoom(), [], 5, 5)).toBe(true);
    });

    it('sis açıkken oyuncusuz oda tamamen karanlıktır', () => {
        expect(isCellVisible(mkRoom({ fogOfWar: true }), [], 0, 0)).toBe(false);
    });

    it('karekökle aynı sonucu verir (yarıçap sınırı dahil)', () => {
        const room = mkRoom({ fogOfWar: true, fogVisibilityDistance: 1.5 });
        const player = mkEntity(1, 'player', 2, 2, { playerIndex: 0 });

        // Çapraz komşu: mesafe ~1.414 <= 1.5 -> görünür
        expect(isCellVisible(room, [player], 1, 1)).toBe(true);
        // İki hücre ötesi: mesafe 2 > 1.5 -> görünmez
        expect(isCellVisible(room, [player], 2, 0)).toBe(false);
    });
});

describe('playersSignature', () => {
    it('oyuncu kıpırdamadıkça aynı kalır', () => {
        const a = [mkEntity(1, 'player', 1, 1, { playerIndex: 0 }), mkEntity(2, 'box', 0, 0)];
        const b = [mkEntity(1, 'player', 1, 1, { playerIndex: 0 }), mkEntity(2, 'box', 2, 2)];

        // Kutu yer değiştirdi ama oyuncu aynı — iz/kablo katmanı yeniden çizilmemeli.
        expect(playersSignature(a)).toBe(playersSignature(b));
    });

    it('oyuncu hareket edince değişir', () => {
        const before = [mkEntity(1, 'player', 1, 1, { playerIndex: 0 })];
        const after = [mkEntity(1, 'player', 1, 2, { playerIndex: 0 })];

        expect(playersSignature(before)).not.toBe(playersSignature(after));
    });

    it('oyuncu ölünce değişir', () => {
        const before = [mkEntity(1, 'player', 1, 1, { playerIndex: 0 })];
        const after = [mkEntity(1, 'player', 1, 1, { playerIndex: 0, _destroyed: true })];

        expect(playersSignature(before)).not.toBe(playersSignature(after));
    });
});
