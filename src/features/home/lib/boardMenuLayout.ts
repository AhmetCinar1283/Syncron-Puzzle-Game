export type MenuDirection = 'up' | 'down' | 'left' | 'right';

export const PROFILE_INDEX = -1;

export interface BoardPlayerCoords {
  p1: { row: number; col: number };
  p2: { row: number; col: number };
}

/**
 * Maps each option ID to its docking coordinates for Player 1 and Player 2
 * on a standard 4-column board grid.
 */
export const BOARD_OPTION_COORDS: Record<string, BoardPlayerCoords> = {
  play: {
    p1: { row: 1, col: 1 },
    p2: { row: 1, col: 2 },
  },
  daily: {
    p1: { row: 0, col: 0 },
    p2: { row: 0, col: 1 },
  },
  levels: {
    p1: { row: 0, col: 2 },
    p2: { row: 0, col: 3 },
  },
  friends: {
    p1: { row: 2, col: 0 },
    p2: { row: 2, col: 1 },
  },
  editor: {
    p1: { row: 2, col: 2 },
    p2: { row: 2, col: 3 },
  },
  controls: {
    p1: { row: 3, col: 0 },
    p2: { row: 3, col: 1 },
  },
  theme: {
    p1: { row: 3, col: 1 },
    p2: { row: 3, col: 2 },
  },
  admin: {
    p1: { row: 3, col: 2 },
    p2: { row: 3, col: 3 },
  },
};

/**
 * Returns the player docking coordinates for a given option ID,
 * falling back to center core if unknown.
 */
export function getBoardCoordsForOption(optionId: string): BoardPlayerCoords {
  return BOARD_OPTION_COORDS[optionId] || BOARD_OPTION_COORDS.play;
}

/**
 * Organizes menu options into board rows.
 * Options with isHero (e.g. 'play') take a full row alone.
 * Other options pair up into 2 items per row.
 */
export function buildBoardMenuRows(optionIds: readonly string[]): string[][] {
  const rows: string[][] = [];
  let pending: string[] = [];

  for (const id of optionIds) {
    if (id === 'play') {
      if (pending.length > 0) {
        rows.push(pending);
        pending = [];
      }
      rows.push([id]);
    } else {
      pending.push(id);
      if (pending.length === 2) {
        rows.push(pending);
        pending = [];
      }
    }
  }

  if (pending.length > 0) {
    rows.push(pending);
  }

  return rows;
}

/**
 * Calculates next selected option index based on direction input
 * across the board menu grid.
 */
export function moveBoardSelection(
  currentIndex: number,
  direction: MenuDirection,
  optionIds: readonly string[]
): number {
  if (optionIds.length === 0) return currentIndex;

  const rows = buildBoardMenuRows(optionIds);
  if (rows.length === 0) return currentIndex;

  const lastRowIndex = rows.length - 1;

  if (currentIndex === PROFILE_INDEX) {
    if (direction === 'down') return 0;
    if (direction === 'up') return optionIds.length - 1;
    return currentIndex;
  }

  const currentId = optionIds[currentIndex];
  const rowIndex = rows.findIndex((row) => row.includes(currentId));
  if (rowIndex === -1) return currentIndex;

  const row = rows[rowIndex];
  const col = row.indexOf(currentId);

  switch (direction) {
    case 'left':
      if (col > 0) {
        const nextId = row[col - 1];
        return optionIds.indexOf(nextId);
      }
      return currentIndex;

    case 'right':
      if (col < row.length - 1) {
        const nextId = row[col + 1];
        return optionIds.indexOf(nextId);
      }
      return currentIndex;

    case 'up': {
      if (rowIndex === 0) return PROFILE_INDEX;
      const aboveRow = rows[rowIndex - 1];
      const targetCol = Math.min(col, aboveRow.length - 1);
      const nextId = aboveRow[targetCol];
      return optionIds.indexOf(nextId);
    }

    case 'down': {
      if (rowIndex === lastRowIndex) {
        const nextId = rows[0][0];
        return optionIds.indexOf(nextId);
      }
      const belowRow = rows[rowIndex + 1];
      const targetCol = Math.min(col, belowRow.length - 1);
      const nextId = belowRow[targetCol];
      return optionIds.indexOf(nextId);
    }
  }
}
