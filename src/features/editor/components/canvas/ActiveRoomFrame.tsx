import GridCore from './GridCore';
import GridEdgeStrip from './GridEdgeStrip';
import SelectionLayer from './SelectionLayer';
import { ColControls, RowControls, COL_CTRL_H, ROW_CTRL_W } from './GridRowColControls';
import type { EditorRoom, RoomPositions } from './canvasTypes';

interface ActiveRoomFrameProps {
  room: EditorRoom;
  offset: RoomPositions[string];
}

/** The editable room: highlighted frame, title, row/col controls, and the interactive grid layers. */
export default function ActiveRoomFrame({ room, offset }: ActiveRoomFrameProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: offset.left,
        top: offset.top,
        width: offset.width,
        height: offset.height,
        border: '2px solid #00c4ff',
        boxShadow: '0 0 25px rgba(0, 196, 255, 0.45)',
        borderRadius: 8,
        zIndex: 30,
      }}
    >
      {/* Active Room Title */}
      <div style={{
        position: 'absolute',
        top: -22,
        left: 2,
        fontSize: 10,
        fontWeight: 800,
        color: '#00c4ff',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        textShadow: '0 0 8px rgba(0, 196, 255, 0.4)',
      }}>
        {room.name}
      </div>

      {/* Column controls at the top of the active room */}
      <div style={{
        position: 'absolute',
        top: -COL_CTRL_H - 12,
        left: -10,
        right: -10,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 40,
      }}>
        <ColControls />
      </div>

      {/* Row controls at the right of the active room */}
      <div style={{
        position: 'absolute',
        right: -ROW_CTRL_W - 12,
        top: -10,
        bottom: -10,
        display: 'flex',
        alignItems: 'center',
        zIndex: 40,
      }}>
        <RowControls />
      </div>

      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <GridEdgeStrip />
        <GridCore />
        <SelectionLayer />
      </div>
    </div>
  );
}
