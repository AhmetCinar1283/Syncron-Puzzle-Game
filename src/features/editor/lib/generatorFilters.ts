/**
 * Procedural-generator form model (pure, no React).
 *
 * `GeneratorFiltersUI` is the shape persisted to localStorage under
 * `generator_presets` / `generator_last_used`; `toFilters` keeps the exact key
 * order the old component wrote so existing presets round-trip unchanged.
 * `applyFiltersToForm` accepts old presets (legacy `edgeBehavior`, scalar or
 * `'random'` step counts) — missing fields keep their current value, exactly
 * like the old per-field `if (f.x !== undefined) setX(...)` chain.
 *
 * Alternative considered: keep ~45 separate `useState`s. Rejected: every
 * reset/apply/save path had to enumerate them by hand (3 copies of the reset
 * list). A new filter field = add it to `GeneratorForm`, `defaultForm`,
 * `applyFiltersToForm` and `toFilters` in this one file.
 */
import type { CellType, EdgeBehavior, LevelTargetDef } from '@/game-engine/level-format';
import type { GeneratorFilters } from '@/game-engine/solver/generator';
import type { BoxConfig, ObjConfig } from './editorConfig';
import type { ConveyorCellConfig, TrampolineCellConfig } from '@/game-engine/level-format';

export type EdgeAllowed = (EdgeBehavior | 'random')[];
export type DensityMode = 'ratio' | 'count';
export type DensityElement = 'obstacle' | 'ice' | 'conveyor' | 'trampoline' | 'forbidden' | 'toggle';

export interface GeneratorFiltersUI {
  width: number;
  height: number;
  difficulty: 1 | 2 | 3 | 4;
  playerCount: number | string;
  edgeBehavior?: 'wall' | 'portal' | 'lava' | 'random'; // legacy
  edgeTopAllowed?: EdgeAllowed;
  edgeBottomAllowed?: EdgeAllowed;
  edgeLeftAllowed?: EdgeAllowed;
  edgeRightAllowed?: EdgeAllowed;
  conveyorSteps?: number[] | number | 'random';
  trampolineSteps?: number[] | number | 'random';
  playerMode: 'normal' | 'reversed' | 'random';
  playerLock: 'lock' | 'nolock' | 'random';
  trailCollision: 'yes' | 'no' | 'random';
  obstacleDensity: number;
  iceDensity: number;
  conveyorDensity: number;
  trampolineDensity: number;
  forbiddenDensity: number;
  toggleDensity: number;
  teleporterCount: number;
  mutationRate?: number;

  obstacleMode?: DensityMode;
  obstacleCount?: number;
  iceMode?: DensityMode;
  iceCount?: number;
  conveyorMode?: DensityMode;
  conveyorCount?: number;
  trampolineMode?: DensityMode;
  trampolineCount?: number;
  forbiddenMode?: DensityMode;
  forbiddenCount?: number;
  toggleMode?: DensityMode;
  toggleCount?: number;

  // Multi-room settings
  numRooms?: number;
  roomPlacementMode?: 'grid' | 'random';
  roomFogMode?: 'all_light' | 'all_dark' | 'random';
  roomFogVisibility?: number | string;
  roomFogPersist?: 'yes' | 'no' | 'random';
  roomPortalConnection?: 'connected' | 'disconnected' | 'random';
  playerDistribution?: 'same_room' | 'random_rooms';
  controlMode?: 'all_rooms' | 'selected_room' | 'random';
}

export interface StoredPreset {
  name: string;
  filters: GeneratorFiltersUI;
}

