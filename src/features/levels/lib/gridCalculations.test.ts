import { describe, it, expect } from 'vitest';
import {
  calculateNextGridIndex,
  getResponsiveColumnCount,
  calculateChapterStars,
} from './gridCalculations';

describe('gridCalculations', () => {
  describe('getResponsiveColumnCount', () => {
    it('returns 3 for small phones (<380px)', () => {
      expect(getResponsiveColumnCount(350)).toBe(3);
    });

    it('returns 4 for standard mobile (<640px)', () => {
      expect(getResponsiveColumnCount(400)).toBe(4);
    });

    it('returns 6 for tablet (<1024px)', () => {
      expect(getResponsiveColumnCount(768)).toBe(6);
    });

    it('returns 8 for desktop (>=1024px)', () => {
      expect(getResponsiveColumnCount(1280)).toBe(8);
    });
  });

  describe('calculateNextGridIndex', () => {
    const total = 13;
    const cols = 4; // rows: [0,1,2,3], [4,5,6,7], [8,9,10,11], [12]

    it('navigates left and right correctly', () => {
      expect(calculateNextGridIndex(0, total, 'left', cols)).toBe(0);
      expect(calculateNextGridIndex(0, total, 'right', cols)).toBe(1);
      expect(calculateNextGridIndex(12, total, 'right', cols)).toBe(12);
    });

    it('navigates up and down across rows', () => {
      expect(calculateNextGridIndex(0, total, 'up', cols)).toBe(0);
      expect(calculateNextGridIndex(5, total, 'up', cols)).toBe(1);
      expect(calculateNextGridIndex(1, total, 'down', cols)).toBe(5);
      expect(calculateNextGridIndex(5, total, 'down', cols)).toBe(9);
    });

    it('clamps to last element when moving down into partial row', () => {
      // from index 10 (row 2), down by 4 would be 14 (out of bounds). It should clamp to 12.
      expect(calculateNextGridIndex(10, total, 'down', cols)).toBe(12);
    });

    it('handles empty or single item arrays', () => {
      expect(calculateNextGridIndex(0, 0, 'right', cols)).toBe(0);
      expect(calculateNextGridIndex(0, 1, 'down', cols)).toBe(0);
    });
  });

  describe('calculateChapterStars', () => {
    it('calculates earned and max stars correctly', () => {
      const levels = [
        { firestoreId: 'lv-1' },
        { firestoreId: 'lv-2' },
        { firestoreId: 'lv-3' },
      ];
      const playedMap = new Map([
        ['lv-1', { stars: 3 as const }],
        ['lv-2', { stars: 2 as const }],
      ]);

      const result = calculateChapterStars(levels, playedMap);
      expect(result.earned).toBe(5);
      expect(result.max).toBe(9);
    });
  });
});
