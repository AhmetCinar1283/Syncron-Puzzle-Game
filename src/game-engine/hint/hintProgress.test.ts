import { describe, expect, it } from 'vitest';
import { advanceOnMove, advanceOnRestart, advanceOnUndo, startHint } from './hintProgress';

describe('hintProgress', () => {
  it('advances through the shown moves and ends after the last one', () => {
    let active = startHint({ undoSteps: 0, restart: false, stepsRemaining: 7, moves: ['r', 's'] });
    expect(active).toEqual({ phase: 'moves', undoLeft: 0, stepsRemaining: 7, moves: ['r', 's'] });
    active = advanceOnMove(active!, 'r');
    expect(active).toEqual({ phase: 'moves', undoLeft: 0, stepsRemaining: 6, moves: ['s'] });
    expect(advanceOnMove(active!, 's')).toBeNull();
  });

  it('closes the hint when the player deviates', () => {
    const active = startHint({ undoSteps: 0, restart: false, stepsRemaining: 3, moves: ['r', 'r', 'r'] })!;
    expect(advanceOnMove(active, 'l')).toBeNull();
    expect(advanceOnUndo(active)).toBeNull();
    expect(advanceOnRestart(active)).toBeNull();
  });

  it('requires the undo steps before the moves', () => {
    let active = startHint({ undoSteps: 2, restart: false, stepsRemaining: 4, moves: ['u', 'u'] });
    expect(advanceOnMove(active!, 'u')).toBeNull();
    active = advanceOnUndo(active!);
    expect(active).toMatchObject({ phase: 'undo', undoLeft: 1 });
    active = advanceOnUndo(active!);
    expect(active).toMatchObject({ phase: 'moves', undoLeft: 0, moves: ['u', 'u'] });
  });

  it('requires a restart before the moves', () => {
    const active = startHint({ undoSteps: 0, restart: true, stepsRemaining: 9, moves: ['d'] })!;
    expect(active.phase).toBe('restart');
    expect(advanceOnUndo(active)).toBeNull();
    expect(advanceOnRestart(active)).toMatchObject({ phase: 'moves', moves: ['d'] });
  });
});