/** Complete in-memory form state (every field present). */
export interface GeneratorForm {
  width: number;
  height: number;
  difficulty: 1 | 2 | 3 | 4;
  playerCount: number | string;
  edgeTopAllowed: EdgeAllowed;
  edgeBottomAllowed: EdgeAllowed;
  edgeLeftAllowed: EdgeAllowed;
  edgeRightAllowed: EdgeAllowed;
  conveyorSteps: number[];
  trampolineSteps: number[];
  playerMode: 'normal' | 'reversed' | 'random';
  playerLock: 'lock' | 'nolock' | 'random';
  trailCollision: 'yes' | 'no' | 'random';
  obstacleDensity: number;
  iceDensity: number;
  conveyorDensity: number;
  trampolineDensity: number;
  forbiddenDensity: number;
  toggleDensity: number;
  teleporterCount: number;
  numRooms: number;
  roomPlacementMode: 'grid' | 'random';
  roomFogMode: 'all_light' | 'all_dark' | 'random';
  roomFogVisibility: number | string;
  roomFogPersist: 'yes' | 'no' | 'random';
  roomPortalConnection: 'connected' | 'disconnected' | 'random';
  playerDistribution: 'same_room' | 'random_rooms';
  controlModeSelect: 'all_rooms' | 'selected_room' | 'random';
  obstacleMode: DensityMode;
  obstacleCount: number;
  iceMode: DensityMode;
  iceCount: number;
  conveyorMode: DensityMode;
  conveyorCount: number;
  trampolineMode: DensityMode;
  trampolineCount: number;
  forbiddenMode: DensityMode;
  forbiddenCount: number;
  toggleMode: DensityMode;
  toggleCount: number;
  mutationRate: number;
}

export type EdgeAllowedKey = 'edgeTopAllowed' | 'edgeBottomAllowed' | 'edgeLeftAllowed' | 'edgeRightAllowed';
export const EDGE_ALLOWED_KEY: Record<'top' | 'bottom' | 'left' | 'right', EdgeAllowedKey> = {
  top: 'edgeTopAllowed', bottom: 'edgeBottomAllowed', left: 'edgeLeftAllowed', right: 'edgeRightAllowed',
};

/** Initial form; `width/height` default to the current canvas size on open, 6x6 on reset. */
export function defaultForm(width = 6, height = 6): GeneratorForm {
  return {
    width, height, difficulty: 2, playerCount: 1,
    edgeTopAllowed: ['wall'], edgeBottomAllowed: ['wall'], edgeLeftAllowed: ['wall'], edgeRightAllowed: ['wall'],
    conveyorSteps: [1], trampolineSteps: [3],
    playerMode: 'normal', playerLock: 'lock', trailCollision: 'no',
    obstacleDensity: 0.15, iceDensity: 0.15, conveyorDensity: 0.0, trampolineDensity: 0.0,
    forbiddenDensity: 0.0, toggleDensity: 0.0, teleporterCount: 0,
    numRooms: 1, roomPlacementMode: 'grid', roomFogMode: 'all_light', roomFogVisibility: 1.5,
    roomFogPersist: 'yes', roomPortalConnection: 'connected', playerDistribution: 'same_room',
    controlModeSelect: 'all_rooms',
    obstacleMode: 'ratio', obstacleCount: 0, iceMode: 'ratio', iceCount: 0,
    conveyorMode: 'ratio', conveyorCount: 0, trampolineMode: 'ratio', trampolineCount: 0,
    forbiddenMode: 'ratio', forbiddenCount: 0, toggleMode: 'ratio', toggleCount: 0,
    mutationRate: 1.0,
  };
}

