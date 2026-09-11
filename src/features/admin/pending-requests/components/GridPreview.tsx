import type { CellType } from '@/game-engine/level-format';
import GameCellAdapter from '@/game-engine/components/GameCellAdapter';

export function GridPreview({ grid, cellSize = 20 }: { grid: CellType[][]; cellSize?: number }) {
  return (
    <div style={{ display: 'inline-block', background: '#060d1a', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(30,58,95,0.4)' }}>
      {grid.map((row, r) => (
        <div key={r} style={{ display: 'flex' }}>
          {row.map((cell, c) => (
            <GameCellAdapter key={c} cellType={cell} cellSize={cellSize} />
          ))}
        </div>
      ))}
    </div>
  );
}
