import { useCallback } from 'react';
import type { CellType } from '@/game-engine/level-format';
import { resizeGrid } from '../lib/editorConfig';
import { filterLockedCells } from '../lib/levelSnapshot';
import type { LevelDocument } from './useLevelDocument';
import type { EditorTool, EditorUiState } from './useEditorUiState';

/**
 * Painting and resizing of the ACTIVE room (paintCell / applyResize).
 * Logic copied verbatim from the former `useEditorState`.
 */
export function useCellEditing(
  doc: LevelDocument,
  activeRoomId: string,
  tool: EditorTool,
  ui: Pick<EditorUiState, 'setSelection' | 'setActiveCandidateIndex'>,
  pushGridHistory: () => void,
) {
  const {
    pendingW, pendingH, activePlacingBoxId,
    setWidth, setHeight, setGrid, setObjects, setBoxes, setConveyorPowerRequired,
    setConveyorConfig, setTrampolineConfig, setDeflectorConfig, setLockedCells, setActivePlacingBoxId,
  } = doc;
  const { activeTool, setActiveTool, prevToolRef, paintMode } = tool;
  const { setSelection, setActiveCandidateIndex } = ui;

  const applyResize = useCallback(() => {
    const newW = Math.max(3, Math.min(16, pendingW));
    const newH = Math.max(3, Math.min(16, pendingH));
    setWidth(newW); setHeight(newH);
    setGrid((g) => resizeGrid(g, newW, newH));
    setObjects((os) => os.map((o) => {
      if ((o.roomId ?? 'main') !== activeRoomId) return o;
      return { ...o, row: o.row !== null && o.row < newH ? o.row : null, col: o.col !== null && o.col < newW ? o.col : null };
    }));
    setBoxes((bs) => bs.map((b) => {
      if ((b.roomId ?? 'main') !== activeRoomId) return b;
      return { ...b, row: b.row !== null && b.row < newH ? b.row : null, col: b.col !== null && b.col < newW ? b.col : null };
    }));
    setConveyorPowerRequired((cpr) => cpr.filter((p) => (p.roomId ?? 'main') !== activeRoomId || (p.row < newH && p.col < newW)));
    setConveyorConfig((cc) => cc.filter((c) => (c.position.roomId ?? 'main') !== activeRoomId || (c.position.row < newH && c.position.col < newW)));
    setTrampolineConfig((tc) => tc.filter((c) => (c.position.roomId ?? 'main') !== activeRoomId || (c.position.row < newH && c.position.col < newW)));
    setDeflectorConfig((dc) => dc.filter((c) => (c.position.roomId ?? 'main') !== activeRoomId || (c.position.row < newH && c.position.col < newW)));

    setSelection(null);
    setLockedCells((prev) => filterLockedCells(prev, newW, newH));
    setActiveCandidateIndex(null);
  }, [pendingW, pendingH, activeRoomId,
    setWidth, setHeight, setGrid, setObjects, setBoxes, setConveyorPowerRequired, setConveyorConfig,
    setTrampolineConfig, setDeflectorConfig, setSelection, setLockedCells, setActiveCandidateIndex]);

  // NOTE: `pushGridHistory` is intentionally NOT in the deps list. The original
  // implementation omitted it too, so `paintCell` keeps the history callback
  // captured when the tool/room last changed. Adding it would change undo
  // snapshots (behavior change) — kept as-is for this structural refactor.
  const paintCell = useCallback((r: number, c: number, isDrag: boolean) => {
    setActiveCandidateIndex(null);
    if (!isDrag) pushGridHistory();
    if (activeTool.startsWith('place_obj')) {
      const id = parseInt(activeTool.substring(9), 10);
      if (!isNaN(id)) {
        setObjects((os) => os.map((o) => o.id === id ? { ...o, row: r, col: c, roomId: activeRoomId } : o));
        return;
      }
    }
    if (activeTool === 'place_box' && activePlacingBoxId !== null) {
      setBoxes((bs) => bs.map((b) => b.id === activePlacingBoxId ? { ...b, row: r, col: c, roomId: activeRoomId } : b));
      setActivePlacingBoxId(null);
      setActiveTool(prevToolRef.current);
      return;
    }
    // BUG FIX: if still in place_box mode but no box to place, do nothing
    if (activeTool === 'place_box') return;
    if (activeTool === 'lock') {
      setLockedCells((prev) => {
        const key = `${r},${c}`;
        const next = { ...prev };
        if (isDrag) {
          if (paintMode.current === 'erase') {
            delete next[key];
          } else {
            next[key] = true;
          }
        } else {
          if (next[key]) {
            paintMode.current = 'erase';
            delete next[key];
          } else {
            paintMode.current = 'paint';
            next[key] = true;
          }
        }
        return next;
      });
      return;
    }
    // 'select' tool paints nothing
    if (activeTool === 'select') return;
    const cellType: CellType = activeTool === 'erase' ? 'empty' : (activeTool as CellType);
    setGrid((g) => {
      const next = g.map((row) => [...row]);
      if (isDrag) {
        if (paintMode.current === 'erase') { next[r][c] = 'empty'; return next; }
      } else {
        if (activeTool !== 'erase' && next[r][c] === cellType) { paintMode.current = 'erase'; next[r][c] = 'empty'; return next; }
        paintMode.current = 'paint';
      }
      if (cellType === 'target_1' || cellType === 'target_2') {
        for (let row = 0; row < next.length; row++)
          for (let col = 0; col < next[row].length; col++)
            if (next[row][col] === cellType) next[row][col] = 'empty';
      }
      next[r][c] = cellType;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see NOTE above (original deps preserved)
  }, [activeTool, activePlacingBoxId, setActiveTool, activeRoomId]);

  return { applyResize, paintCell };
}