/** Overlays a (possibly legacy/partial) preset onto the form. */
export function applyFiltersToForm(prev: GeneratorForm, f: GeneratorFiltersUI): GeneratorForm {
  const next: GeneratorForm = { ...prev };
  if (f.width !== undefined) next.width = f.width;
  if (f.height !== undefined) next.height = f.height;
  if (f.difficulty !== undefined) next.difficulty = f.difficulty;
  if (f.playerCount !== undefined) next.playerCount = f.playerCount;
  if (f.playerMode !== undefined) next.playerMode = f.playerMode;
  if (f.playerLock !== undefined) next.playerLock = f.playerLock;
  if (f.trailCollision !== undefined) next.trailCollision = f.trailCollision;
  if (f.obstacleDensity !== undefined) next.obstacleDensity = f.obstacleDensity;
  if (f.iceDensity !== undefined) next.iceDensity = f.iceDensity;
  if (f.conveyorDensity !== undefined) next.conveyorDensity = f.conveyorDensity;
  if (f.trampolineDensity !== undefined) next.trampolineDensity = f.trampolineDensity;
  if (f.forbiddenDensity !== undefined) next.forbiddenDensity = f.forbiddenDensity;
  if (f.toggleDensity !== undefined) next.toggleDensity = f.toggleDensity;
  if (f.teleporterCount !== undefined) next.teleporterCount = f.teleporterCount;
  if (f.mutationRate !== undefined) next.mutationRate = f.mutationRate;

  // Support legacy presets having legacy edgeBehavior
  if (f.edgeBehavior !== undefined) {
    const legacy = f.edgeBehavior;
    if (legacy === 'random') {
      const all: EdgeAllowed = ['wall', 'portal', 'lava'];
      next.edgeTopAllowed = all;
      next.edgeBottomAllowed = all;
      next.edgeLeftAllowed = all;
      next.edgeRightAllowed = all;
    } else {
      next.edgeTopAllowed = [legacy as EdgeBehavior];
      next.edgeBottomAllowed = [legacy as EdgeBehavior];
      next.edgeLeftAllowed = [legacy as EdgeBehavior];
      next.edgeRightAllowed = [legacy as EdgeBehavior];
    }
  }

  // New fields
  if (f.edgeTopAllowed !== undefined) next.edgeTopAllowed = f.edgeTopAllowed;
  if (f.edgeBottomAllowed !== undefined) next.edgeBottomAllowed = f.edgeBottomAllowed;
  if (f.edgeLeftAllowed !== undefined) next.edgeLeftAllowed = f.edgeLeftAllowed;
  if (f.edgeRightAllowed !== undefined) next.edgeRightAllowed = f.edgeRightAllowed;

  if (f.conveyorSteps !== undefined) {
    if (Array.isArray(f.conveyorSteps)) {
      next.conveyorSteps = f.conveyorSteps;
    } else if (f.conveyorSteps === 'random') {
      next.conveyorSteps = [1, 2, 3];
    } else {
      next.conveyorSteps = [Number(f.conveyorSteps)];
    }
  }
  if (f.trampolineSteps !== undefined) {
    if (Array.isArray(f.trampolineSteps)) {
      next.trampolineSteps = f.trampolineSteps;
    } else if (f.trampolineSteps === 'random') {
      next.trampolineSteps = [2, 3, 4];
    } else {
      next.trampolineSteps = [Number(f.trampolineSteps)];
    }
  }

  // Exact count fields
  if (f.obstacleMode !== undefined) next.obstacleMode = f.obstacleMode;
  if (f.obstacleCount !== undefined) next.obstacleCount = f.obstacleCount;
  if (f.iceMode !== undefined) next.iceMode = f.iceMode;
  if (f.iceCount !== undefined) next.iceCount = f.iceCount;
  if (f.conveyorMode !== undefined) next.conveyorMode = f.conveyorMode;
  if (f.conveyorCount !== undefined) next.conveyorCount = f.conveyorCount;
  if (f.trampolineMode !== undefined) next.trampolineMode = f.trampolineMode;
  if (f.trampolineCount !== undefined) next.trampolineCount = f.trampolineCount;
  if (f.forbiddenMode !== undefined) next.forbiddenMode = f.forbiddenMode;
  if (f.forbiddenCount !== undefined) next.forbiddenCount = f.forbiddenCount;
  if (f.toggleMode !== undefined) next.toggleMode = f.toggleMode;
  if (f.toggleCount !== undefined) next.toggleCount = f.toggleCount;

  // Multi-room settings
  if (f.numRooms !== undefined) next.numRooms = f.numRooms;
  if (f.roomPlacementMode !== undefined) next.roomPlacementMode = f.roomPlacementMode;
  if (f.roomFogMode !== undefined) next.roomFogMode = f.roomFogMode;
  if (f.roomFogVisibility !== undefined) next.roomFogVisibility = f.roomFogVisibility;
  if (f.roomFogPersist !== undefined) next.roomFogPersist = f.roomFogPersist;
  if (f.roomPortalConnection !== undefined) next.roomPortalConnection = f.roomPortalConnection;
  if (f.playerDistribution !== undefined) next.playerDistribution = f.playerDistribution;
  if (f.controlMode !== undefined) next.controlModeSelect = f.controlMode;
  return next;
}

