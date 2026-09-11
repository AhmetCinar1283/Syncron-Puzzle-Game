import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import { ROOM_SIDES, type EditorRoom, type RoomPositions, type RoomSide } from './canvasTypes';

interface PortalHandlesProps {
  liveRooms: EditorRoom[];
  roomPositions: RoomPositions;
  onStartDrag: (e: ReactMouseEvent, roomId: string, side: RoomSide) => void;
}

const BAR_LENGTH = 28;
const BAR_THICKNESS = 8;

/** Draggable purple bars on every portal edge; drag one onto another to pair them. */
export default function PortalHandles({ liveRooms, roomPositions, onStartDrag }: PortalHandlesProps) {
  return (
    <>
      {liveRooms.map((room) => {
        const offset = roomPositions[room.id];
        if (!offset) return null;

        return ROOM_SIDES.map((side) => {
          const edge = room.edges[side];
          if (!edge || edge.type !== 'portal') return null;

          const isConnected = !!edge.targetRoomId && !!edge.targetEdge;

          const handleStyle: CSSProperties = {
            position: 'absolute',
            backgroundColor: isConnected ? '#a855f7' : 'rgba(168, 85, 247, 0.25)',
            border: `2px ${isConnected ? 'solid' : 'dashed'} #c084fc`,
            boxShadow: isConnected ? '0 0 10px rgba(168, 85, 247, 0.8)' : 'none',
            cursor: 'grab',
            zIndex: 36,
            borderRadius: 4,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          };

          if (side === 'top') {
            handleStyle.left = offset.left + offset.width / 2 - BAR_LENGTH / 2;
            handleStyle.top = offset.top - BAR_THICKNESS - 3;
            handleStyle.width = BAR_LENGTH;
            handleStyle.height = BAR_THICKNESS;
          } else if (side === 'bottom') {
            handleStyle.left = offset.left + offset.width / 2 - BAR_LENGTH / 2;
            handleStyle.top = offset.top + offset.height + 3;
            handleStyle.width = BAR_LENGTH;
            handleStyle.height = BAR_THICKNESS;
          } else if (side === 'left') {
            handleStyle.left = offset.left - BAR_THICKNESS - 3;
            handleStyle.top = offset.top + offset.height / 2 - BAR_LENGTH / 2;
            handleStyle.width = BAR_THICKNESS;
            handleStyle.height = BAR_LENGTH;
          } else if (side === 'right') {
            handleStyle.left = offset.left + offset.width + 3;
            handleStyle.top = offset.top + offset.height / 2 - BAR_LENGTH / 2;
            handleStyle.width = BAR_THICKNESS;
            handleStyle.height = BAR_LENGTH;
          }

          return (
            <div
              key={`${room.id}-${side}-handle`}
              style={handleStyle}
              title={`${room.name} ${side} Portal handle. Drag to connect.`}
              onMouseDown={(e) => onStartDrag(e, room.id, side)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.25)';
                e.currentTarget.style.boxShadow = '0 0 15px #d8b4fe';
                e.currentTarget.style.backgroundColor = '#a855f7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = isConnected ? '0 0 10px rgba(168, 85, 247, 0.8)' : 'none';
                e.currentTarget.style.backgroundColor = isConnected ? '#a855f7' : 'rgba(168, 85, 247, 0.25)';
              }}
            />
          );
        });
      })}
    </>
  );
}
