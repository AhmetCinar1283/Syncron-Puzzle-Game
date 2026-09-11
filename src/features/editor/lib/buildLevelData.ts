/**
 * Builds the persisted `LevelData` payload from editor state — the single place
 * where the editor writes the level format that ends up in Dexie, Firestore
 * (`levels`, `levelRequests`) and the `editorClipboard` localStorage key.
 *
 * CONTRACT §4/§7: this output must stay byte-identical. Field names, the
 * conditional-spread "omit when default" rules and the key ORDER (visible in
 * `JSON.stringify` for the clipboard) are copied verbatim from the former
 * `useEditorState.generateLevelData`. Do not reorder keys or add fields here
 * without a data migration plan.
 *
 * Alternative considered: keep this inside the hook. Rejected because a pure
 * function is testable and lets the hook stay a thin `useCallback` wrapper.
 * A new cell type needs no change here (grid is copied as-is); a new
 * per-cell config needs one conditional-spread line, same as before.
 * Null/missing inputs: unplaced players/boxes are filtered; validation errors
 * are returned as `{ level: null, error }` exactly as before.
 */
import type {
  CellType, ConveyorCellConfig, DeflectorCellConfig, LevelData, LevelEdges,
  Position, TrampolineCellConfig,
} from '@/game-engine/level-format';
import type { ControlMode } from '@/game-engine/logic/types';
import type { BoxConfig, ObjConfig } from './editorConfig';
import type { EditorEdges, EditorRoom } from './levelSnapshot';

export interface BuildLevelInput {
  editId: number | null;
  levelName: string;
  width: number;
  height: number;
  edges: EditorEdges;
  grid: CellType[][];
  objects: ObjConfig[];
  trailCollision: boolean;
  boxes: BoxConfig[];
  conveyorPowerRequired: Position[];
  conveyorConfig: ConveyorCellConfig[];
  trampolineConfig: TrampolineCellConfig[];
  deflectorConfig: DeflectorCellConfig[];
  lockedCells: Record<string, boolean>;
  /** Editor state keeps `rooms` as `any[]` (mirrors level-format); it is read as EditorRoom here. */
  rooms: EditorRoom[];
  controlMode: ControlMode;
  activeRoomId: string;
  difficulty: 1 | 2 | 3 | 4;
  creatorName: string;
  fogOfWar: boolean;
  fogVisibilityDistance: number;
  fogKeepRevealed: boolean;
  gameNotes: string;
  creatorNotes: string;
}

export type BuildLevelResult = { level: LevelData | null; error: string | null };

export function buildLevelData(input: BuildLevelInput): BuildLevelResult {
  const {
    editId, levelName, width, height, edges, grid, objects, trailCollision, boxes,
    conveyorPowerRequired, conveyorConfig, trampolineConfig, deflectorConfig, lockedCells,
    rooms, controlMode, activeRoomId, difficulty, creatorName,
    fogOfWar, fogVisibilityDistance, fogKeepRevealed, gameNotes, creatorNotes,
  } = input;

  const currentRooms = rooms.map((r) => {
    if (r.id === activeRoomId) {
      return { ...r, width, height, edges, grid, fogOfWar, fogVisibilityDistance, fogKeepRevealed };
    }
    return r;
  });

  const validObjs = objects.filter((o) => o.row !== null && o.col !== null);
  if (validObjs.length < 1) return { level: null, error: 'Place at least one player on the grid first.' };
  if (validObjs.length !== objects.length) return { level: null, error: 'All defined players must be placed on the grid.' };

  const targets: { objectId: number; position: { roomId: string; row: number; col: number } }[] = [];
  for (const room of currentRooms) {
    for (let r = 0; r < room.height; r++) {
      for (let c = 0; c < room.width; c++) {
        const cell = room.grid[r][c];
        if (cell.startsWith('target_')) {
          const id = parseInt(cell.substring(7), 10);
          if (!isNaN(id)) {
            targets.push({ objectId: id, position: { roomId: room.id, row: r, col: c } });
          }
        }
      }
    }
  }

  if (targets.length !== validObjs.length) {
    return { level: null, error: `Number of targets (${targets.length}) must match number of players (${validObjs.length}).` };
  }

  const telGroupCounts: Record<string, number> = {};
  for (const room of currentRooms) {
    for (const row of room.grid) {
      for (const cell of row) {
        if (cell.startsWith('teleporter_in_') || cell.startsWith('teleporter_out_')) {
          const group = cell.substring(cell.lastIndexOf('_') + 1);
          telGroupCounts[group] = (telGroupCounts[group] ?? 0) + 1;
        }
      }
    }
  }
  for (const [group, count] of Object.entries(telGroupCounts)) {
    if (count < 2) {
      return { level: null, error: `Teleporter group ${group} must have at least 2 portals.` };
    }
  }

  const validBoxes = boxes.filter((b) => b.row !== null && b.col !== null);
  const initialControlledRooms = controlMode === 'all_rooms' ? currentRooms.map(r => r.id) : [currentRooms[0].id];

  return {
    level: {
      id: editId ?? 0,
      name: levelName || 'Unnamed Level',
      width,
      height,
      edges: edges as unknown as LevelEdges,
      grid,
      difficulty,
      creatorName,
      gameNotes,
      creatorNotes,
      rooms: currentRooms.map((r) => ({
        id: r.id,
        name: r.name,
        width: r.width,
        height: r.height,
        x: r.x,
        y: r.y,
        edges: r.edges,
        grid: r.grid,
        fogOfWar: r.fogOfWar ?? false,
        fogVisibilityDistance: r.fogVisibilityDistance ?? 1.5,
        fogKeepRevealed: r.fogKeepRevealed ?? true,
        customData: r.customData ?? {},
      })),
      controlMode,
      initialControlledRooms,
      initialObjects: validObjs.map((o) => ({
        id: o.id,
        position: { roomId: o.roomId ?? 'main', row: o.row!, col: o.col! },
        mode: o.mode,
        lockOnTarget: o.lockOnTarget
      })),
      targets,
      ...(trailCollision ? { trailCollision: true } : {}),
      ...(validBoxes.length > 0 ? {
        initialBoxes: validBoxes.map((b) => ({
          id: b.id,
          position: { roomId: b.roomId ?? 'main', row: b.row!, col: b.col! },
          ...(b.requiresPower ? { requiresPower: true } : {}),
          ...(b.durabilityEnabled ? { durabilityEnabled: true, durability: b.durability } : {}),
          ...(b.colorFilterEnabled ? { colorFilterEnabled: true, colorFilterIndex: b.colorFilterIndex } : {}),
        }))
      } : {}),
      ...(conveyorPowerRequired.length > 0 ? { conveyorPowerRequired } : {}),
      ...(conveyorConfig.length > 0 ? { conveyorConfig } : {}),
      ...(trampolineConfig.length > 0 ? { trampolineConfig } : {}),
      ...(deflectorConfig.length > 0 ? { deflectorConfig } : {}),
      ...(Object.keys(lockedCells).length > 0 ? { lockedCells } : {}),
    } as LevelData,
    error: null,
  };
}
