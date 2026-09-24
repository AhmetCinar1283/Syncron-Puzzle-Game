/**
 * DOSYA AMACI: Resmî günlük sonuçlar (`daily_results`): ilk tamamlamanın
 * idempotent kaydı, oyuncunun kendi sonucu ve günlük liderlik sorguları.
 */

import { rankedUidClause } from '../leaderboard';

export interface DailyResultRow {
  uid: string;
  date: string;
  puzzle_id: string;
  move_count: number;
  time_spent: number;
  stars: number;
  hinted: number;
  completed_at: string;
}

export interface OfficialResultInput {
  uid: string;
  date: string;
  puzzleId: string;
  moveCount: number;
  timeSpent: number;
  stars: number;
  hinted: boolean;
}

/**
 * Resmî sonucu yazar. Zaten varsa DEĞİŞTİRMEZ. Dönüş: bu çağrı kaydı oluşturdu mu
 * (eşzamanlı iki istekten yalnızca biri `true` alır).
 */
export async function insertOfficialResult(db: D1Database, r: OfficialResultInput): Promise<boolean> {
  const res = await db
    .prepare(
      `INSERT OR IGNORE INTO daily_results (uid, date, puzzle_id, move_count, time_spent, stars, hinted)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(r.uid, r.date, r.puzzleId, r.moveCount, Math.trunc(r.timeSpent), r.stars, r.hinted ? 1 : 0)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function getOfficialResult(db: D1Database, uid: string, date: string): Promise<DailyResultRow | null> {
  return db.prepare('SELECT * FROM daily_results WHERE uid = ?1 AND date = ?2').bind(uid, date).first<DailyResultRow>();
}

/** Liderlik sırası: ipuçsuzlar önde, sonra az hamle, az süre, erken tamamlama. */
const RANK_ORDER = 'hinted ASC, move_count ASC, time_spent ASC, completed_at ASC';

export interface LeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string | null;
  tag: string | null;
  moveCount: number;
  timeSpent: number;
  stars: number;
  hinted: boolean;
}

export async function getDailyLeaderboard(
  db: D1Database,
  date: string,
  limit: number,
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
  const [{ results }, count] = await Promise.all([
    db
      .prepare(
        `SELECT r.uid, p.display_name, p.tag, r.move_count, r.time_spent, r.stars, r.hinted
         FROM daily_results AS r LEFT JOIN user_profiles AS p ON p.uid = r.uid
         WHERE r.date = ?1 AND ${rankedUidClause('r.uid')}
         ORDER BY ${RANK_ORDER.split(', ').map((c) => `r.${c}`).join(', ')}
         LIMIT ?2`,
      )
      .bind(date, limit)
      .all<{ uid: string; display_name: string | null; tag: string | null; move_count: number; time_spent: number; stars: number; hinted: number }>(),
    db.prepare(`SELECT COUNT(*) AS n FROM daily_results WHERE date = ?1 AND ${rankedUidClause('uid')}`).bind(date).first<{ n: number }>(),
  ]);
  const entries = (results ?? []).map((row, i) => ({
    rank: i + 1,
    uid: row.uid,
    displayName: row.display_name,
    tag: row.tag,
    moveCount: row.move_count,
    timeSpent: row.time_spent,
    stars: row.stars,
    hinted: row.hinted === 1,
  }));
  return { entries, total: count?.n ?? 0 };
}

/** Oyuncunun o günkü sırası (resmî sonucu yoksa `null`). */
export async function getDailyRank(db: D1Database, uid: string, date: string): Promise<number | null> {
  const mine = await getOfficialResult(db, uid, date);
  if (!mine) return null;
  const row = await db
    .prepare(
      `SELECT COUNT(*) + 1 AS rank FROM daily_results
       WHERE date = ?1 AND ${rankedUidClause('uid')} AND (
         hinted < ?2
         OR (hinted = ?2 AND move_count < ?3)
         OR (hinted = ?2 AND move_count = ?3 AND time_spent < ?4)
         OR (hinted = ?2 AND move_count = ?3 AND time_spent = ?4 AND completed_at < ?5)
       )`,
    )
    .bind(date, mine.hinted, mine.move_count, mine.time_spent, mine.completed_at)
    .first<{ rank: number }>();
  return row?.rank ?? null;
}
