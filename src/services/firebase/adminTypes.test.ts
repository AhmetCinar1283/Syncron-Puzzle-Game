import { describe, it, expect } from 'vitest';
import { compareParts } from './adminTypes';

const p = (partId: string, name: string, unlockRequirement: number) => ({ partId, name, unlockRequirement });

describe('compareParts', () => {
  it('açılma yıldızına göre artan sıralar (rastgele Firestore id sırasından bağımsız)', () => {
    const sorted = [p('zzz', 'C', 30), p('aaa', 'B', 0), p('mmm', 'D', 10)].sort(compareParts);
    expect(sorted.map((x) => x.unlockRequirement)).toEqual([0, 10, 30]);
  });

  it('eşit yıldızda adı doğal sırada karşılaştırır', () => {
    const sorted = [p('a', 'Bölüm 10', 0), p('b', 'Bölüm 2', 0)].sort(compareParts);
    expect(sorted.map((x) => x.name)).toEqual(['Bölüm 2', 'Bölüm 10']);
  });

  it('unlockRequirement eksikse 0 sayar', () => {
    const missing = { partId: 'a', name: 'A' } as Parameters<typeof compareParts>[0];
    expect(compareParts(missing, p('b', 'B', 5))).toBeLessThan(0);
  });
});
