import { useCallback, useEffect } from 'react';
import type { LevelData } from '@/game-engine/level-format';
import { buildLevelData, type BuildLevelResult } from '../lib/buildLevelData';
import type { LevelDocument } from './useLevelDocument';
import type { EditorRoomsApi } from './useEditorRooms';
import type { EditorUiState } from './useEditorUiState';

/**
 * `generateLevelData` = memoized wrapper around the pure `buildLevelData`.
 * Deps list is the original one (identity changes on the same inputs as before,
 * which drives the live-solver effect and AiAssistantDialog's memo).
 */
export function useLevelBuilder(
  doc: LevelDocument,
  roomsApi: EditorRoomsApi,
  editId: number | null,
  creatorName: string,
) {
  const {
    levelName, width, height, edges, grid, objects, trailCollision, boxes, conveyorPowerRequired,
    conveyorConfig, trampolineConfig, deflectorConfig, lockedCells, difficulty,
    fogOfWar, fogVisibilityDistance, fogKeepRevealed, gameNotes, creatorNotes,
  } = doc;
  const { rooms, controlMode, activeRoomId } = roomsApi;

  const generateLevelData = useCallback((): BuildLevelResult => buildLevelData({
    editId, levelName, width, height, edges, grid, objects, trailCollision, boxes,
    conveyorPowerRequired, conveyorConfig, trampolineConfig, deflectorConfig, lockedCells,
    rooms, controlMode, activeRoomId, difficulty, creatorName,
    fogOfWar, fogVisibilityDistance, fogKeepRevealed, gameNotes, creatorNotes,
  }), [editId, levelName, width, height, edges, grid, objects, trailCollision, boxes, conveyorPowerRequired, conveyorConfig, trampolineConfig, deflectorConfig, lockedCells, rooms, controlMode, activeRoomId, difficulty, creatorName, fogOfWar, fogVisibilityDistance, fogKeepRevealed, gameNotes, creatorNotes]);

  return generateLevelData;
}

/** Debounced (250 ms) background solve of the current level for the path overlay. */
export function useLiveSolver(
  doc: LevelDocument,
  rooms: EditorRoomsApi['rooms'],
  generateLevelData: () => BuildLevelResult,
  ui: Pick<EditorUiState, 'setOptimalSolution' | 'setOptimalSolutionMoves' | 'setOptimalSolutionTrajectory'>,
) {
  const {
    grid, width, height, objects, boxes, edges, trailCollision, conveyorPowerRequired,
    conveyorConfig, trampolineConfig, deflectorConfig,
  } = doc;
  const { setOptimalSolution, setOptimalSolutionMoves, setOptimalSolutionTrajectory } = ui;

  useEffect(() => {
    const timer = setTimeout(async () => {
      const { level, error } = generateLevelData();
      if (error || !level) {
        setOptimalSolution(null);
        setOptimalSolutionMoves(0);
        setOptimalSolutionTrajectory(null);
        return;
      }
      try {
        const { solvePuzzle, getSolutionTrajectories } = await import('@/game-engine/solver/solver');
        const result = solvePuzzle(level, 26, 2000);
        if (result.solvable && result.solution) {
          setOptimalSolution(result.solution);
          setOptimalSolutionMoves(result.moveCount);
          const traj = getSolutionTrajectories(level, result.solution);
          setOptimalSolutionTrajectory(traj);
        } else {
          setOptimalSolution(null);
          setOptimalSolutionMoves(0);
          setOptimalSolutionTrajectory(null);
        }
      } catch (err) {
        console.error('Live solver error:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [grid, width, height, objects, boxes, edges, trailCollision, conveyorPowerRequired, conveyorConfig, trampolineConfig, deflectorConfig, generateLevelData, rooms,
    // stable setters (do not affect when the effect re-runs)
    setOptimalSolution, setOptimalSolutionMoves, setOptimalSolutionTrajectory]);
}

/** Convenience: validate current level and open it in test-play. */
export function useTestLevel(
  generateLevelData: () => BuildLevelResult,
  setTestError: (e: string | null) => void,
  setTestLevel: (l: LevelData | null) => void,
) {
  return useCallback(() => {
    const { level, error } = generateLevelData();
    if (error || !level) { setTestError(error); return; }
    setTestError(null); setTestLevel(level);
  }, [generateLevelData, setTestError, setTestLevel]);
}
