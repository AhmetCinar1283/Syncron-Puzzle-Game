import { useRef } from 'react';
import type { RefObject } from 'react';
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
  /** Hücre boyutu hesabı için ölçülen kaydırma alanı (bkz. useEditorLayout). */
  areaRef?: RefObject<HTMLDivElement | null>;
}

/**
 * Center canvas: room switcher bar + multi-room layout (active room editable,
 * others previewed), solution path, portal connections and drag handles.
 * Layer order (DOM + z-index) is unchanged from the pre-split component.
 */
export default function EditorCanvas({ isMobile, visible, areaRef }: EditorCanvasProps) {
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
      minWidth: 0,
      display: isMobile ? (visible ? 'flex' : 'none') : 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      width: '100%',
    }}>
      {/* Room Switcher Panel — sabit başlık, ızgaranın alanını yemez */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        padding: '7px 12px',
        margin: '8px 8px 0',
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(0, 196, 255, 0.15)',
        borderRadius: 8,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        flexShrink: 0,
      }}>
        <RoomTabs />

        {/* Selected Room Settings */}
        <ActiveRoomSettings />
      </div>

      {/* Ölçülen kaydırma alanı: hücre boyutu bu kutunun gerçek ölçüsünden çıkar */}
      <div
        ref={areaRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          scrollbarGutter: 'stable',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '10px 8px 8px',
        }}
      >
      {/* Rooms Layout Canvas */}
      <div ref={canvasRef} style={{
        position: 'relative',
        width: totalWidth,
        height: totalHeight,
        // Çerçevenin dışına taşan satır/sütun kontrolleri ve kenar şeritleri için pay
        margin: '48px auto 40px',
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

        <p style={{ fontSize: 9, color: '#1e3a5f', margin: '12px 0 0', letterSpacing: '0.06em', alignSelf: 'center', flexShrink: 0, textAlign: 'center', padding: '0 8px' }}>
          Dokun/tıkla = boya · aynı hücreye tekrar = sil · sürükle = doldur · kenar şeridi = duvar/portal/lav
        </p>
      </div>
    </div>
  );
}
