/**
 * DOSYA AMACI: Günlük bulmaca takvimi (`daily_schedule`): tarih aralığı okuma,
 * admin ataması/kaldırma ve "bu tarihin bulmacası hangisi" çözümü (boş günde
 * yedek havuzdan kalıcı seçim).
 */

import type { DailyPuzzleRow } from './dailyPuzzles';
import { getPuzzle } from './dailyPuzzles';
import type { EmptyDayPolicy } from './dailyPolicy';

export interface ScheduleEntry {
  date: string;
  puzzle_id: string;
  assigned_by: 'admin' | 'fallback';
  title: string;
  status: 'draft' | 'approved';
  results: number;
}

export async function getScheduleRange(db: D1Database, from: string, to: string): Promise<ScheduleEntry[]> {
  const { results } = await db
    .prepare(
      `SELECT s.date, s.puzzle_id, s.assigned_by, p.title, p.status,
              (SELECT COUNT(*) FROM daily_results AS r WHERE r.date = s.date) AS results
       FROM daily_schedule AS s JOIN daily_puzzles AS p ON p.id = s.puzzle_id
       WHERE s.date BETWEEN ?1 AND ?2
       ORDER BY s.date ASC`,
    )
    .bind(from, to)
    .all<ScheduleEntry>();
  return results ?? [];
}

export async function countResultsForDate(db: D1Database, date: string): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM daily_results WHERE date = ?1').bind(date).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function assignDate(db: D1Database, date: string, puzzleId: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO daily_schedule (date, puzzle_id, assigned_by) VALUES (?1, ?2, 'admin')
       ON CONFLICT(date) DO UPDATE SET puzzle_id = excluded.puzzle_id, assigned_by = 'admin',
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    )
    .bind(date, puzzleId)
    .run();
}

export async function clearDate(db: D1Database, date: string): Promise<void> {
  await db.prepare('DELETE FROM daily_schedule WHERE date = ?1').bind(date).run();
}

/** Bu bulmacaya atanmış (geçmiş/gelecek) tarih sayısı. */
export async function countDatesForPuzzle(db: D1Database, puzzleId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM daily_schedule WHERE puzzle_id = ?1')
    .bind(puzzleId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Bulmaca `today` veya öncesine atanmış mı (oyuncular görmüş olabilir → içerik kilitli). */
export async function isPuzzlePublished(db: D1Database, puzzleId: string, today: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 AS x FROM daily_schedule WHERE puzzle_id = ?1 AND date <= ?2 LIMIT 1')
    .bind(puzzleId, today)
    .first<{ x: number }>();
  return row !== null;
}

/** Tarihten kararlı bir tamsayı (FNV-1a) — yedek havuz seçimi için. */
export function dateHash(date: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Yedek havuzdan seçim: önce hiç (ya da en az) kullanılmış olanlar, aralarından
 * tarih hash'iyle biri. Havuz boşsa `null`.
 */
async function pickFromPool(db: D1Database, date: string): Promise<string | null> {
  const { results } = await db
    .prepare(
      `SELECT p.id, (SELECT COUNT(*) FROM daily_schedule AS s WHERE s.puzzle_id = p.id) AS uses
       FROM daily_puzzles AS p
       WHERE p.status = 'approved' AND p.in_pool = 1
       ORDER BY uses ASC, p.id ASC`,
    )
    .all<{ id: string; uses: number }>();
  const rows = results ?? [];
  if (rows.length === 0) return null;
  const leastUsed = rows.filter((r) => r.uses === rows[0].uses);
  return leastUsed[dateHash(date) % leastUsed.length].id;
}

export interface ResolveOptions {
  today: string;
  policy: EmptyDayPolicy;
}

/**
 * Tarihin bulmacası. Atama yoksa: yalnızca BUGÜN ve politika `pool` ise havuzdan
 * seçilip kalıcı yazılır (eşzamanlı isteklerde `INSERT OR IGNORE` + yeniden okuma
 * herkesin aynı bulmacayı almasını garanti eder). Geçmiş boş gün boş kalır;
 * gelecek tarih oyuncuya hiç çözülmez. Taslak bulmaca asla yayınlanmaz.
 */
export async function resolvePuzzleForDate(
  db: D1Database,
  date: string,
  opts: ResolveOptions,
): Promise<DailyPuzzleRow | null> {
  if (date > opts.today) return null;

  let row = await db
    .prepare('SELECT puzzle_id FROM daily_schedule WHERE date = ?1')
    .bind(date)
    .first<{ puzzle_id: string }>();

  if (!row && date === opts.today && opts.policy === 'pool') {
    const picked = await pickFromPool(db, date);
    if (picked) {
      await db
        .prepare(`INSERT OR IGNORE INTO daily_schedule (date, puzzle_id, assigned_by) VALUES (?1, ?2, 'fallback')`)
        .bind(date, picked)
        .run();
      row = await db
        .prepare('SELECT puzzle_id FROM daily_schedule WHERE date = ?1')
        .bind(date)
        .first<{ puzzle_id: string }>();
    }
  }
  if (!row) return null;

  const puzzle = await getPuzzle(db, row.puzzle_id);
  return puzzle && puzzle.status === 'approved' ? puzzle : null;
}

/** Oyuncu arşivi: `from`..`to` arasında onaylı bulmacası olan tarihler (yeniden eskiye). */
export async function listArchiveDates(
  db: D1Database,
  from: string,
  to: string,
): Promise<{ date: string; title: string; par: number }[]> {
  const { results } = await db
    .prepare(
      `SELECT s.date, p.title, p.par
       FROM daily_schedule AS s JOIN daily_puzzles AS p ON p.id = s.puzzle_id
       WHERE s.date BETWEEN ?1 AND ?2 AND p.status = 'approved'
       ORDER BY s.date DESC`,
    )
    .bind(from, to)
    .all<{ date: string; title: string; par: number }>();
  return results ?? [];
}
