/**
 * DOSYA AMACI: Günlük bulmaca tamamlamasının sunucu kuralı: bulmacayı çöz, hamleleri
 * oynatarak doğrula, ipucu kullanımını sunucu kayıtlarından belirle, yıldızı par'a
 * göre hesapla; yalnızca O GÜNÜN tarihinde ilk tamamlamayı resmî kaydet (seri + XP).
 * Arşiv (geçmiş tarih) oynanışı doğrulanır ama hiçbir şey yazılmaz.
 */

import type { StarCount } from '../../types';
import { finalizeHintUsage, resolveHintUsage } from '../hintScoring';
import { verifyMoves } from '../gameVerify';
import { addDays, isValidDate, puzzleNumber, utcDate } from './dailyDate';
import { DAILY_POLICY, starsForMoves, visibleStreak, xpForOfficial } from './dailyPolicy';
import { resolvePuzzleForDate } from './dailySchedule';
import { getDailySettings } from './dailySettings';
import { dailyLevelId } from './dailyLevelSource';
import { getDailyRank, getOfficialResult, insertOfficialResult } from './dailyResults';
import { getStreak, recordStreakDay } from './dailyStreaks';
import { parseStoredLevel } from './puzzleValidation';

export interface CompleteDailyInput {
  uid: string;
  date: string;
  moves: string[];
  timeSpent: number;
  hintsUsed: number;
}

export interface OfficialResultView {
  moveCount: number;
  timeSpent: number;
  stars: number;
  hinted: boolean;
}

export interface CompleteDailyResponse {
  success: true;
  date: string;
  number: number;
  par: number;
  moveCount: number;
  stars: StarCount;
  hinted: boolean;
  /** Bu tamamlama resmî sonuç olarak kaydedildi. */
  isOfficial: boolean;
  /** Arşiv oynanışı (geçmiş tarih): seri/liderlik/XP etkilenmez. */
  isArchive: boolean;
  /** O günün resmî sonucu (bu ya da daha önceki tamamlama); arşivde de gösterilir. */
  officialResult: OfficialResultView | null;
  streak: { current: number; best: number };
  rank: number | null;
  xpDelta: number;
}

export type CompleteDailyOutcome =
  | { ok: true; response: CompleteDailyResponse; xpDelta: number }
  | { ok: false; status: 400 | 404; error: 'invalid-date' | 'no-puzzle' | 'invalid-solution' };

export async function completeDaily(
  db: D1Database,
  input: CompleteDailyInput,
  now: Date = new Date(),
): Promise<CompleteDailyOutcome> {
  const today = utcDate(now);
  const { uid, date, moves } = input;
  if (!isValidDate(date) || date > today) return { ok: false, status: 400, error: 'invalid-date' };

  const settings = await getDailySettings(db);
  const puzzle = await resolvePuzzleForDate(db, date, { today, policy: settings.emptyDayPolicy });
  if (!puzzle) return { ok: false, status: 404, error: 'no-puzzle' };

  if (!verifyMoves(parseStoredLevel(puzzle.level_json), moves)) {
    return { ok: false, status: 400, error: 'invalid-solution' };
  }

  const hintUsage = await resolveHintUsage(db, uid, dailyLevelId(puzzle.id), input.hintsUsed);
  const stars = starsForMoves(moves.length, puzzle.par, hintUsage.hinted);
  const isArchive = date < today;

  let isOfficial = false;
  let xpDelta = 0;
  if (!isArchive) {
    // INSERT OR IGNORE: ilk tamamlama kalır. Seri adımı her seferinde çalışır ama
    // idempotenttir; yarıda kalmış bir önceki denemeyi tamamlar (bkz. recordStreakDay).
    await insertOfficialResult(db, {
      uid, date, puzzleId: puzzle.id, moveCount: moves.length,
      timeSpent: Math.min(input.timeSpent, DAILY_POLICY.maxTimeSpentSeconds), stars, hinted: hintUsage.hinted,
    });
    const { recorded } = await recordStreakDay(db, uid, date);
    if (recorded) {
      isOfficial = true;
      const stored = await getOfficialResult(db, uid, date);
      xpDelta = xpForOfficial(stored ? stored.hinted === 1 : hintUsage.hinted);
    }
  }

  // Açık ipucu kayıtları bu tamamlamaya uygulandı; sonrakini etkilemesin.
  try {
    await finalizeHintUsage(db, uid, hintUsage);
  } catch (e) {
    console.error('[Daily] reward_grants consume error:', e);
  }

  const [official, streakState, rank] = await Promise.all([
    getOfficialResult(db, uid, date),
    getStreak(db, uid),
    getDailyRank(db, uid, date),
  ]);

  return {
    ok: true,
    xpDelta,
    response: {
      success: true,
      date,
      number: puzzleNumber(date),
      par: puzzle.par,
      moveCount: moves.length,
      stars,
      hinted: hintUsage.hinted,
      isOfficial,
      isArchive,
      officialResult: official
        ? { moveCount: official.move_count, timeSpent: official.time_spent, stars: official.stars, hinted: official.hinted === 1 }
        : null,
      streak: { current: visibleStreak(streakState, today, addDays(today, -1)), best: streakState.best },
      rank,
      xpDelta,
    },
  };
}
