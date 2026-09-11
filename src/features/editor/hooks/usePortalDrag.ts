import { useEffect, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import { getEdgePoint } from '@/game-engine/logic/engine/rooms';
import type { EditorContextValue } from '../EditorContext';
import { ROOM_SIDES, type EditorRoom, type RoomPositions, type RoomSide } from '../components/canvas/canvasTypes';

export interface DraggingPortal { roomId: string; side: RoomSide }

interface UsePortalDragArgs {
  canvasRef: RefObject<HTMLDivElement | null>;
  liveRooms: EditorRoom[];
  roomPositions: RoomPositions;
  activeRoomId: string;
  setRooms: EditorContextValue['setRooms'];
  setEdges: EditorContextValue['setEdges'];
}

/**
 * Drag-to-connect for portal edges on the multi-room canvas (moved verbatim
 * from EditorCanvas). While dragging, window mousemove/mouseup listeners are
 * attached; on mouseup the nearest other portal handle within 25px becomes the
 * new pair (both sides linked), the old pairing is cleared on both rooms, and
 * the active room's `edges` state is mirrored via `setEdges`.
 */
export function usePortalDrag({ canvasRef, liveRooms, roomPositions, activeRoomId, setRooms, setEdges }: UsePortalDragArgs) {
  const [draggingPortal, setDraggingPortal] = useState<DraggingPortal | null>(null);
  const [dragMousePos, setDragMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!draggingPortal) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setDragMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!canvasRef.current) {
        setDraggingPortal(null);
        setDragMousePos(null);
        return;
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const upX = e.clientX - rect.left;
      const upY = e.clientY - rect.top;

      let target: DraggingPortal | null = null;
      let minDistance = 25;

      for (const r of liveRooms) {
        const offset = roomPositions[r.id];
        if (!offset) continue;

        for (const side of ROOM_SIDES) {
          if (r.id === draggingPortal.roomId && side === draggingPortal.side) continue;

          const edge = r.edges[side];
          if (!edge || edge.type !== 'portal') continue;

          const ep = getEdgePoint(offset, side);
          const hpX = ep.x + (side === 'left' ? -5 : side === 'right' ? 5 : 0);
          const hpY = ep.y + (side === 'top' ? -5 : side === 'bottom' ? 5 : 0);

          const dist = Math.sqrt((upX - hpX) ** 2 + (upY - hpY) ** 2);
          if (dist < minDistance) {
            minDistance = dist;
            target = { roomId: r.id, side };
          }
        }
      }

      const draggingRoom = liveRooms.find((r) => r.id === draggingPortal.roomId);
      const prevTargetRoomId = draggingRoom?.edges[draggingPortal.side]?.targetRoomId;
      const prevTargetEdge = draggingRoom?.edges[draggingPortal.side]?.targetEdge;

      setRooms((prevRooms) => {
        return prevRooms.map((room) => {
          const nextEdges = { ...room.edges };
          let changed = false;

          // Disconnect from old target
          if (room.id === draggingPortal.roomId) {
            nextEdges[draggingPortal.side] = {
              ...nextEdges[draggingPortal.side],
              targetRoomId: undefined,
              targetEdge: undefined,
            };
            changed = true;
          }
          if (prevTargetRoomId && room.id === prevTargetRoomId && prevTargetEdge) {
            nextEdges[prevTargetEdge] = {
              ...nextEdges[prevTargetEdge],
              targetRoomId: undefined,
              targetEdge: undefined,
            };
            changed = true;
          }

          // Connect to new target
          if (target) {
            if (room.id === draggingPortal.roomId) {
              nextEdges[draggingPortal.side] = {
                ...nextEdges[draggingPortal.side],
                targetRoomId: target.roomId,
                targetEdge: target.side,
              };
              changed = true;
            }
            if (room.id === target.roomId) {
              nextEdges[target.side] = {
                ...nextEdges[target.side],
                targetRoomId: draggingPortal.roomId,
                targetEdge: draggingPortal.side,
              };
              changed = true;
            }
          }

          if (changed) {
            if (room.id === activeRoomId) {
              setEdges(nextEdges);
            }
            return { ...room, edges: nextEdges };
          }
          return room;
        });
      });

      setDraggingPortal(null);
      setDragMousePos(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingPortal, liveRooms, roomPositions, activeRoomId, setRooms, setEdges, canvasRef]);

  /** mousedown on a portal handle: start dragging from that room side. */
  const startPortalDrag = (e: ReactMouseEvent, roomId: string, side: RoomSide) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingPortal({ roomId, side });
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return { draggingPortal, dragMousePos, startPortalDrag };
}
