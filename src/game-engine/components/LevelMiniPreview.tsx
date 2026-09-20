'use client';

import type { CellType, LevelData } from '@/game-engine/level-format';
import GameCellAdapter from '@/game-engine/components/GameCellAdapter';
import { getPlayerColor } from '@/game-engine/components/playerColors';

export interface LevelMiniPreviewProps {
  level: LevelData;
  cellSize?: number;
  maxBoardSize?: number;
}

/**
 * DOSYA AMACI: Bir level'ın küçük, etkileşimsiz önizlemesi (çok odalı yerleşim ya da
 * tek grid). Editörün üretici adayları, admin günlük bulmaca takvimi ve önizleme modalı kullanır.
 */
export default function LevelMiniPreview({ level, cellSize, maxBoardSize }: LevelMiniPreviewProps) {
  const isMultiRoom = level.rooms && level.rooms.length > 0;

  if (isMultiRoom) {
    const rooms = level.rooms!;
    const minX = Math.min(...rooms.map(r => r.x));
    const maxX = Math.max(...rooms.map(r => r.x));
    const minY = Math.min(...rooms.map(r => r.y));
    const maxY = Math.max(...rooms.map(r => r.y));
    const layoutCols = maxX - minX + 1;
    const layoutRows = maxY - minY + 1;

    // Keep cell size compact so multi-room preview fits card container (or scales with maxBoardSize)
    const baseTarget = maxBoardSize ? maxBoardSize * 0.75 : 65;
    const maxAllowed = maxBoardSize ? 24 : 8;
    const miniCellSize = cellSize ?? Math.max(3, Math.min(maxAllowed, Math.floor(baseTarget / Math.max(level.width, level.height) / Math.max(layoutCols, layoutRows))));
    const roomGap = 3;
    const boardWidth = layoutCols * (level.width * miniCellSize) + (layoutCols - 1) * roomGap;
    const boardHeight = layoutRows * (level.height * miniCellSize) + (layoutRows - 1) * roomGap;

    return (
      <div style={{
        position: 'relative',
        width: boardWidth,
        height: boardHeight,
        background: '#040914',
        borderRadius: 4,
        alignSelf: 'center',
        boxSizing: 'content-box',
        minHeight: 50,
        minWidth: 50,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {rooms.map((room) => {
          const roomLeft = (room.x - minX) * (room.width * miniCellSize + roomGap);
          const roomTop = (room.y - minY) * (room.height * miniCellSize + roomGap);

          return (
            <div
              key={room.id}
              style={{
                position: 'absolute',
                left: roomLeft,
                top: roomTop,
                width: room.width * miniCellSize,
                height: room.height * miniCellSize,
                background: '#040914',
                border: '1.2px solid rgba(0,196,255,0.2)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {/* Cells Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${room.width}, ${miniCellSize}px)`,
                gridTemplateRows: `repeat(${room.height}, ${miniCellSize}px)`,
              }}>
                {room.grid.map((row: CellType[], r: number) =>
                  row.map((cell: CellType, c: number) => (
                    <GameCellAdapter key={`${r}-${c}`} cellType={cell} cellSize={miniCellSize} />
                  ))
                )}
              </div>

              {/* Boxes */}
              {(level.initialBoxes || []).filter(b => (b.position.roomId ?? 'main') === room.id).map((box) => {
                const pad = Math.round(miniCellSize * 0.1);
                const size = miniCellSize - pad * 2;
                const isPowered = false;
                const isUnpowered = box.requiresPower && !isPowered;

                return (
                  <div
                    key={`box-${box.id}`}
                    style={{
                      position: 'absolute',
                      top: box.position.row * miniCellSize + pad,
                      left: box.position.col * miniCellSize + pad,
                      width: size,
                      height: size,
                      borderRadius: 1,
                      background: isUnpowered ? 'rgba(30, 40, 55, 0.9)' : 'rgba(15, 23, 35, 0.95)',
                      border: `${Math.max(1, Math.round(miniCellSize * 0.06))}px solid ${isUnpowered ? 'rgba(71, 85, 105, 0.5)' : '#f97316'}`,
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  />
                );
              })}

              {/* Players */}
              {level.initialObjects.filter(o => (o.position.roomId ?? 'main') === room.id).map((obj) => {
                const pad = Math.round(miniCellSize * 0.12);
                const size = miniCellSize - pad * 2;
                const { hex: bg } = getPlayerColor(obj.id - 1);

                return (
                  <div
                    key={`player-${obj.id}`}
                    style={{
                      position: 'absolute',
                      top: obj.position.row * miniCellSize + pad,
                      left: obj.position.col * miniCellSize + pad,
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      backgroundColor: bg,
                      zIndex: 10,
                      pointerEvents: 'none',
                      boxShadow: `0 0 ${Math.max(1, Math.round(miniCellSize * 0.2))}px ${bg}aa`,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  const baseTarget = maxBoardSize ?? 100;
  const maxAllowed = maxBoardSize ? 36 : 20;
  const miniCellSize = cellSize ?? Math.max(12, Math.min(maxAllowed, Math.floor(baseTarget / Math.max(level.width, level.height))));
  const boardWidth = level.width * miniCellSize;
  const boardHeight = level.height * miniCellSize;

  return (
    <div style={{
      position: 'relative',
      width: boardWidth,
      height: boardHeight,
      background: '#040914',
      border: '1.5px solid rgba(0,196,255,0.25)',
      borderRadius: 4,
      overflow: 'hidden',
      boxSizing: 'content-box',
      alignSelf: 'center'
    }}>
      {/* Cells Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${level.width}, ${miniCellSize}px)`,
        gridTemplateRows: `repeat(${level.height}, ${miniCellSize}px)`,
      }}>
        {level.grid.map((row, r) =>
          row.map((cell, c) => (
            <GameCellAdapter key={`${r}-${c}`} cellType={cell} cellSize={miniCellSize} />
          ))
        )}
      </div>

      {/* Boxes */}
      {(level.initialBoxes || []).map((box) => {
        const pad = Math.round(miniCellSize * 0.1);
        const size = miniCellSize - pad * 2;
        const isPowered = false;
        const isUnpowered = box.requiresPower && !isPowered;

        return (
          <div
            key={`box-${box.id}`}
            style={{
              position: 'absolute',
              top: box.position.row * miniCellSize + pad,
              left: box.position.col * miniCellSize + pad,
              width: size,
              height: size,
              borderRadius: 2,
              background: isUnpowered ? 'rgba(30, 40, 55, 0.9)' : 'rgba(15, 23, 35, 0.95)',
              border: `${Math.max(1, Math.round(miniCellSize * 0.06))}px solid ${isUnpowered ? 'rgba(71, 85, 105, 0.5)' : '#f97316'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: size * 0.55, color: isUnpowered ? '#334155' : '#f97316', fontWeight: 'bold', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ▣
            </span>
          </div>
        );
      })}

      {/* Players */}
      {level.initialObjects.map((obj) => {
        const pad = Math.round(miniCellSize * 0.12);
        const size = miniCellSize - pad * 2;
        const { hex: bg } = getPlayerColor(obj.id - 1);
        const textColor = '#060d1a';

        return (
          <div
            key={`player-${obj.id}`}
            style={{
              position: 'absolute',
              top: obj.position.row * miniCellSize + pad,
              left: obj.position.col * miniCellSize + pad,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              pointerEvents: 'none',
              boxShadow: `0 0 ${Math.max(2, Math.round(miniCellSize * 0.2))}px ${bg}aa`,
            }}
          >
            <span style={{ fontSize: size * 0.6, color: textColor, fontWeight: 'bold', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {obj.mode === 'reversed' ? '⬇' : '⬆'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
