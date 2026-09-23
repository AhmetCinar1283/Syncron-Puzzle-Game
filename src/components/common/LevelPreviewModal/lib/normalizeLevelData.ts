/**
 * DOSYA AMACI: Firestore veya IndexedDB'den gelen ham, kısmi veya string olarak
 * serileştirilmiş ızgara/oda verilerini doğrulanmış ve tip korumalı LevelData nesnesine dönüştüren saf yardımcı.
 */

import type { LevelData, CellType } from '@/game-engine/level-format';

export type LevelRoom = NonNullable<LevelData['rooms']>[number];

export type RawLevelInput = unknown;

export function normalizeLevelData(rawInput: RawLevelInput): LevelData {
  const raw = (typeof rawInput === 'object' && rawInput !== null ? rawInput : {}) as Record<string, unknown>;
  let grid: CellType[][] = [];

  if (typeof raw.grid === 'string') {
    try {
      grid = JSON.parse(raw.grid) as CellType[][];
    } catch {
      grid = [];
    }
  } else if (Array.isArray(raw.grid)) {
    grid = raw.grid as CellType[][];
  }

  let rooms: LevelRoom[] | undefined;
  if (Array.isArray(raw.rooms)) {
    rooms = raw.rooms.map((room) => {
      if (typeof room === 'object' && room !== null) {
        const r = room as Record<string, unknown>;
        let parsedRoomGrid = r.grid;
        if (typeof r.grid === 'string') {
          try {
            parsedRoomGrid = JSON.parse(r.grid);
          } catch {
            parsedRoomGrid = [];
          }
        }
        return {
          ...r,
          grid: parsedRoomGrid,
        } as unknown as LevelRoom;
      }
      return room as LevelRoom;
    });
  }

  const parsedW = typeof raw.width === 'number' && raw.width > 0
    ? raw.width
    : (grid[0]?.length ?? 5);

  const parsedH = typeof raw.height === 'number' && raw.height > 0
    ? raw.height
    : (grid.length ?? 5);

  return {
    ...raw,
    id: typeof raw.id === 'number' ? raw.id : 0,
    firestoreId: typeof raw.firestoreId === 'string'
      ? raw.firestoreId
      : (typeof raw.id === 'string' ? raw.id : undefined),
    name: typeof raw.name === 'string' ? raw.name : 'Untitled Level',
    width: parsedW,
    height: parsedH,
    grid,
    rooms: rooms && rooms.length > 0 ? rooms : undefined,
    initialObjects: Array.isArray(raw.initialObjects) ? raw.initialObjects : [],
    targets: Array.isArray(raw.targets) ? raw.targets : [],
    initialBoxes: Array.isArray(raw.initialBoxes) ? raw.initialBoxes : [],
    edges: raw.edges && typeof raw.edges === 'object'
      ? raw.edges
      : { top: 'wall', bottom: 'wall', left: 'wall', right: 'wall' },
    trailCollision: Boolean(raw.trailCollision),
    difficulty: raw.difficulty,
    creatorName: raw.creatorName,
    gameNotes: raw.gameNotes,
    creatorNotes: raw.creatorNotes,
  } as LevelData;
}
