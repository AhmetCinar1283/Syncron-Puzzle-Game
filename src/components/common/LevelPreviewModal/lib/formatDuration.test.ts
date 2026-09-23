/**
 * DOSYA AMACI: formatDuration saf yardımcı fonksiyonunun birim testleri.
 */

import { describe, it, expect } from 'vitest';
import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it('0 saniyeyi 0:00 olarak döndürür', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('dakikadan az süreleri doğru formatlar', () => {
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(45)).toBe('0:45');
  });

  it('dakika ve saniyeyi doğru formatlar', () => {
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(75)).toBe('1:15');
    expect(formatDuration(625)).toBe('10:25');
  });

  it('negatif veya tanımsız değerleri güvenli ele alır', () => {
    expect(formatDuration(-10)).toBe('0:00');
    expect(formatDuration(undefined)).toBe('0:00');
  });
});
