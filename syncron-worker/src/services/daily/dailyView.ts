/**
 * DOSYA AMACI: Oyuncuya dönen günlük bulmaca görünümleri: bir tarihin bulmacası
 * (oynatmak için level içeriği + kullanıcının resmî sonucu), seri özeti ve arşiv
 * listesi. Çözüm (solution) oyuncuya ASLA dönmez.
 */

import { addDays, isValidDate, puzzleNumber, utcDate } from './dailyDate';
import { DAILY_POLICY, visibleStreak } from './dailyPolicy';
import { listArchiveDates, resolvePuzzleForDate } from './dailySchedule';
import { getDailySettings } from './dailySettings';
import { getDailyRank, getOfficialResult } from './dailyResults';
import { getStreak } from './dailyStreaks';
import { parseStoredLevel } from './puzzleValidation';
import type { OfficialResultView } from './completeDaily';

export interface DailyPuzzleView {
  date: string;
  today: string;
  number: number;
  isArchive: boolean;
  puzzle: {
    id: string;
    title: string;
    version: number;
    par: number;
    difficulty: number | null;
    level: Record<string, unknown>;
  } | null;
  officialResult: OfficialResultView | null;
  rank: number | null;
}

export async function getDailyPuzzleView(
  db: D1Database,
  uid: string | undefined,
  date: string,
  now: Date = new Date(),
): Promise<DailyPuzzleView | null> {
  const today = utcDate(now);
  if (!isValidDate(date) || date > today || date < addDays(today, -DAILY_POLICY.archiveMaxDays)) return null;

  const settings = await getDailySettings(db);
  const puzzle = await resolvePuzzleForDate(db, date, { today, policy: settings.emptyDayPolicy });
  const [official, rank] = uid && puzzle
    ? await Promise.all([getOfficialResult(db, uid, date), getDailyRank(db, uid, date)])
    : [null, null];

  return {
    date,
    today,
    number: puzzleNumber(date),
    isArchive: date < today,
    puzzle: puzzle
      ? {
          id: puzzle.id,
          title: puzzle.title,
          version: puzzle.version,
          par: puzzle.par,
          difficulty: puzzle.difficulty,
          level: parseStoredLevel(puzzle.level_json),
        }
      : null,
    officialResult: official
      ? { moveCount: official.move_count, timeSpent: official.time_spent, stars: official.stars, hinted: official.hinted === 1 }
      : null,
    rank,
  };
}

export interface DailyStreakView {
  current: number;
  best: number;
  lastDate: string | null;
  playedToday: boolean;
}

export async function getStreakView(db: D1Database, uid: string, now: Date = new Date()): Promise<DailyStreakView> {
  const today = utcDate(now);
  const state = await getStreak(db, uid);
  return {
    current: visibleStreak(state, today, addDays(today, -1)),
    best: state.best,
    lastDate: state.lastDate,
    playedToday: state.lastDate === today,
  };
}

export interface ArchiveEntryView {
  date: string;
  number: number;
  title: string;
  par: number;
  officialStars: number | null;
}

/** Bugünden önceki onaylı bulmacalar (yeniden eskiye); kullanıcı varsa resmî yıldızıyla. */
export async function getArchiveView(
  db: D1Database,
  uid: string | undefined,
  days: number,
  now: Date = new Date(),
): Promise<ArchiveEntryView[]> {
  const today = utcDate(now);
  const span = Math.min(Math.max(days, 1), DAILY_POLICY.archiveMaxDays);
  const rows = await listArchiveDates(db, addDays(today, -span), addDays(today, -1));

  const starsByDate = new Map<string, number>();
  if (uid && rows.length > 0) {
    const { results } = await db
      .prepare('SELECT date, stars FROM daily_results WHERE uid = ?1 AND date BETWEEN ?2 AND ?3')
      .bind(uid, rows[rows.length - 1].date, rows[0].date)
      .all<{ date: string; stars: number }>();
    for (const r of results ?? []) starsByDate.set(r.date, r.stars);
  }

  return rows.map((r) => ({
    date: r.date,
    number: puzzleNumber(r.date),
    title: r.title,
    par: r.par,
    officialStars: starsByDate.get(r.date) ?? null,
  }));
}
