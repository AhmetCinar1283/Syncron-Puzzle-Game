import { describe, expect, it } from 'vitest';
import { computeStars } from '../src/services/solutions';

describe('computeStars', () => {
  it('ilk çözen (best yok) 3★ alır', () => {
    expect(computeStars(40, null)).toBe(3);
  });

  it('küçük levelde min payı uygulanır (best=4: 3★ ≤6, 2★ ≤9)', () => {
    expect(computeStars(4, 4)).toBe(3);
    expect(computeStars(6, 4)).toBe(3);
    expect(computeStars(7, 4)).toBe(2);
    expect(computeStars(9, 4)).toBe(2);
    expect(computeStars(10, 4)).toBe(1);
  });

  it('orta levelde oran uygulanır (best=10: 3★ ≤12, 2★ ≤16)', () => {
    expect(computeStars(12, 10)).toBe(3);
    expect(computeStars(13, 10)).toBe(2);
    expect(computeStars(16, 10)).toBe(2);
    expect(computeStars(17, 10)).toBe(1);
  });

  it('uzun levelde max payı uygulanır (best=100: 3★ ≤105, 2★ ≤114)', () => {
    expect(computeStars(105, 100)).toBe(3);
    expect(computeStars(106, 100)).toBe(2);
    expect(computeStars(114, 100)).toBe(2);
    expect(computeStars(115, 100)).toBe(1);
  });

  it('bitirilen her level en az 1★ verir', () => {
    expect(computeStars(500, 5)).toBe(1);
  });
});
