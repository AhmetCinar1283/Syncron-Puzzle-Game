import { describe, expect, it } from 'vitest';
import {
  buildBoardMenuRows,
  moveBoardSelection,
  getBoardCoordsForOption,
  PROFILE_INDEX,
} from './boardMenuLayout';

describe('boardMenuLayout', () => {
  const OPTIONS = ['play', 'daily', 'levels', 'editor', 'friends', 'controls'];

  it('builds rows with play as full-width and other items paired', () => {
    const rows = buildBoardMenuRows(OPTIONS);
    expect(rows).toEqual([
      ['play'],
      ['daily', 'levels'],
      ['editor', 'friends'],
      ['controls'],
    ]);
  });

  it('navigates correctly between board cell stations', () => {
    // 0 is play
    const playIdx = 0;
    // Down from play moves to daily (first col of next row)
    expect(moveBoardSelection(playIdx, 'down', OPTIONS)).toBe(1); // daily

    // From daily (index 1), right moves to levels (index 2)
    expect(moveBoardSelection(1, 'right', OPTIONS)).toBe(2); // levels

    // From levels (index 2), left moves back to daily
    expect(moveBoardSelection(2, 'left', OPTIONS)).toBe(1); // daily

    // From daily (index 1), up moves to play (index 0)
    expect(moveBoardSelection(1, 'up', OPTIONS)).toBe(0); // play

    // From play (index 0), up moves to profile badge
    expect(moveBoardSelection(0, 'up', OPTIONS)).toBe(PROFILE_INDEX);

    // From profile badge, down returns to first item (play)
    expect(moveBoardSelection(PROFILE_INDEX, 'down', OPTIONS)).toBe(0);

    // From levels (index 2), down moves to friends (col 1 of next row)
    expect(moveBoardSelection(2, 'down', OPTIONS)).toBe(4); // friends
  });

  it('provides player coordinates for all registered options', () => {
    const playCoords = getBoardCoordsForOption('play');
    expect(playCoords.p1).toBeDefined();
    expect(playCoords.p2).toBeDefined();

    const dailyCoords = getBoardCoordsForOption('daily');
    expect(dailyCoords.p1).toBeDefined();
    expect(dailyCoords.p2).toBeDefined();

    // Fallback for unknown
    const unknownCoords = getBoardCoordsForOption('unknown');
    expect(unknownCoords).toEqual(playCoords);
  });
});
