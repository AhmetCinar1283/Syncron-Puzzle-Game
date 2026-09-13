import { describe, it, expect } from 'vitest';
import { replayMoves, type MoveCode, type ReplayResult, type ReplayState } from '../src/services/hint/replay';
import { computeHint } from '../src/services/hint/computeHint';
import { DEFAULT_HINT_BUDGET, type HintBudget } from '../src/services/hint/hintBudget';

const edges = { top: 'wall', bottom: 'wall', left: 'wall', right: 'wall' };

/** 3x3: oyuncu (1,0), hedef (1,2) → "r r" ile çözülür. */
const SHORT_LEVEL = {
  edges,
  grid: [
    ['empty', 'empty', 'empty'],
    ['empty', 'empty', 'target_1'],
    ['empty', 'empty', 'empty'],
  ],
  initialObjects: [{ position: { row: 1, col: 0 }, mode: 'normal' }],
  initialBoxes: [],
};

/** 3x8: oyuncu (1,0), hedef (1,7) → 7 kez "r" ile çözülür. */
const LONG_LEVEL = {
  edges,
  grid: [
    Array(8).fill('empty'),
    [...Array(7).fill('empty'), 'target_1'],
    Array(8).fill('empty'),
  ],
  initialObjects: [{ position: { row: 1, col: 0 }, mode: 'normal' }],
  initialBoxes: [],
};

function replay(level: unknown, moves: MoveCode[]): ReplayResult {
  const result = replayMoves(level, moves);
  if (!result.ok) throw new Error(`replay failed: ${result.error}`);
  return result.replay;
}

/** Hedefi hiçbir oyuncunun karşılayamayacağı hâle getirir → durum kesin çözümsüz. */
function makeUnsolvable(state: ReplayState): void {
  for (const room of Object.values(state.rooms)) {
    for (const row of room.grid) {
      for (const cell of row) {
        if (cell.type === 'target') cell.customData = { ...cell.customData, playerIndex: 99 };
      }
    }
  }
}

describe('replayMoves', () => {
  it('produces one state per move plus the initial state', () => {
    expect(replay(LONG_LEVEL, ['r', 'r', 'r']).states).toHaveLength(4);
  });

  it('rejects a history that already wins the level', () => {
    expect(replayMoves(SHORT_LEVEL, ['r', 'r'])).toEqual({ ok: false, error: 'already-won' });
  });

  it('rejects room switches on a single-room level', () => {
    expect(replayMoves(SHORT_LEVEL, ['s'])).toEqual({ ok: false, error: 'switch-not-allowed' });
  });
});

describe('computeHint', () => {
  it('returns steps remaining and the next moves from the current state', () => {
    const moves: MoveCode[] = ['r'];
    expect(computeHint(replay(SHORT_LEVEL, moves), moves)).toEqual({
      undoSteps: 0,
      restart: false,
      stepsRemaining: 1,
      moves: ['r'],
    });
  });

  it('shows at most 5 moves but reports the full remaining count', () => {
    const hint = computeHint(replay(LONG_LEVEL, []), []);
    expect(hint).toEqual({ undoSteps: 0, restart: false, stepsRemaining: 7, moves: ['r', 'r', 'r', 'r', 'r'] });
  });

  it('suggests undoing to the nearest solvable point when the current state is unsolvable', () => {
    const moves: MoveCode[] = ['r', 'r', 'r'];
    const replayed = replay(LONG_LEVEL, moves);
    makeUnsolvable(replayed.states[3]);
    makeUnsolvable(replayed.states[2]);
    expect(computeHint(replayed, moves)).toEqual({
      undoSteps: 2,
      restart: false,
      stepsRemaining: 6,
      moves: ['r', 'r', 'r', 'r', 'r'],
    });
  });

  it('suggests a restart when no undo within the probe limit helps', () => {
    const moves: MoveCode[] = ['r', 'r', 'r'];
    const replayed = replay(LONG_LEVEL, moves);
    makeUnsolvable(replayed.states[3]);
    makeUnsolvable(replayed.states[2]);
    const budget: HintBudget = { ...DEFAULT_HINT_BUDGET, maxUndoProbes: 1 };
    expect(computeHint(replayed, moves, budget)).toEqual({
      undoSteps: 0,
      restart: true,
      stepsRemaining: 7,
      moves: ['r', 'r', 'r', 'r', 'r'],
    });
  });

  it('returns null instead of a guess when the budget is too small', () => {
    const budget: HintBudget = { ...DEFAULT_HINT_BUDGET, maxStatesPerSearch: 1 };
    expect(computeHint(replay(LONG_LEVEL, []), [], budget)).toBeNull();
  });
});
