/**
 * Pure helpers that turn a persisted/imported level (StoredLevel, FirestoreLevel,
 * clipboard JSON, generator output) into the editor's in-memory shapes.
 *
 * These were previously copy-pasted four times inside `useEditorState`
 * (loadForEdit / doImportLevelJson / loadFirestoreLevel / doGenerateLevel).
 * The four copies were NOT identical — e.g. the clipboard/Firestore loaders
 * never read `fogKeepRevealed` or `customData`, and the generator path never
 * JSON-parsed a legacy grid. Those differences are observable (a pasted room
 * with `fogKeepRevealed: false` loads as `true`), so instead of "fixing" them
 * silently they are preserved via explicit `RoomParseOptions` flags.
 *
 * Alternative considered: one fully-unified loader. Rejected because it would
 * change behavior of three of the four entry points (structural refactor only).
 * Adding a new level source means passing a new options object, not editing
 * this file. Missing/null fields fall back to the same defaults as before
 * (`x/y` 0, fog off, distance 1.5, keepRevealed true, empty objects -> P1 unplaced).
 *
 * Nothing here writes persisted data; the persisted LevelData shape is built
 * in `buildLevelData.ts` and must stay byte-identical (contract §4/§7).
 */
import type {
  BoxDef, CellType, ConveyorCellConfig, DeflectorCellConfig, LevelObjectDef,
  Position, TrampolineCellConfig,
} from '@/game-engine/level-format';
import type { EdgeConfig } from '@/game-engine/logic/types';
import type { BoxConfig, ObjConfig } from './editorConfig';

export type EdgeSide = 'top' | 'bottom' | 'left' | 'right';
export type EditorEdges = Record<EdgeSide, EdgeConfig>;

export interface EditorRoom {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  edges: EditorEdges;
  grid: CellType[][];
  fogOfWar?: boolean;
  fogVisibilityDistance?: number;
  fogKeepRevealed?: boolean;
  customData?: Record<string, unknown>;
}

/** Loose room shape as found in persisted data (edges may be legacy strings, grid may be stringified). */
export interface RawRoom {
  id: string;
  name: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  edges: Record<EdgeSide, unknown>;
  grid: CellType[][] | string;
  fogOfWar?: boolean;
  fogVisibilityDistance?: number;
  fogKeepRevealed?: boolean;
  customData?: Record<string, unknown>;
}

/** Structural subset shared by StoredLevel, FirestoreLevel, LevelData and pasted JSON. */
export interface LevelLike {
  width: number;
  height: number;
  edges: Record<EdgeSide, unknown>;
  grid: CellType[][] | string;
  rooms?: RawRoom[];
  initialObjects?: LevelObjectDef[];
  initialBoxes?: BoxDef[];
  conveyorPowerRequired?: Position[];
  conveyorConfig?: ConveyorCellConfig[];
  trampolineConfig?: TrampolineCellConfig[];
  deflectorConfig?: DeflectorCellConfig[];
}

export interface RoomParseOptions {
  /** Read `fogKeepRevealed` from rooms and apply it to the active-room state. */
  keepRevealed: boolean;
  /** Carry `customData` over from persisted rooms. */
  customData: boolean;
  /** JSON-parse a stringified legacy single-room grid (generator output is never a string). */
  parseLegacyGrid: boolean;
}

export const DEFAULT_OBJS: ObjConfig[] = [
  { id: 1, row: null, col: null, roomId: 'main', mode: 'normal', lockOnTarget: true },
  { id: 2, row: null, col: null, roomId: 'main', mode: 'normal', lockOnTarget: true },
];

/** Legacy levels store an edge as a bare string (`'wall'`); the editor works with `{ type }`. */
export function normalizeEdges(edges: Record<EdgeSide, unknown>): EditorEdges {
  const norm = (e: unknown) => (typeof e === 'string' ? { type: e } : e) as EdgeConfig;
  return {
    top: norm(edges.top),
    bottom: norm(edges.bottom),
    left: norm(edges.left),
    right: norm(edges.right),
  };
}

export function parseRooms(rooms: RawRoom[], opts: RoomParseOptions): EditorRoom[] {
  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    width: r.width,
    height: r.height,
    x: r.x ?? 0,
    y: r.y ?? 0,
    edges: normalizeEdges(r.edges),
    grid: typeof r.grid === 'string' ? JSON.parse(r.grid) : r.grid,
    fogOfWar: r.fogOfWar ?? false,
    fogVisibilityDistance: r.fogVisibilityDistance ?? 1.5,
    ...(opts.keepRevealed ? { fogKeepRevealed: r.fogKeepRevealed ?? true } : {}),
    ...(opts.customData ? { customData: r.customData ?? {} } : {}),
  }));
}

/** Wraps a pre-multi-room level into a single `main` room. */
export function buildLegacyRoom(src: LevelLike, name: string, opts: RoomParseOptions): EditorRoom {
  const grid = opts.parseLegacyGrid && typeof src.grid === 'string'
    ? JSON.parse(src.grid)
    : (src.grid as CellType[][]);
  return {
    id: 'main',
    name,
    width: src.width,
    height: src.height,
    x: 0,
    y: 0,
    edges: normalizeEdges(src.edges),
    grid,
    fogOfWar: false,
    fogVisibilityDistance: 1.5,
    ...(opts.keepRevealed ? { fogKeepRevealed: true } : {}),
  };
}

export function hasRooms(src: LevelLike): boolean {
  return !!(src.rooms && src.rooms.length > 0);
}

/** Players; an empty list falls back to a single unplaced P1 (same as every legacy loader). */
export function toObjConfigs(initialObjects: LevelObjectDef[] | undefined): ObjConfig[] {
  const objs: ObjConfig[] = (initialObjects ?? []).map((obj) => ({
    id: obj.id,
    row: obj.position.row,
    col: obj.position.col,
    roomId: obj.position.roomId ?? 'main',
    mode: obj.mode,
    lockOnTarget: obj.lockOnTarget,
  }));
  if (objs.length === 0) {
    objs.push({ id: 1, row: null, col: null, roomId: 'main', mode: 'normal', lockOnTarget: true });
  }
  return objs;
}

export function toBoxConfigs(initialBoxes: BoxDef[] | undefined): BoxConfig[] {
  return (initialBoxes ?? []).map((b) => ({
    id: b.id,
    row: b.position.row,
    col: b.position.col,
    roomId: b.position.roomId ?? 'main',
    requiresPower: b.requiresPower ?? false,
    durabilityEnabled: b.durabilityEnabled ?? false,
    durability: b.durability ?? 3,
    colorFilterEnabled: b.colorFilterEnabled ?? false,
    colorFilterIndex: b.colorFilterIndex ?? 0,
  }));
}

/** Drops `"r,c"` lock keys that fall outside a `w x h` grid. */
export function filterLockedCells(prev: Record<string, boolean>, w: number, h: number): Record<string, boolean> {
  const filtered: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(prev)) {
    const [rStr, cStr] = key.split(',');
    const r = parseInt(rStr, 10);
    const c = parseInt(cStr, 10);
    if (r < h && c < w) {
      filtered[key] = value;
    }
  }
  return filtered;
}
