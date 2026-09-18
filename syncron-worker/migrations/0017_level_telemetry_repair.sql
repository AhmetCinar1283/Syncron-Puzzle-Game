-- Migration: 0017_level_telemetry_repair.sql
-- Description: `level_telemetry` / `level_feedback` tablolarının VARLIĞINI garanti eder.
--
-- NEDEN: Üretimde `level_telemetry` tablosu boştu. İstemci telemetriyi gönderiyor,
-- worker uç noktası isteği alıyor, ama D1 yazımı başarısız olduğunda hata hem
-- worker'da (console.error) hem istemcide (console.warn) sessizce yutuluyordu.
-- Bu migration, 0010/0011'in uygulanmadığı bir ortamda tabloyu DOĞRU nihai
-- şemasıyla (hints_used dahil) oluşturur.
--
-- EKLEMELİDİR: hiçbir kolon silinmez/yeniden adlandırılmaz. Tablolar zaten
-- varsa `IF NOT EXISTS` sayesinde bu dosya tamamen etkisizdir (no-op).
--
-- UYARI: Tablo VAR ama `hints_used` kolonu YOKSA (yani 0010 uygulanmış, 0011
-- uygulanmamışsa) bu dosya onu ekleyemez — SQLite'ta `ALTER TABLE ... ADD COLUMN
-- IF NOT EXISTS` yoktur ve koşulsuz ALTER, kolon varsa migration'ı hataya
-- düşürürdü. O durum `0011_reward_grants.sql` uygulanarak çözülür.

CREATE TABLE IF NOT EXISTS level_telemetry (
  id           TEXT NOT NULL PRIMARY KEY,
  uid          TEXT NOT NULL,
  level_id     TEXT NOT NULL,
  version      INTEGER NOT NULL,
  outcome      TEXT NOT NULL,              -- 'win' | 'restart' | 'quit' | 'skip'
  time_spent   INTEGER NOT NULL,           -- saniye
  restarts     INTEGER NOT NULL DEFAULT 0,
  deaths       INTEGER NOT NULL DEFAULT 0,
  moves_count  INTEGER NOT NULL DEFAULT 0,
  hints_used   INTEGER NOT NULL DEFAULT 0, -- 0011 ile eklenmişti; burada baştan var
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS level_feedback (
  id           TEXT NOT NULL PRIMARY KEY,
  uid          TEXT NOT NULL,
  level_id     TEXT NOT NULL,
  version      INTEGER NOT NULL,
  difficulty   TEXT NOT NULL,              -- 'easy' | 'normal' | 'hard'
  liked        INTEGER NOT NULL,           -- 1 = beğendi, 0 = beğenmedi
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(uid, level_id, version)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_level_ver ON level_telemetry(level_id, version);
CREATE INDEX IF NOT EXISTS idx_feedback_level_ver  ON level_feedback(level_id, version);
