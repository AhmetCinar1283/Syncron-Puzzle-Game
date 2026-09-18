import { describe, expect, it } from 'vitest';
import { serverErrorKey, shiftDate, toGeneratorFilters } from './candidateFilters';

describe('candidateFilters', () => {
  it('clamps size and keeps difficulty/player count', () => {
    const f = toGeneratorFilters({ difficulty: 3, size: 40, playerCount: 2, count: 4 });
    expect([f.width, f.height, f.difficulty, f.playerCount]).toEqual([10, 10, 3, 2]);
  });

  it('shifts UTC dates across month boundaries', () => {
    expect(shiftDate('2026-09-30', 1)).toBe('2026-10-01');
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('maps server error codes to i18n keys', () => {
    expect(serverErrorKey(new Error('date-has-results'))).toBe('daily_admin.server_date_has_results');
    expect(serverErrorKey(new Error('HTTP error! status: 500'))).toBe('daily_admin.error_generic');
  });
});
