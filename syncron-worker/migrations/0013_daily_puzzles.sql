-- Migration: 0013_daily_puzzles.sql
-- Description: Günlük Bulmaca — bulmaca kütüphanesi, takvim, ayarlar, resmî sonuçlar ve seriler.
-- bkz. .plans/monetization/06-gunluk-bulmaca.md, raporlar/06-rapor.md, docs/daily-puzzle.md

-- Admin'in onayladığı/taslak bulmacalar. İçerik (level JSON) yalnızca worker'dan okunur.
-- Kaydedilirken çözüm worker'da oynatılarak doğrulanır; par = doğrulanan çözümün hamle sayısı.
CREATE TABLE IF NOT EXISTS daily_puzzles (
  id            TEXT    NOT NULL PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
  title         TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  level_json    TEXT    NOT NULL CHECK (length(level_json) BETWEEN 2 AND 200000),
  version       INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  solution      TEXT    NOT NULL CHECK (length(solution) BETWEEN 1 AND 500),  -- hamle kodları, ör. 'uurls'
  par           INTEGER NOT NULL CHECK (par >= 1),
  par_source    TEXT    NOT NULL CHECK (par_source IN ('solver', 'admin')),   -- 'admin': optimal olmayabilir
  source        TEXT    NOT NULL CHECK (source IN ('designed', 'generated')),
  status        TEXT    NOT NULL CHECK (status IN ('draft', 'approved')),
  in_pool       INTEGER NOT NULL DEFAULT 0 CHECK (in_pool IN (0, 1)),         -- boş gün yedek havuzu
  difficulty    INTEGER CHECK (difficulty IS NULL OR difficulty BETWEEN 1 AND 4),
  created_by    TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_daily_puzzles_pool ON daily_puzzles(status, in_pool);

-- Tarih (UTC, 'YYYY-MM-DD') → bulmaca. Boş gün yedek havuzdan doldurulursa satır
-- kalıcı yazılır (assigned_by='fallback') → o gün herkes aynı bulmacayı görür.
CREATE TABLE IF NOT EXISTS daily_schedule (
  date          TEXT    NOT NULL PRIMARY KEY
                        CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  puzzle_id     TEXT    NOT NULL REFERENCES daily_puzzles(id),
  assigned_by   TEXT    NOT NULL CHECK (assigned_by IN ('admin', 'fallback')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_puzzle ON daily_schedule(puzzle_id);

-- Anahtar/değer ayarları (ör. empty_day_policy = 'pool' | 'none').
CREATE TABLE IF NOT EXISTS daily_settings (
  key           TEXT    NOT NULL PRIMARY KEY CHECK (length(key) BETWEEN 1 AND 64),
  value         TEXT    NOT NULL CHECK (length(value) <= 256),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Resmî sonuç: o günün tarihinde yapılan İLK doğrulanmış tamamlama. Satır değişmez.
-- Günlük liderlik bu tablodan okunur. Arşiv oynanışı buraya yazılmaz.
CREATE TABLE IF NOT EXISTS daily_results (
  uid           TEXT    NOT NULL CHECK (length(uid) BETWEEN 1 AND 128),
  date          TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  puzzle_id     TEXT    NOT NULL,
  move_count    INTEGER NOT NULL CHECK (move_count >= 1),
  time_spent    INTEGER NOT NULL DEFAULT 0 CHECK (time_spent >= 0),
  stars         INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 3),
  hinted        INTEGER NOT NULL DEFAULT 0 CHECK (hinted IN (0, 1)),
  completed_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (uid, date)
);
CREATE INDEX IF NOT EXISTS idx_daily_results_rank
  ON daily_results(date, hinted, move_count, time_spent, completed_at);

-- Art arda gün serisi (yalnızca resmî tamamlamalar).
CREATE TABLE IF NOT EXISTS daily_streaks (
  uid           TEXT    NOT NULL PRIMARY KEY CHECK (length(uid) BETWEEN 1 AND 128),
  current       INTEGER NOT NULL DEFAULT 0 CHECK (current >= 0),
  best          INTEGER NOT NULL DEFAULT 0 CHECK (best >= 0),
  last_date     TEXT    CHECK (last_date IS NULL OR last_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
