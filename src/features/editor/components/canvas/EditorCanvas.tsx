import { useRef } from 'react';
import { useEditorContext } from '../../EditorContext';
import { calculateRoomLayoutOffsets } from '@/game-engine/logic/engine/rooms';
import { usePortalDrag } from '../../hooks/usePortalDrag';
import RoomTabs from './RoomTabs';
import ActiveRoomSettings from './ActiveRoomSettings';
import SolutionPathOverlay from './SolutionPathOverlay';
import ActiveRoomFrame from './ActiveRoomFrame';
import InactiveRoomPreview from './InactiveRoomPreview';
import PortalConnectionsOverlay from './PortalConnectionsOverlay';
import PortalHandles from './PortalHandles';

interface EditorCanvasProps {
  isMobile: boolean;
  visible: boolean;
}

/**
 * Center canvas: room switcher bar + multi-room layout (active room editable,
 * others previewed), solution path, portal connections and drag handles.
 * Layer order (DOM + z-index) is unchanged from the pre-split component.
 */
export default function EditorCanvas({ isMobile, visible }: EditorCanvasProps) {
  const {
    rooms,
    setRooms,
    activeRoomId,
    switchActiveRoom,
    objects,
    boxes,
    cellSize,
    grid,
    width,
    height,
    edges,
    setEdges,
    optimalSolutionTrajectory,
    showSolutionPath,
    fogOfWar,
    fogVisibilityDistance,
    fogKeepRevealed,
  } = useEditorContext();

  const canvasRef = useRef<HTMLDivElement>(null);

  // The active room's working state lives in top-level context fields; overlay it for layout/rendering.
  const liveRooms = rooms.map((r) => {
    if (r.id === activeRoomId) {
      return { ...r, width, height, edges, grid, fogOfWar, fogVisibilityDistance, fogKeepRevealed };
    }
    return r;
  });

  const { roomPositions, totalWidth, totalHeight } = calculateRoomLayoutOffsets(liveRooms, cellSize, 80);

  const { draggingPortal, dragMousePos, startPortalDrag } = usePortalDrag({
    canvasRef, liveRooms, roomPositions, activeRoomId, setRooms, setEdges,
  });

  return (
    <div style={{
      flex: 1,
      display: isMobile ? (visible ? 'flex' : 'none') : 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start', // Fixes overflow alignment cut-off
      overflow: 'auto',
      padding: '12px 8px 8px',
      width: '100%',
    }}>
      {/* Room Switcher Panel */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        padding: '8px 16px',
        marginBottom: 16,
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(0, 196, 255, 0.15)',
        borderRadius: 8,
        width: '100%',
        maxWidth: 700,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        flexShrink: 0,
      }}>
        <RoomTabs />

        {/* Selected Room Settings */}
        <ActiveRoomSettings />
      </div>

      {/* Rooms Layout Canvas */}
      <div ref={canvasRef} style={{
        position: 'relative',
        width: totalWidth,
        height: totalHeight,
        margin: '24px auto',
        flexShrink: 0,
      }}>
        {showSolutionPath && optimalSolutionTrajectory && (
          <SolutionPathOverlay
            trajectory={optimalSolutionTrajectory}
            roomPositions={roomPositions}
            cellSize={cellSize}
            totalWidth={totalWidth}
            totalHeight={totalHeight}
          />
        )}
        {liveRooms.map((room) => {
          const offset = roomPositions[room.id];
          if (!offset) return null;
          if (room.id === activeRoomId) {
            return <ActiveRoomFrame key={room.id} room={room} offset={offset} />;
          }
          return (
            <InactiveRoomPreview
              key={room.id}
              room={room}
              offset={offset}
              cellSize={cellSize}
              objects={objects}
              boxes={boxes}
              onSelect={() => switchActiveRoom(room.id)}
            />
          );
        })}

        {/* Portal Connection SVG Overlay */}
        <PortalConnectionsOverlay
          liveRooms={liveRooms}
          roomPositions={roomPositions}
          cellSize={cellSize}
          totalWidth={totalWidth}
          totalHeight={totalHeight}
          draggingPortal={draggingPortal}
          dragMousePos={dragMousePos}
        />

        {/* Portal Handles Overlay */}
        <PortalHandles liveRooms={liveRooms} roomPositions={roomPositions} onStartDrag={startPortalDrag} />
      </div>

      <p style={{ fontSize: 9, color: '#1e3a5f', margin: '12px 0 0', letterSpacing: '0.06em', alignSelf: 'center', flexShrink: 0 }}>
        Paint · click same = clear · drag = fill · click edge strip = cycle wall/portal/lava
      </p>
    </div>
  );
}
