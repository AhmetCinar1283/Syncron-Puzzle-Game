import { describe, expect, it } from 'vitest';
import type { LevelOrderEntry } from '@/services/firebase/adminTypes';
import { computeLockedSet, isProgressed, orderedLevelIds, progressState } from './progression';

function entry(id: string, position: number): LevelOrderEntry {
  return { id, name: id, width: 5, height: 5, position } as LevelOrderEntry;
}

const part = {
  unlockRequirement: 0,
  // Kayıt sırası pozisyondan farklı: sıralama `position`'a göre yapılmalı.
  order: { c: entry('C', 2), a: entry('A', 0), b: entry('B', 1) },
};

const sets = (played: string[], skipped: string[] = []) => ({ played: new Set(played), skipped: new Set(skipped) });

describe('progression', () => {
  it('orders levels by position', () => {
    expect(orderedLevelIds(part)).toEqual(['A', 'B', 'C']);
  });

  it('locks every level after the first unprogressed one', () => {
    expect([...computeLockedSet(part, sets([]), 0)]).toEqual(['B', 'C']);
    expect([...computeLockedSet(part, sets(['A']), 0)]).toEqual(['C']);
  });

  it('a skipped level unlocks the next one like a solved level', () => {
    expect([...computeLockedSet(part, sets([], ['A']), 0)]).toEqual(['C']);
    expect([...computeLockedSet(part, sets(['B'], ['A']), 0)]).toEqual([]);
  });

  it('keeps the first level behind the score requirement (skips give no score)', () => {
    expect(computeLockedSet({ ...part, unlockRequirement: 10 }, sets([], ['A']), 3).has('A')).toBe(true);
  });

  it('a solved level is shown as completed even if it was skipped before', () => {
    expect(progressState('A', sets(['A'], ['A']))).toBe('completed');
    expect(progressState('A', sets([], ['A']))).toBe('skipped');
    expect(progressState('A', sets([]))).toBe('none');
    expect(isProgressed('A', sets([], ['A']))).toBe(true);
  });
});
