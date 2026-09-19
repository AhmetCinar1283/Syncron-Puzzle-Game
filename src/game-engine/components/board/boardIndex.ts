/**
 * DOSYA AMACI: Bir TickSnapshot için kare başına bir kez kurulan arama indeksi.
 *
 * NEDEN: GameBoard her hücre için `snapshot.entities.find(...)` ve ayrıca
 * `snapshot.entities.filter(...)` çağırıyordu. 10x10'luk bir bölümde bu, kare
 * başına 100 x (find + filter) demek — üstelik `filter` her hücrede yeni bir
 * dizi ayırıyordu. Trail ve cable katmanları aynı taramayı bir kez daha
 * yapıyordu. Düşük performanslı cihazlarda kare süresinin büyük kısmı buydu.
 *
 * Bunun yerine tur başına (aslında kare başına) tek geçişte indeks kurulur;
 * hücre başına maliyet O(1) Map araması olur.
 */

import { Entity } from '../../logic/entityTypes';
import { RoomState } from '../../logic/types';

export interface BoardIndex {
    /** `roomId:row:col` -> o hücredeki ilk varlık (eski `find` semantiği). */
    entityAt: Map<string, Entity>;
    /** `roomId` -> o odadaki yaşayan oyuncular. */
    playersByRoom: Map<string, Entity[]>;
    /** `playerIndex` -> yaşayan oyuncu (iz/trail çizimi için). */
    playerByIndex: Map<number, Entity>;
    /** Varlık id -> varlık (önceki karedeki halini bulmak için). */
    byId: Map<Entity['id'], Entity>;
}

const EMPTY_PLAYERS: Entity[] = [];

export function cellKey(roomId: string, row: number, col: number): string {
    return `${roomId}:${row}:${col}`;
}

export function buildBoardIndex(entities: Entity[]): BoardIndex {
    const entityAt = new Map<string, Entity>();
    const playersByRoom = new Map<string, Entity[]>();
    const playerByIndex = new Map<number, Entity>();
    const byId = new Map<Entity['id'], Entity>();

    for (const entity of entities) {
        byId.set(entity.id, entity);
        const roomId = entity.position.roomId ?? 'main';
        const key = cellKey(roomId, entity.position.row, entity.position.col);
        // `find` ilk eşleşeni döndürürdü; aynı hücrede birden fazla varlık
        // varsa ilkini korumak için üzerine yazmıyoruz.
        if (!entityAt.has(key)) entityAt.set(key, entity);

        if (entity.type !== 'player' || entity.customData._destroyed) continue;

        const list = playersByRoom.get(roomId);
        if (list) list.push(entity);
        else playersByRoom.set(roomId, [entity]);

        const index = entity.customData.playerIndex as number | undefined;
        if (index !== undefined && !playerByIndex.has(index)) playerByIndex.set(index, entity);
    }

    return { entityAt, playersByRoom, playerByIndex, byId };
}

export function playersIn(index: BoardIndex, roomId: string): Entity[] {
    return index.playersByRoom.get(roomId) ?? EMPTY_PLAYERS;
}

/**
 * Hücre sisin altında mı? Eski kod `Math.sqrt(...) <= d` kullanıyordu; karekök
 * hücre başına gereksiz. Kareli mesafeyi kareli eşikle karşılaştırmak aynı
 * sonucu verir.
 */
export function isCellVisible(room: RoomState, players: Entity[], row: number, col: number): boolean {
    if (!room.fogOfWar) return true;
    const limit = room.fogVisibilityDistance ?? 1.5;
    const limitSq = limit * limit;
    for (const player of players) {
        const dr = row - player.position.row;
        const dc = col - player.position.col;
        if (dr * dr + dc * dc <= limitSq) return true;
    }
    return false;
}

/**
 * Oyuncu konumlarının ucuz bir imzası. Trail/cable katmanlarının `React.memo`
 * karşılaştırıcısı bunu kullanır: oyuncular kıpırdamadıysa katman hiç yeniden
 * çizilmez (varlık nesneleri her tick klonlandığı için referans kıyası işe
 * yaramaz).
 */
export function playersSignature(entities: Entity[]): string {
    let sig = '';
    for (const entity of entities) {
        if (entity.type !== 'player' || entity.customData._destroyed) continue;
        sig += `${entity.customData.playerIndex ?? '?'}:${entity.position.roomId ?? 'main'}:${entity.position.row}:${entity.position.col}|`;
    }
    return sig;
}