/** Form -> persisted preset shape (key order identical to the pre-refactor writer). */
export function toFilters(s: GeneratorForm): GeneratorFiltersUI {
  return {
    width: s.width, height: s.height, difficulty: s.difficulty, playerCount: s.playerCount,
    edgeTopAllowed: s.edgeTopAllowed, edgeBottomAllowed: s.edgeBottomAllowed,
    edgeLeftAllowed: s.edgeLeftAllowed, edgeRightAllowed: s.edgeRightAllowed,
    playerMode: s.playerMode, playerLock: s.playerLock, trailCollision: s.trailCollision,
    obstacleDensity: s.obstacleDensity, iceDensity: s.iceDensity, conveyorDensity: s.conveyorDensity,
    trampolineDensity: s.trampolineDensity,
    forbiddenDensity: s.forbiddenDensity, toggleDensity: s.toggleDensity, teleporterCount: s.teleporterCount,
    conveyorSteps: s.conveyorSteps, trampolineSteps: s.trampolineSteps, mutationRate: s.mutationRate,
    obstacleMode: s.obstacleMode, obstacleCount: s.obstacleCount,
    iceMode: s.iceMode, iceCount: s.iceCount,
    conveyorMode: s.conveyorMode, conveyorCount: s.conveyorCount,
    trampolineMode: s.trampolineMode, trampolineCount: s.trampolineCount,
    forbiddenMode: s.forbiddenMode, forbiddenCount: s.forbiddenCount,
    toggleMode: s.toggleMode, toggleCount: s.toggleCount,
    numRooms: s.numRooms, roomPlacementMode: s.roomPlacementMode, roomFogMode: s.roomFogMode,
    roomFogVisibility: s.roomFogVisibility,
    roomFogPersist: s.roomFogPersist, roomPortalConnection: s.roomPortalConnection,
    playerDistribution: s.playerDistribution,
    controlMode: s.controlModeSelect
  };
}

// ─── Ratio / count conversion ──────────────────────────────────────────────

export const ratioToCount = (ratio: number, total: number): number => {
  return Math.round(ratio * total);
};

export const countToRatio = (count: number, total: number, maxRatio: number): number => {
  const rawRatio = count / total;
  const roundedRatio = Math.round(rawRatio * 20) / 20;
  return Math.max(0, Math.min(maxRatio, roundedRatio));
};

type DensityKey = 'obstacleDensity' | 'iceDensity' | 'conveyorDensity' | 'trampolineDensity' | 'forbiddenDensity' | 'toggleDensity';
type CountKey = 'obstacleCount' | 'iceCount' | 'conveyorCount' | 'trampolineCount' | 'forbiddenCount' | 'toggleCount';
type ModeKey = 'obstacleMode' | 'iceMode' | 'conveyorMode' | 'trampolineMode' | 'forbiddenMode' | 'toggleMode';

export interface DensityElementDef {
  key: DensityElement;
  label: string;
  densityKey: DensityKey;
  countKey: CountKey;
  modeKey: ModeKey;
  /** Slider max in percent. */
  maxRatio: number;
}

/** Rows of the "Special Element Densities" section, in display order. */
export const DENSITY_ELEMENTS: DensityElementDef[] = [
  { key: 'obstacle', label: 'Obstacles', densityKey: 'obstacleDensity', countKey: 'obstacleCount', modeKey: 'obstacleMode', maxRatio: 50 },
  { key: 'ice', label: 'Ice cells', densityKey: 'iceDensity', countKey: 'iceCount', modeKey: 'iceMode', maxRatio: 50 },
  { key: 'conveyor', label: 'Conveyors', densityKey: 'conveyorDensity', countKey: 'conveyorCount', modeKey: 'conveyorMode', maxRatio: 30 },
  { key: 'trampoline', label: 'Trampolines', densityKey: 'trampolineDensity', countKey: 'trampolineCount', modeKey: 'trampolineMode', maxRatio: 20 },
  { key: 'forbidden', label: 'Forbidden tiles', densityKey: 'forbiddenDensity', countKey: 'forbiddenCount', modeKey: 'forbiddenMode', maxRatio: 30 },
  { key: 'toggle', label: 'Direction Toggles', densityKey: 'toggleDensity', countKey: 'toggleCount', modeKey: 'toggleMode', maxRatio: 20 },
];

/** Switching ratio <-> count converts the current value so the slider keeps its meaning. */
export function modeChangePatch(form: GeneratorForm, element: DensityElement, newMode: DensityMode): Partial<GeneratorForm> {
  const def = DENSITY_ELEMENTS.find((d) => d.key === element)!;
  const totalCells = form.width * form.height;
  if (newMode === 'count') {
    return { [def.modeKey]: newMode, [def.countKey]: ratioToCount(form[def.densityKey], totalCells) };
  }
  return { [def.modeKey]: newMode, [def.densityKey]: countToRatio(form[def.countKey], totalCells, def.maxRatio / 100) };
}

