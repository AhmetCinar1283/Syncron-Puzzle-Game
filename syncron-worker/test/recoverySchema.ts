/**
 * DOSYA AMACI: 02 (veri dayanıklılığı) testlerinin paylaştığı D1 şema tanımları.
 * migrations/0001–0014 ile aynı kolonları taşır; CHECK kısıtları testin konusu
 * olmadığı için sadeleştirilmiştir.
 */

/** Yeniden hesaplama testlerinin ihtiyaç duyduğu tablolar. */
export const RECOVERY_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    uid TEXT NOT NULL, action TEXT NOT NULL, category TEXT NOT NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS played_levels (
    uid TEXT NOT NULL, level_id TEXT NOT NULL, stars INTEGER NOT NULL, score INTEGER NOT NULL DEFAULT 0,
    move_count INTEGER NOT NULL, time_spent INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at TEXT,
    PRIMARY KEY (uid, level_id)
  )`,
  `CREATE TABLE IF NOT EXISTS deleted_levels (
    level_id TEXT NOT NULL PRIMARY KEY,
    deleted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS skipped_levels (
    uid TEXT NOT NULL, level_id TEXT NOT NULL, level_version INTEGER, grant_id TEXT NOT NULL,
    skipped_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at TEXT,
    PRIMARY KEY (uid, level_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_period_scores (
    uid TEXT NOT NULL, period_type TEXT NOT NULL, period_id TEXT NOT NULL,
    stars_gained INTEGER NOT NULL DEFAULT 0, levels_done INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (uid, period_type, period_id)
  )`,
  `CREATE TABLE IF NOT EXISTS creator_scores (
    uid TEXT NOT NULL, period_type TEXT NOT NULL, period_id TEXT NOT NULL,
    plays_gained INTEGER NOT NULL DEFAULT 0, stars_gained INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (uid, period_type, period_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_world_records (
    uid TEXT NOT NULL, period_type TEXT NOT NULL, period_id TEXT NOT NULL,
    records_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (uid, period_type, period_id)
  )`,
  `CREATE TABLE IF NOT EXISTS badges (
    id TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    uid TEXT NOT NULL, badge_type TEXT NOT NULL, period_id TEXT NOT NULL, rank INTEGER NOT NULL,
    awarded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_unique ON badges(uid, badge_type, period_id)`,
  `CREATE TABLE IF NOT EXISTS user_profiles (
    uid TEXT NOT NULL PRIMARY KEY, display_name TEXT NOT NULL, tag TEXT UNIQUE,
    xp INTEGER NOT NULL DEFAULT 0, showcase_badges TEXT, is_ranked INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
];

/** Dışa aktarım testinin ihtiyaç duyduğu, yukarıda tanımlı OLMAYAN kaynak tablolar. */
export const EXPORT_EXTRA_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS donor_profiles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), uid TEXT UNIQUE,
    display_name TEXT NOT NULL DEFAULT 'Anonim', total_donated_cents INTEGER NOT NULL DEFAULT 0,
    badge_tier TEXT, is_anonymous INTEGER NOT NULL DEFAULT 0, deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS store_events (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), uid TEXT, event_type TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS reward_grants (
    id TEXT PRIMARY KEY, uid TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS daily_results (
    uid TEXT NOT NULL, date TEXT NOT NULL, puzzle_id TEXT NOT NULL, move_count INTEGER NOT NULL,
    time_spent INTEGER NOT NULL DEFAULT 0, stars INTEGER NOT NULL, hinted INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), deleted_at TEXT,
    PRIMARY KEY (uid, date)
  )`,
  `CREATE TABLE IF NOT EXISTS daily_streaks (
    uid TEXT NOT NULL PRIMARY KEY, current INTEGER NOT NULL DEFAULT 0, best INTEGER NOT NULL DEFAULT 0,
    last_date TEXT, updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS daily_puzzles (
    id TEXT NOT NULL PRIMARY KEY, title TEXT NOT NULL, level_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1, solution TEXT NOT NULL, par INTEGER NOT NULL,
    par_source TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL,
    in_pool INTEGER NOT NULL DEFAULT 0, difficulty INTEGER, created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS daily_schedule (
    date TEXT NOT NULL PRIMARY KEY, puzzle_id TEXT NOT NULL, assigned_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS daily_settings (
    key TEXT NOT NULL PRIMARY KEY, value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS user_bans (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), uid TEXT NOT NULL,
    ban_type TEXT NOT NULL, reason TEXT, issued_by TEXT, expires_at TEXT, lifted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS friendships (
    user_a TEXT NOT NULL, user_b TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    requested_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (user_a, user_b)
  )`,
];

export const ALL_TABLES = [
  'audit_logs', 'played_levels', 'deleted_levels', 'skipped_levels', 'user_period_scores',
  'creator_scores', 'user_world_records', 'badges', 'user_profiles', 'donor_profiles',
  'store_events', 'reward_grants', 'daily_results', 'daily_streaks', 'daily_puzzles',
  'daily_schedule', 'daily_settings', 'user_bans', 'friendships',
];
