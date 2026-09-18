/**
 * DOSYA AMACI: Günlük bulmacanın, level'a bağlı ortak altyapılarda (ödüllü ipucu,
 * ipucu skor kuralı) kullanılan level kimliği: `daily:<puzzleId>`. Kampanya
 * level'ları Firestore id'si taşır; bu önek iki kaynağı çakışmadan ayırır.
 */

import { utcDate } from './dailyDate';
import { getPuzzle } from './dailyPuzzles';
import { isPuzzlePublished } from './dailySchedule';
import { parseStoredLevel } from './puzzleValidation';

export const DAILY_LEVEL_PREFIX = 'daily:';

export function dailyLevelId(puzzleId: string): string {
  return `${DAILY_LEVEL_PREFIX}${puzzleId}`;
}

/** `daily:<id>` ise bulmaca id'si, değilse `null`. */
export function parseDailyLevelId(levelId: string): string | null {
  return levelId.startsWith(DAILY_LEVEL_PREFIX) ? levelId.slice(DAILY_LEVEL_PREFIX.length) || null : null;
}

/**
 * Yalnızca YAYINLANMIŞ (bugün veya önceki bir güne atanmış) bulmacayı yükler —
 * henüz yayınlanmamış bulmacanın içeriği/ipucu oyuncuya sızmaz.
 */
export async function loadPublishedDailyLevel(
  db: D1Database,
  puzzleId: string,
  now: Date = new Date(),
): Promise<{ level: Record<string, unknown>; version: number } | null> {
  const puzzle = await getPuzzle(db, puzzleId);
  if (!puzzle || puzzle.status !== 'approved') return null;
  if (!(await isPuzzlePublished(db, puzzleId, utcDate(now)))) return null;
  return { level: parseStoredLevel(puzzle.level_json), version: puzzle.version };
}
