import { useState } from 'react';
import type {
  CellType, ConveyorCellConfig, DeflectorCellConfig, Position, TrampolineCellConfig,
} from '@/game-engine/level-format';
import { makeGrid, type BoxConfig, type ObjConfig } from '../lib/editorConfig';
import { DEFAULT_OBJS, type EditorEdges } from '../lib/levelSnapshot';

/**
 * Raw state of the level being edited (the "document"): metadata + the ACTIVE
 * room's grid/edges/fog + entities/configs. Pure `useState` holders, no logic —
 * behavior lives in the sibling hooks that receive this object.
 *
 * Alternative considered: a single `useReducer`. Rejected for this refactor
 * because every consumer (context, grid ops, panels) already calls the
 * individual setters, and the public `useEditorState` API must stay identical.
 * Setters returned here are React-stable, so hooks may list them in deps freely.
 */
export function useLevelDocument() {
  const [levelName, setLevelName] = useState('My Level');
  const [gameNotes, setGameNotes] = useState('');
  const [creatorNotes, setCreatorNotes] = useState('');
  const [width, setWidth] = useState(5);
  const [height, setHeight] = useState(5);
  const [pendingW, setPendingW] = useState(5);
  const [pendingH, setPendingH] = useState(5);
  const [trailCollision, setTrailCollision] = useState(false);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4>(2);
  const [savedRequestId, setSavedRequestId] = useState<string | null>(null);
  const [edges, setEdges] = useState<EditorEdges>({
    top: { type: 'wall' },
    bottom: { type: 'wall' },
    left: { type: 'wall' },
    right: { type: 'wall' },
  });
  const [grid, setGrid] = useState<CellType[][]>(() => makeGrid(5, 5));
  const [lockedCells, setLockedCells] = useState<Record<string, boolean>>({});
  const [objects, setObjects] = useState<ObjConfig[]>(DEFAULT_OBJS);
  const [boxes, setBoxes] = useState<BoxConfig[]>([]);
  const [activePlacingBoxId, setActivePlacingBoxId] = useState<number | null>(null);
  const [conveyorPowerRequired, setConveyorPowerRequired] = useState<Position[]>([]);
  const [conveyorConfig, setConveyorConfig] = useState<ConveyorCellConfig[]>([]);
  const [trampolineConfig, setTrampolineConfig] = useState<TrampolineCellConfig[]>([]);
  const [deflectorConfig, setDeflectorConfig] = useState<DeflectorCellConfig[]>([]);
  const [fogOfWar, setFogOfWar] = useState(false);
  const [fogVisibilityDistance, setFogVisibilityDistance] = useState(1.5);
  const [fogKeepRevealed, setFogKeepRevealed] = useState(true);

  return {
    levelName, setLevelName, gameNotes, setGameNotes, creatorNotes, setCreatorNotes,
    width, setWidth, height, setHeight, pendingW, setPendingW, pendingH, setPendingH,
    trailCollision, setTrailCollision, difficulty, setDifficulty,
    savedRequestId, setSavedRequestId,
    edges, setEdges, grid, setGrid, lockedCells, setLockedCells,
    objects, setObjects, boxes, setBoxes, activePlacingBoxId, setActivePlacingBoxId,
    conveyorPowerRequired, setConveyorPowerRequired,
    conveyorConfig, setConveyorConfig,
    trampolineConfig, setTrampolineConfig,
    deflectorConfig, setDeflectorConfig,
    fogOfWar, setFogOfWar, fogVisibilityDistance, setFogVisibilityDistance,
    fogKeepRevealed, setFogKeepRevealed,
  };
}

export type LevelDocument = ReturnType<typeof useLevelDocument>;
