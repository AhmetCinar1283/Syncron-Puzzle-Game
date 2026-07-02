-- Migration: 0010_level_telemetry.sql
-- Description: Add level_telemetry and level_feedback tables for level quality tracking.

-- Track play sessions, attempts, deaths, restarts, and outcomes
CREATE TABLE IF NOT EXISTS level_telemetry (
  id           TEXT NOT NULL PRIMARY KEY,
  uid          TEXT NOT NULL,
  level_id     TEXT NOT NULL,
  version      INTEGER NOT NULL,
  outcome      TEXT NOT NULL,             -- 'win' | 'restart' | 'quit'
  time_spent   INTEGER NOT NULL,          -- seconds
  restarts     INTEGER NOT NULL DEFAULT 0, -- number of restart buttons clicked during the session
  deaths       INTEGER NOT NULL DEFAULT 0,   -- number of actual deaths/failures before restart
  moves_count  INTEGER NOT NULL DEFAULT 0, -- total moves made in this session
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Track explicit feedback (likes and difficulty rating)
CREATE TABLE IF NOT EXISTS level_feedback (
  id           TEXT NOT NULL PRIMARY KEY,
  uid          TEXT NOT NULL,
  level_id     TEXT NOT NULL,
  version      INTEGER NOT NULL,
  difficulty   TEXT NOT NULL,             -- 'easy' | 'normal' | 'hard'
  liked        INTEGER NOT NULL,          -- 1 = liked (thumbs up), 0 = disliked (thumbs down)
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(uid, level_id, version)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_level_ver ON level_telemetry(level_id, version);
CREATE INDEX IF NOT EXISTS idx_feedback_level_ver ON level_feedback(level_id, version);
