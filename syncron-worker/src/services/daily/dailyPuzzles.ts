/**
 * DOSYA AMACI: `daily_puzzles` tablosunun D1 işlemleri (bulmaca kütüphanesi).
 * Level içeriği JSON olarak saklanır; doğrulama `puzzleValidation.ts`'tedir.
 */

export type PuzzleStatus = 'draft' | 'approved';
export type PuzzleSource = 'designed' | 'generated';
export type ParSource = 'solver' | 'admin';

export interface DailyPuzzleRow {
  id: string;
  title: string;
  level_json: string;
  version: number;
  solution: string;
  par: number;
  par_source: ParSource;
  source: PuzzleSource;
  status: PuzzleStatus;
  in_pool: number;
  difficulty: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Liste görünümü: level içeriği hariç. */
export type DailyPuzzleSummary = Omit<DailyPuzzleRow, 'level_json' | 'solution'> & {
  /** Bu bulmacanın atandığı tarihler (artan). */
  dates: string[];
};

export interface PuzzleWrite {
  id: string;
  title: string;
  levelJson: string;
  solution: string;
  par: number;
  parSource: ParSource;
  source: PuzzleSource;
  status: PuzzleStatus;
  inPool: boolean;
  difficulty: number | null;
  createdBy: string;
}

export async function getPuzzle(db: D1Database, id: string): Promise<DailyPuzzleRow | null> {
  return db.prepare('SELECT * FROM daily_puzzles WHERE id = ?1').bind(id).first<DailyPuzzleRow>();
}

export async function listPuzzles(db: D1Database): Promise<DailyPuzzleSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT p.id, p.title, p.version, p.par, p.par_source, p.source, p.status, p.in_pool, p.difficulty,
              p.created_by, p.created_at, p.updated_at,
              (SELECT group_concat(s.date) FROM (SELECT date FROM daily_schedule WHERE puzzle_id = p.id ORDER BY date) AS s) AS dates_csv
       FROM daily_puzzles AS p
       ORDER BY p.updated_at DESC`,
    )
    .all<Omit<DailyPuzzleSummary, 'dates'> & { dates_csv: string | null }>();
  return (results ?? []).map(({ dates_csv, ...row }) => ({ ...row, dates: dates_csv ? dates_csv.split(',') : [] }));
}

/** Yeni bulmaca ekler ya da mevcut olanı günceller (içerik değişirse sürüm artar). */
export async function upsertPuzzle(db: D1Database, p: PuzzleWrite): Promise<void> {
  await db
    .prepare(
      `INSERT INTO daily_puzzles (id, title, level_json, solution, par, par_source, source, status, in_pool, difficulty, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         version = daily_puzzles.version + (CASE WHEN daily_puzzles.level_json <> excluded.level_json THEN 1 ELSE 0 END),
         level_json = excluded.level_json,
         solution = excluded.solution,
         par = excluded.par,
         par_source = excluded.par_source,
         status = excluded.status,
         in_pool = excluded.in_pool,
         difficulty = excluded.difficulty,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    )
    .bind(p.id, p.title, p.levelJson, p.solution, p.par, p.parSource, p.source, p.status, p.inPool ? 1 : 0, p.difficulty, p.createdBy)
    .run();
}

/** Yalnızca durum/havuz bayraklarını değiştirir (içerik ve sürüm korunur). */
export async function updatePuzzleFlags(
  db: D1Database,
  id: string,
  flags: { status?: PuzzleStatus; inPool?: boolean },
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE daily_puzzles SET
         status = COALESCE(?2, status),
         in_pool = COALESCE(?3, in_pool),
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?1`,
    )
    .bind(id, flags.status ?? null, flags.inPool === undefined ? null : flags.inPool ? 1 : 0)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function deletePuzzle(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM daily_puzzles WHERE id = ?1').bind(id).run();
}

/** Onaylı ve yedek havuzdaki bulmaca id'leri (kararlı sıra). */
export async function listPoolPuzzleIds(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare(`SELECT id FROM daily_puzzles WHERE status = 'approved' AND in_pool = 1 ORDER BY id`)
    .all<{ id: string }>();
  return (results ?? []).map((r) => r.id);
}
