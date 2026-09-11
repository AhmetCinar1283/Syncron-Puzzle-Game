import { useCallback, useRef, useState } from 'react';
import type { CellType } from '@/game-engine/level-format';

interface HistorySnapshot {
  grid: CellType[][];
  lockedCells: Record<string, boolean>;
}

/**
 * Undo history for the active room's grid + lock map (max 40 snapshots).
 * Only grid/locks are snapshotted — entities, configs and rooms are not
 * (unchanged from the original implementation).
 */
export function useEditorHistory(
  grid: CellType[][],
  lockedCells: Record<string, boolean>,
  setGrid: (g: CellType[][]) => void,
  setLockedCells: (l: Record<string, boolean>) => void,
) {
  const historyRef = useRef<HistorySnapshot[]>([]);
  const [historyLen, setHistoryLen] = useState(0);

  const pushGridHistory = useCallback(() => {
    historyRef.current = [
      ...historyRef.current.slice(-39),
      { grid: grid.map((r) => [...r]), lockedCells: { ...lockedCells } }
    ];
    setHistoryLen(historyRef.current.length);
  }, [grid, lockedCells]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setHistoryLen(historyRef.current.length);
    setGrid(prev.grid);
    setLockedCells(prev.lockedCells);
  }, [setGrid, setLockedCells]);

  return { pushGridHistory, undo, canUndo: historyLen > 0 };
}
