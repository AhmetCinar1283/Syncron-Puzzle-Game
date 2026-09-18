-- 0016_security_events.sql
-- Adli iz tablosu — .plans/yayin-hazirlik/05-loglama-ve-adli-iz.md §3.1, §3.2
--
-- NEDEN AYRI TABLO (audit_logs'a kolon eklemek yerine)?
--   `audit_logs` 90 gün saklanır ve `scheduled/logRetention.ts` ile R2'ye ARŞİVLENİR.
--   IP/UA o tabloya eklenseydi kişisel veri R2'ye taşınır ve 90 gün + süresiz arşiv
--   boyunca yaşardı. Ayrı tablo, ayrı saklama süresi (30 gün) ve arşivsiz silme
--   demektir — KVKK veri minimizasyonunun tek uygulanabilir yolu budur.
--
-- EKLEMELİ (00-ilkeler.md §2.5): yalnızca yeni tablo + yeni indeks. Hiçbir mevcut
-- kolon silinmez, yeniden adlandırılmaz, hiçbir satıra dokunulmaz.

CREATE TABLE IF NOT EXISTS security_events (
  -- audit_logs ile aynı kimlik üretimi (rastgele 16 bayt hex).
  id          TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  -- NULL olabilir: kimlik doğrulama başarısızlığında henüz uid YOKTUR.
  uid         TEXT,
  event_type  TEXT NOT NULL,
  endpoint    TEXT NOT NULL,
  -- TUZLU SHA-256 karması (hex, 32 karakter) — HAM IP DEĞİL.
  -- Tuz bir Worker sırrıdır (SECURITY_IP_SALT); tuz yoksa bu alan NULL kalır.
  ip          TEXT,
  -- İlk 256 karaktere kısaltılmış User-Agent.
  user_agent  TEXT,
  metadata    TEXT NOT NULL DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- "Bu kullanıcının son güvenlik olayları" — admin okuma yolu.
CREATE INDEX IF NOT EXISTS idx_security_events_uid_created
  ON security_events (uid, created_at DESC);

-- "30 günden eskiyi sil" — günlük temizlik cron'u (scheduled/securityEventRetention.ts).
CREATE INDEX IF NOT EXISTS idx_security_events_created
  ON security_events (created_at);

-- "Son 24 saatte kim olursa olsun kaç `auth.failed` oldu?" — olay tipi bazlı tarama.
CREATE INDEX IF NOT EXISTS idx_security_events_type_created
  ON security_events (event_type, created_at DESC);
