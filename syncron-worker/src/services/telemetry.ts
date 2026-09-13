/**
 * DOSYA AMACI: Bu dosya, seviye deneme istatistikleri (level_telemetry) ve kullanıcı 
 * geri bildirimleri (level_feedback) için D1 veritabanı işlemlerini barındırır.
 */

export interface LevelTelemetryParams {
  id: string; // generated on client
  uid: string;
  levelId: string;
  version: number;
  outcome: 'win' | 'restart' | 'quit';
  timeSpent: number; // in seconds
  restarts: number;
  deaths: number;
  movesCount: number;
  hintsUsed: number;
}

export interface LevelFeedbackParams {
  uid: string;
  levelId: string;
  version: number;
  difficulty: 'easy' | 'normal' | 'hard';
  liked: number; // 1 = thumbs up, 0 = thumbs down
}

/**
 * Inserts a play session telemetry attempt into D1.
 */
export async function insertTelemetry(
  db: D1Database,
  params: LevelTelemetryParams,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO level_telemetry
         (id, uid, level_id, version, outcome, time_spent, restarts, deaths, moves_count, hints_used)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    )
    .bind(
      params.id,
      params.uid,
      params.levelId,
      params.version,
      params.outcome,
      params.timeSpent,
      params.restarts,
      params.deaths,
      params.movesCount,
      params.hintsUsed,
    )
    .run();
}

/**
 * Upserts a level feedback entry. If a feedback already exists for this (uid, level_id, version),
 * it updates the rating and difficulty feedback.
 */
export async function upsertFeedback(
  db: D1Database,
  params: LevelFeedbackParams,
): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO level_feedback
         (id, uid, level_id, version, difficulty, liked)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT (uid, level_id, version) DO UPDATE SET
         difficulty = excluded.difficulty,
         liked      = excluded.liked,
         created_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
    )
    .bind(
      id,
      params.uid,
      params.levelId,
      params.version,
      params.difficulty,
      params.liked,
    )
    .run();
}

export interface AggregatedLevelAnalytics {
  level_id: string;
  version: number;
  total_attempts: number;
  wins: number;
  quits: number;
  total_restarts: number;
  total_deaths: number;
  total_hints: number;
  hinted_attempts: number;
  avg_time_win: number;
  likes: number;
  dislikes: number;
  votes_easy: number;
  votes_normal: number;
  votes_hard: number;
}

/**
 * Fetches all aggregated level analytics and feedback per level-version.
 */
export async function getLevelAnalytics(db: D1Database): Promise<AggregatedLevelAnalytics[]> {
  const query = `
    SELECT 
      t.level_id,
      t.version,
      COUNT(DISTINCT t.id) as total_attempts,
      COUNT(DISTINCT CASE WHEN t.outcome = 'win' THEN t.id END) as wins,
      COUNT(DISTINCT CASE WHEN t.outcome = 'quit' THEN t.id END) as quits,
      SUM(t.restarts) as total_restarts,
      SUM(t.deaths) as total_deaths,
      SUM(t.hints_used) as total_hints,
      COUNT(DISTINCT CASE WHEN t.hints_used > 0 THEN t.id END) as hinted_attempts,
      AVG(CASE WHEN t.outcome = 'win' THEN t.time_spent END) as avg_time_win,
      COALESCE(f.likes, 0) as likes,
      COALESCE(f.dislikes, 0) as dislikes,
      COALESCE(f.votes_easy, 0) as votes_easy,
      COALESCE(f.votes_normal, 0) as votes_normal,
      COALESCE(f.votes_hard, 0) as votes_hard
    FROM level_telemetry t
    LEFT JOIN (
      SELECT 
        level_id,
        version,
        COUNT(CASE WHEN liked = 1 THEN 1 END) as likes,
        COUNT(CASE WHEN liked = 0 THEN 1 END) as dislikes,
        COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as votes_easy,
        COUNT(CASE WHEN difficulty = 'normal' THEN 1 END) as votes_normal,
        COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as votes_hard
      FROM level_feedback
      GROUP BY level_id, version
    ) f ON t.level_id = f.level_id AND t.version = f.version
    GROUP BY t.level_id, t.version
  `;

  const result = await db.prepare(query).all<AggregatedLevelAnalytics>();
  return result.results;
}

