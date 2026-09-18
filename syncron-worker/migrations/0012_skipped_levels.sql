-- Migration: 0012_skipped_levels.sql
-- Description: Ödüllü level atlama (05). bkz. .plans/monetization/05-odullu-level-atlama.md,
--              raporlar/05-rapor.md

-- Oyuncunun ödüllü reklamla atladığı level'lar. Bu tablo SKOR TAŞIMAZ: yıldız, skor,
-- hamle sayısı, XP ya da liderlik bilgisi yoktur. played_levels'a hiç yazılmaz; böylece
-- /complete-level (ilk tamamlama, yıldız, rekor) ve level silme kaskadı atlamadan etkilenmez.
-- Atlanan level daha sonra gerçekten çözülürse satır kalır; "çözüldü" durumu played_levels'tan
-- okunur ve önceliklidir (satır analitik için de sayılır).
CREATE TABLE IF NOT EXISTS skipped_levels (
  uid           TEXT    NOT NULL CHECK (length(uid) BETWEEN 1 AND 128),
  level_id      TEXT    NOT NULL CHECK (length(level_id) BETWEEN 1 AND 128),
  level_version INTEGER,                         -- atlandığı level sürümü (telemetri)
  grant_id      TEXT    NOT NULL,                -- reward_grants.id (kanıt)
  skipped_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (uid, level_id)
);

-- Delta sync: GET /played-levels?since=T
CREATE INDEX IF NOT EXISTS idx_skipped_levels_uid_updated ON skipped_levels(uid, updated_at ASC);
-- Level analitiği (level başına atlama sayısı) + admin level silme kaskadı.
CREATE INDEX IF NOT EXISTS idx_skipped_levels_level ON skipped_levels(level_id, level_version);
