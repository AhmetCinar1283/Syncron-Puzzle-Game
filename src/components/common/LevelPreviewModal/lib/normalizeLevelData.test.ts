/**
 * DOSYA AMACI: normalizeLevelData saf yardımcı fonksiyonunun birim testleri.
 */

import { describe, it, expect } from 'vitest';
import { normalizeLevelData } from './normalizeLevelData';

describe('normalizeLevelData', () => {
  it('boş veya eksik nesne verildiğinde güvenli varsayılan değerler üretir', () => {
    const result = normalizeLevelData({});
    expect(result.id).toBe(0);
    expect(result.name).toBe('Untitled Level');
    expect(result.grid).toEqual([]);
    expect(result.initialObjects).toEqual([]);
    expect(result.targets).toEqual([]);
    expect(result.initialBoxes).toEqual([]);
    expect(result.trailCollision).toBe(false);
    expect(result.edges).toEqual({ top: 'wall', bottom: 'wall', left: 'wall', right: 'wall' });
  });

  it('JSON string formatındaki ızgarayı doğru şekilde parse eder', () => {
    const jsonGrid = JSON.stringify([
      ['empty', 'wall'],
      ['empty', 'target'],
    ]);
    const result = normalizeLevelData({ grid: jsonGrid as unknown as any });
    expect(result.grid).toEqual([
      ['empty', 'wall'],
      ['empty', 'target'],
    ]);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it('odalar içindeki serileştirilmiş ızgaraları parse eder', () => {
    const raw = {
      rooms: [
        {
          id: 'room-1',
          name: 'Oda 1',
          grid: JSON.stringify([['empty', 'empty']]),
        },
      ],
    };
    const result = normalizeLevelData(raw as unknown as Record<string, unknown>);
    expect(result.rooms).toBeDefined();
    expect(result.rooms?.[0].grid).toEqual([['empty', 'empty']]);
  });

  it('string id verildiğinde firestoreId olarak atar', () => {
    const result = normalizeLevelData({ id: 'fs-level-123' as unknown as number });
    expect(result.firestoreId).toBe('fs-level-123');
    expect(result.id).toBe(0);
  });
});
