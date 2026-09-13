-- Migration: 0011_reward_grants.sql
-- Description: Ödüllü aksiyonlar (ipucu, ileride level atlama) + telemetride ipucu sayısı.
-- bkz. .plans/monetization/04-odullu-ipucu.md, raporlar/04-rapor.md

-- Sunucunun hazırladığı / teslim ettiği her ödül. Ödülün İÇERİĞİ (ör. ipucu hamleleri)
-- sunucuda hesaplanır ve burada saklanır; istemciye yalnızca `claim` ile verilir.
-- Satırlar silinmez: kim, ne zaman, hangi yoldan, NE aldı sorusunun cevabıdır.
-- Her durum geçişi ayrıca audit_logs'a (category='reward') yazılır ve R2'ye arşivlenir.
CREATE TABLE IF NOT EXISTS reward_grants (
  id            TEXT    NOT NULL PRIMARY KEY,   -- sunucunun ürettiği requestId
  uid           TEXT    NOT NULL,
  action        TEXT    NOT NULL,               -- 'hint' | ...
  level_id      TEXT,                           -- level'a bağlı aksiyonlarda Firestore id
  level_version INTEGER,                        -- hesaplandığı level sürümü
  input_key     TEXT    NOT NULL,               -- girdi (ipucu: hamle dizisi, ör. 'uurls')
  status        TEXT    NOT NULL,               -- 'prepared' | 'delivered' | 'cancelled' | 'unavailable'
  via           TEXT,                           -- teslimde: 'ad' | 'ad-free' | 'free'
  platform      TEXT,                           -- istemci beyanı (web, android, crazygames...)
  result_json   TEXT,                           -- teslim edilen/edilecek içerik (kanıt)
  reason        TEXT,                           -- unavailable / cancelled nedeni
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  delivered_at  TEXT,
  cancelled_at  TEXT,
  consumed_at   TEXT                            -- bir level tamamlamaya uygulandığı an
);

-- Aynı durum için tekrar hesaplama yapmamak (yeniden kullanım).
CREATE INDEX IF NOT EXISTS idx_reward_grants_reuse ON reward_grants(uid, action, level_id, input_key, created_at);
-- Kötüye kullanım tavanı (24 saat / 1 dakika).
CREATE INDEX IF NOT EXISTS idx_reward_grants_uid_time ON reward_grants(uid, action, created_at);
-- Ücretsiz kota ve /complete-level'daki açık ipucu kontrolü.
CREATE INDEX IF NOT EXISTS idx_reward_grants_level_status ON reward_grants(uid, action, level_id, status, consumed_at);

-- Oturum başına kullanılan ipucu sayısı (level zorluk ayarı için).
ALTER TABLE level_telemetry ADD COLUMN hints_used INTEGER NOT NULL DEFAULT 0;
