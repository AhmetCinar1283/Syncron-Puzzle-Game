/**
 * DOSYA AMACI: Admin'in kaydettiği günlük bulmacanın çözülebilirlik doğrulaması.
 * Çözücü worker'da çalışmaz (CPU sınırı, bkz. hint/hintBudget.ts); çözüm admin
 * tarayıcısında bulunur ve burada hamle hamle OYNATILARAK kanıtlanır.
 * Par = doğrulanan çözümün hamle sayısı.
 */

import { verifyMoves } from '../gameVerify';

export type PuzzleValidation =
  | { ok: true; level: Record<string, unknown>; levelJson: string; par: number }
  | { ok: false; reason: 'invalid-level' | 'invalid-solution' | 'level-load-failed' };

/** Oynanabilir bir level'ın asgari yapısı: tek oda grid'i ya da oda listesi. */
function hasPlayableShape(level: Record<string, unknown>): boolean {
  const hasRooms = Array.isArray(level.rooms) && level.rooms.length > 0;
  const hasGrid = (Array.isArray(level.grid) || typeof level.grid === 'string')
    && typeof level.width === 'number' && typeof level.height === 'number';
  return hasRooms || hasGrid;
}

export function validatePuzzle(rawLevel: unknown, solution: string[]): PuzzleValidation {
  if (!rawLevel || typeof rawLevel !== 'object' || Array.isArray(rawLevel)) return { ok: false, reason: 'invalid-level' };
  const level = rawLevel as Record<string, unknown>;
  if (!hasPlayableShape(level)) return { ok: false, reason: 'invalid-level' };

  let won: boolean;
  try {
    // verifyMoves converter'ı mutasyona uğratmasın diye kopya üzerinde çalışır.
    won = verifyMoves(structuredClone(level), solution);
  } catch (err) {
    console.error('[DailyPuzzle] replay failed:', err);
    return { ok: false, reason: 'level-load-failed' };
  }
  if (!won) return { ok: false, reason: 'invalid-solution' };

  return { ok: true, level, levelJson: JSON.stringify(level), par: solution.length };
}

/** Oyuncu tarafı: saklanan JSON'u verifyMoves'un beklediği nesneye çevirir. */
export function parseStoredLevel(levelJson: string): Record<string, unknown> {
  return JSON.parse(levelJson) as Record<string, unknown>;
}
