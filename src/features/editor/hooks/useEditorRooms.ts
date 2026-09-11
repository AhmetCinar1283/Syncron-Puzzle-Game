import { useCallback, useState } from 'react';
import type { ControlMode } from '@/game-engine/logic/types';
import { makeGrid } from '../lib/editorConfig';
import type { LevelDocument } from './useLevelDocument';

/**
 * Multi-room state. The ACTIVE room's grid/edges/size/fog live in the level
 * document (so the grid tools stay single-room); `rooms` holds the other rooms
 * plus a possibly stale copy of the active one, which is flushed back on
 * switch/add. Logic copied verbatim from the former `useEditorState`.
 *
 * `rooms` stays `any[]` on purpose: `EditorContextValue.rooms` and
 * `LevelData.rooms` are `any[]`, and the public API must not change in this
 * refactor (see `lib/levelSnapshot.ts#EditorRoom` for the real shape).
 */
export function useEditorRooms(doc: LevelDocument) {
  const {
    width, height, edges, grid, fogOfWar, fogVisibilityDistance, fogKeepRevealed,
    setWidth, setHeight, setPendingW, setPendingH, setEdges, setGrid,
    setFogOfWar, setFogVisibilityDistance, setFogKeepRevealed,
    setObjects, setBoxes, setConveyorPowerRequired, setConveyorConfig,
    setTrampolineConfig, setDeflectorConfig,
  } = doc;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- public API (EditorContextValue.rooms) is any[]
  const [rooms, setRooms] = useState<any[]>(() => [
    {
      id: 'main',
      name: 'Main Room',
      width: 5,
      height: 5,
      x: 0,
      y: 0,
      edges: {
        top: { type: 'wall' },
        bottom: { type: 'wall' },
        left: { type: 'wall' },
        right: { type: 'wall' },
      },
      grid: makeGrid(5, 5),
    }
  ]);
  const [activeRoomId, setActiveRoomId] = useState<string>('main');
  const [controlMode, setControlMode] = useState<ControlMode>('all_rooms');

  const switchActiveRoom = useCallback((newId: string) => {
    setRooms((prevRooms) => {
      const updated = prevRooms.map((r) => {
        if (r.id === activeRoomId) {
          return { ...r, width, height, edges, grid, fogOfWar, fogVisibilityDistance, fogKeepRevealed, customData: r.customData ?? {} };
        }
        return r;
      });

      const targetRoom = updated.find((r) => r.id === newId);
      if (targetRoom) {
        setActiveRoomId(newId);
        setWidth(targetRoom.width);
        setHeight(targetRoom.height);
        setPendingW(targetRoom.width);
        setPendingH(targetRoom.height);
        setEdges(targetRoom.edges);
        setGrid(targetRoom.grid);
        setFogOfWar(targetRoom.fogOfWar ?? false);
        setFogVisibilityDistance(targetRoom.fogVisibilityDistance ?? 1.5);
        setFogKeepRevealed(targetRoom.fogKeepRevealed ?? true);
      }
      return updated;
    });
  }, [activeRoomId, width, height, edges, grid, fogOfWar, fogVisibilityDistance, fogKeepRevealed,
    setWidth, setHeight, setPendingW, setPendingH, setEdges, setGrid, setFogOfWar, setFogVisibilityDistance, setFogKeepRevealed]);

  const addRoom = useCallback(() => {
    // Find first unoccupied layout slot in the 6x6 grid [0..5]
    let newX = 0;
    let newY = 0;
    let found = false;
    for (let y = 0; y <= 5; y++) {
      for (let x = 0; x <= 5; x++) {
        if (!rooms.some((r) => r.x === x && r.y === y)) {
          newX = x;
          newY = y;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    const newId = `room_${Date.now()}`;
    const newRoom = {
      id: newId,
      name: `Room ${rooms.length + 1}`,
      width: 5,
      height: 5,
      x: newX,
      y: newY,
      edges: {
        top: { type: 'wall' },
        bottom: { type: 'wall' },
        left: { type: 'wall' },
        right: { type: 'wall' },
      },
      grid: makeGrid(5, 5),
      fogOfWar: false,
      fogVisibilityDistance: 1.5,
      fogKeepRevealed: true,
    };

    setRooms((prevRooms) => {
      const updated = prevRooms.map((r) => {
        if (r.id === activeRoomId) {
          return { ...r, width, height, edges, grid, fogOfWar, fogVisibilityDistance, fogKeepRevealed };
        }
        return r;
      });
      return [...updated, newRoom];
    });

    setActiveRoomId(newId);
    setWidth(5);
    setHeight(5);
    setPendingW(5);
    setPendingH(5);
    setEdges({
      top: { type: 'wall' },
      bottom: { type: 'wall' },
      left: { type: 'wall' },
      right: { type: 'wall' },
    });
    setGrid(makeGrid(5, 5));
    setFogOfWar(false);
    setFogVisibilityDistance(1.5);
    setFogKeepRevealed(true);
  }, [rooms, activeRoomId, width, height, edges, grid, fogOfWar, fogVisibilityDistance, fogKeepRevealed,
    setWidth, setHeight, setPendingW, setPendingH, setEdges, setGrid, setFogOfWar, setFogVisibilityDistance, setFogKeepRevealed]);

  const deleteRoom = useCallback((idToDelete: string) => {
    if (rooms.length <= 1) return;

    setRooms((prevRooms) => {
      const remaining = prevRooms.filter((r) => r.id !== idToDelete).map((r) => {
        let rChanged = false;
        const nextRoomEdges = { ...r.edges };
        for (const s of ['top', 'bottom', 'left', 'right'] as const) {
          const edge = nextRoomEdges[s];
          if (edge && edge.type === 'portal' && edge.targetRoomId === idToDelete) {
            nextRoomEdges[s] = {
              ...edge,
              targetRoomId: undefined,
              targetEdge: undefined,
            };
            rChanged = true;
          }
        }
        if (rChanged) {
          return { ...r, edges: nextRoomEdges };
        }
        return r;
      });

      if (activeRoomId === idToDelete) {
        const fallbackRoom = remaining[0];
        setActiveRoomId(fallbackRoom.id);
        setWidth(fallbackRoom.width);
        setHeight(fallbackRoom.height);
        setPendingW(fallbackRoom.width);
        setPendingH(fallbackRoom.height);
        setEdges(fallbackRoom.edges);
        setGrid(fallbackRoom.grid);
        setFogOfWar(fallbackRoom.fogOfWar ?? false);
        setFogVisibilityDistance(fallbackRoom.fogVisibilityDistance ?? 1.5);
        setFogKeepRevealed(fallbackRoom.fogKeepRevealed ?? true);
      }
      return remaining;
    });

    setObjects((os) => os.filter((o) => (o.roomId ?? 'main') !== idToDelete));
    setBoxes((bs) => bs.filter((b) => (b.roomId ?? 'main') !== idToDelete));
    setConveyorPowerRequired((cpr) => cpr.filter((pos) => (pos.roomId ?? 'main') !== idToDelete));
    setConveyorConfig((cc) => cc.filter((c) => (c.position.roomId ?? 'main') !== idToDelete));
    setTrampolineConfig((tc) => tc.filter((c) => (c.position.roomId ?? 'main') !== idToDelete));
    setDeflectorConfig((dc) => dc.filter((c) => (c.position.roomId ?? 'main') !== idToDelete));
  }, [rooms.length, activeRoomId,
    setWidth, setHeight, setPendingW, setPendingH, setEdges, setGrid, setFogOfWar, setFogVisibilityDistance, setFogKeepRevealed,
    setObjects, setBoxes, setConveyorPowerRequired, setConveyorConfig, setTrampolineConfig, setDeflectorConfig]);

  const updateRoomName = useCallback((id: string, newName: string) => {
    setRooms((prev) => prev.map((r) => r.id === id ? { ...r, name: newName } : r));
  }, []);

  const updateRoomLayoutPosition = useCallback((id: string, x: number, y: number) => {
    const clampedX = Math.max(0, Math.min(5, Math.floor(x)));
    const clampedY = Math.max(0, Math.min(5, Math.floor(y)));

    setRooms((prev) => {
      const duplicateRoom = prev.find((r) => r.id !== id && r.x === clampedX && r.y === clampedY);

      if (duplicateRoom) {
        const currentRoom = prev.find((r) => r.id === id);
        if (currentRoom) {
          const originalX = currentRoom.x;
          const originalY = currentRoom.y;

          return prev.map((r) => {
            if (r.id === id) {
              return { ...r, x: clampedX, y: clampedY };
            }
            if (r.id === duplicateRoom.id) {
              return { ...r, x: originalX, y: originalY };
            }
            return r;
          });
        }
      }

      return prev.map((r) => r.id === id ? { ...r, x: clampedX, y: clampedY } : r);
    });
  }, []);

  return {
    rooms, setRooms, activeRoomId, setActiveRoomId, controlMode, setControlMode,
    switchActiveRoom, addRoom, deleteRoom, updateRoomName, updateRoomLayoutPosition,
  };
}

export type EditorRoomsApi = ReturnType<typeof useEditorRooms>;
