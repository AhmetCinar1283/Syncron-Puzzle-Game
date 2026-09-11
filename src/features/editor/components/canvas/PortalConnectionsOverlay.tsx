import type { ReactNode } from 'react';
import { getEdgePoint, routePortalPath } from '@/game-engine/logic/engine/rooms';
import type { DraggingPortal } from '../../hooks/usePortalDrag';
import { ROOM_SIDES, type EditorRoom, type RoomPositions, type RoomSide } from './canvasTypes';

interface PortalConnectionsOverlayProps {
  liveRooms: EditorRoom[];
  roomPositions: RoomPositions;
  cellSize: number;
  totalWidth: number;
  totalHeight: number;
  draggingPortal: DraggingPortal | null;
  dragMousePos: { x: number; y: number } | null;
}

/** SVG layer: routed lines between paired portal edges + the live drag line. */
export default function PortalConnectionsOverlay({
  liveRooms, roomPositions, cellSize, totalWidth, totalHeight, draggingPortal, dragMousePos,
}: PortalConnectionsOverlayProps) {
  const connections: { fromRoomId: string; fromSide: RoomSide; toRoomId: string; toSide: RoomSide }[] = [];
  const seen = new Set<string>();
  for (const room of liveRooms) {
    for (const side of ROOM_SIDES) {
      const edge = room.edges[side];
      if (edge && edge.type === 'portal' && edge.targetRoomId && edge.targetEdge) {
        const targetRoomId = edge.targetRoomId;
        const targetEdge = edge.targetEdge;
        const connectionKey = [`${room.id}:${side}`, `${targetRoomId}:${targetEdge}`].sort().join('--');
        if (!seen.has(connectionKey)) {
          seen.add(connectionKey);
          connections.push({ fromRoomId: room.id, fromSide: side, toRoomId: targetRoomId, toSide: targetEdge });
        }
      }
    }
  }

  const connectionPaths: ReactNode[] = [];
  connections.forEach((conn, connIdx) => {
    const pathD = routePortalPath(
      conn.fromRoomId,
      conn.fromSide,
      conn.toRoomId,
      conn.toSide,
      roomPositions,
      liveRooms,
      cellSize,
      80, // gap for editor
      connIdx,
      connections.length
    );

    connectionPaths.push(
      <g key={`${conn.fromRoomId}-${conn.fromSide}-${conn.toRoomId}-${conn.toSide}`}>
        <path
          d={pathD}
          fill="none"
          stroke="rgba(168, 85, 247, 0.45)"
          strokeWidth={6}
          strokeLinecap="round"
          filter="blur(3px)"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#c084fc"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="6, 6"
          style={{
            animation: 'crawlPath 1.2s linear infinite',
          }}
        />
      </g>
    );
  });

  let draggingLinePath = '';
  if (draggingPortal && dragMousePos) {
    const offset = roomPositions[draggingPortal.roomId];
    if (offset) {
      const pA = getEdgePoint(offset, draggingPortal.side);
      const controlOffset = 45;
      let cp1x = pA.x;
      let cp1y = pA.y;
      if (draggingPortal.side === 'left') cp1x -= controlOffset;
      else if (draggingPortal.side === 'right') cp1x += controlOffset;
      else if (draggingPortal.side === 'top') cp1y -= controlOffset;
      else if (draggingPortal.side === 'bottom') cp1y += controlOffset;

      draggingLinePath = `M ${pA.x} ${pA.y} C ${cp1x} ${cp1y}, ${dragMousePos.x} ${dragMousePos.y}, ${dragMousePos.x} ${dragMousePos.y}`;
    }
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: totalWidth,
        height: totalHeight,
        pointerEvents: 'none',
        zIndex: 22,
      }}
    >
      {connectionPaths}
      {draggingPortal && dragMousePos && draggingLinePath && (
        <g>
          <path
            d={draggingLinePath}
            fill="none"
            stroke="rgba(168, 85, 247, 0.6)"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <path
            d={draggingLinePath}
            fill="none"
            stroke="#c084fc"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="4, 4"
          />
        </g>
      )}
    </svg>
  );
}
