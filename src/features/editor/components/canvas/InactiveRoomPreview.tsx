import GameCellAdapter from '@/game-engine/components/GameCellAdapter';
import { getPlayerColor } from '@/game-engine/components/playerColors';
import type { CellType, EdgeBehavior } from '@/game-engine/level-format';
import { EDGE_COLOR } from '../../lib/editorConfig';
import type { BoxConfig, ObjConfig } from '../../lib/editorConfig';
import type { EditorRoom, RoomPositions } from './canvasTypes';

interface InactiveRoomPreviewProps {
  room: EditorRoom;
  offset: RoomPositions[string];
  cellSize: number;
  objects: ObjConfig[];
  boxes: BoxConfig[];
  onSelect: () => void;
}

/** Read-only, dimmed render of a non-active room; click switches to it. */
export default function InactiveRoomPreview({ room, offset, cellSize, objects, boxes, onSelect }: InactiveRoomPreviewProps) {
  return (
    <div
      onClick={onSelect}
      style={{
        position: 'absolute',
        left: offset.left,
        top: offset.top,
        width: offset.width,
        height: offset.height,
        border: '2px dashed rgba(148, 163, 184, 0.3)',
        borderRadius: 8,
        cursor: 'pointer',
        background: '#040914',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'visible',
        zIndex: 10,
      }}
    >
      {/* Room Title */}
      <div style={{
        position: 'absolute',
        top: -22,
        left: 2,
        fontSize: 10,
        fontWeight: 800,
        color: 'rgba(148, 163, 184, 0.6)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        whiteSpace: 'nowrap',
      }}>
        {room.name} <span style={{ color: '#00ff88', fontSize: 9, marginLeft: 6, opacity: 0.8 }}>✎ Edit</span>
      </div>

      {/* Edge strips for inactive room */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderTop: `3px solid ${EDGE_COLOR[room.edges.top.type as EdgeBehavior]}`,
        borderBottom: `3px solid ${EDGE_COLOR[room.edges.bottom.type as EdgeBehavior]}`,
        borderLeft: `3px solid ${EDGE_COLOR[room.edges.left.type as EdgeBehavior]}`,
        borderRight: `3px solid ${EDGE_COLOR[room.edges.right.type as EdgeBehavior]}`,
        borderRadius: 6,
        pointerEvents: 'none',
        zIndex: 20,
      }} />

      {/* Grid cells */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${room.width}, ${cellSize}px)`,
        width: '100%',
        height: '100%',
        opacity: 0.65,
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        {room.grid.map((row: CellType[], rIdx: number) =>
          row.map((cellType: CellType, cIdx: number) => {
            const player = objects.find(o => (o.roomId ?? 'main') === room.id && o.row === rIdx && o.col === cIdx);
            const box = boxes.find(b => (b.roomId ?? 'main') === room.id && b.row === rIdx && b.col === cIdx);

            return (
              <div
                key={`${rIdx}-${cIdx}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  position: 'relative',
                }}
              >
                <GameCellAdapter
                  cellType={cellType}
                  cellSize={cellSize}
                />
                {player && (
                  <div style={{
                    position: 'absolute',
                    top: Math.floor(cellSize * 0.14),
                    left: Math.floor(cellSize * 0.14),
                    width: cellSize - Math.floor(cellSize * 0.14) * 2,
                    height: cellSize - Math.floor(cellSize * 0.14) * 2,
                    borderRadius: '50%',
                    background: getPlayerColor(player.id - 1).hex,
                    boxShadow: `0 0 8px ${getPlayerColor(player.id - 1).hex}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 30,
                  }}>
                    <span style={{ fontSize: cellSize * 0.28, fontWeight: 900, color: '#000' }}>
                      P{player.id}
                    </span>
                  </div>
                )}
                {box && (
                  <div style={{
                    position: 'absolute',
                    top: Math.round(cellSize * 0.1),
                    left: Math.round(cellSize * 0.1),
                    width: cellSize - Math.round(cellSize * 0.1) * 2,
                    height: cellSize - Math.round(cellSize * 0.1) * 2,
                    borderRadius: 6,
                    border: '2px solid #f97316',
                    background: 'rgba(15,23,35,0.9)',
                    boxShadow: '0 0 8px rgba(249,115,22,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 30,
                  }}>
                    <span style={{ fontSize: cellSize * 0.28, color: '#f97316', fontWeight: 'bold' }}>▣</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