// ─── Generator call ─────────────────────────────────────────────────────────

export interface CanvasSnapshot {
  grid: CellType[][];
  objects: ObjConfig[];
  boxes: BoxConfig[];
  conveyorConfig: ConveyorCellConfig[];
  trampolineConfig: TrampolineCellConfig[];
  lockedCells: Record<string, boolean>;
}

/** Builds the `generateProceduralLevel` input; single-room runs seed from the current canvas. */
export function buildGeneratorParams(s: GeneratorForm, canvas: CanvasSnapshot): GeneratorFilters {
  const { grid, objects, boxes, conveyorConfig, trampolineConfig, lockedCells } = canvas;

  // Extract targets from grid
  const originalTargets: LevelTargetDef[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r]?.[c];
      if (cell && cell.startsWith('target_')) {
        const oId = parseInt(cell.substring('target_'.length), 10);
        if (!isNaN(oId)) {
          originalTargets.push({ objectId: oId, position: { row: r, col: c } });
        }
      }
    }
  }

  const numRooms = s.numRooms;
  return {
    width: s.width, height: s.height, difficulty: s.difficulty, playerCount: s.playerCount,
    edgeTopAllowed: s.edgeTopAllowed, edgeBottomAllowed: s.edgeBottomAllowed,
    edgeLeftAllowed: s.edgeLeftAllowed, edgeRightAllowed: s.edgeRightAllowed,
    playerMode: s.playerMode, playerLock: s.playerLock, trailCollision: s.trailCollision,

    obstacleDensity: s.obstacleMode === 'ratio' ? s.obstacleDensity : 0,
    obstacleCount: s.obstacleMode === 'count' ? s.obstacleCount : undefined,

    iceDensity: s.iceMode === 'ratio' ? s.iceDensity : 0,
    iceCount: s.iceMode === 'count' ? s.iceCount : undefined,

    conveyorDensity: s.conveyorMode === 'ratio' ? s.conveyorDensity : 0,
    conveyorCount: s.conveyorMode === 'count' ? s.conveyorCount : undefined,

    trampolineDensity: s.trampolineMode === 'ratio' ? s.trampolineDensity : 0,
    trampolineCount: s.trampolineMode === 'count' ? s.trampolineCount : undefined,

    forbiddenDensity: s.forbiddenMode === 'ratio' ? s.forbiddenDensity : 0,
    forbiddenCount: s.forbiddenMode === 'count' ? s.forbiddenCount : undefined,

    toggleDensity: s.toggleMode === 'ratio' ? s.toggleDensity : 0,
    toggleCount: s.toggleMode === 'count' ? s.toggleCount : undefined,

    teleporterCount: s.teleporterCount,
    conveyorSteps: s.conveyorSteps, trampolineSteps: s.trampolineSteps,

    lockedCells,
    mutationRate: s.mutationRate,
    originalGrid: numRooms > 1 ? undefined : grid,
    originalObjects: numRooms > 1 ? undefined : objects.filter(o => o.row !== null).map(o => ({ id: o.id, position: { row: o.row!, col: o.col! }, mode: o.mode, lockOnTarget: o.lockOnTarget })),
    originalTargets: numRooms > 1 ? undefined : originalTargets,
    originalBoxes: numRooms > 1 ? undefined : boxes.filter(b => b.row !== null).map(b => ({ id: b.id, position: { row: b.row!, col: b.col! }, requiresPower: b.requiresPower })),
    originalConveyorConfig: numRooms > 1 ? undefined : conveyorConfig,
    originalTrampolineConfig: numRooms > 1 ? undefined : trampolineConfig,

    numRooms,
    roomPlacementMode: s.roomPlacementMode,
    roomFogMode: s.roomFogMode,
    roomFogVisibility: s.roomFogVisibility,
    roomFogPersist: s.roomFogPersist,
    roomPortalConnection: s.roomPortalConnection,
    playerDistribution: s.playerDistribution,
    controlMode: s.controlModeSelect
  };
}
