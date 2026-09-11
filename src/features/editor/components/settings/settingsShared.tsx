import type { ReactNode } from 'react';
import type { CellType } from '@/game-engine/level-format';

export interface CellRef { r: number; c: number }

/** Coordinates (row-major) of cells in the active room grid matching `pred`. */
export function collectCells(grid: CellType[][], width: number, height: number, pred: (cell: CellType) => boolean): CellRef[] {
  const out: CellRef[] = [];
  for (let r = 0; r < height; r++)
    for (let c = 0; c < width; c++)
      if (grid[r] && grid[r][c] && pred(grid[r][c]))
        out.push({ r, c });
  return out;
}

/** Uppercase colored section caption used by every bottom-panel section. */
export function SectionHeading({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color, marginBottom: 8 }}>
      {children}
    </div>
  );
}
