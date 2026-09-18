-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 0014_soft_delete.sql
-- Description: Veri dayanıklılığı — Katman A (önleme). Kaynak tablolara
--              `deleted_at` kolonu ekler, böylece yıkıcı işlemler geri
--              alınabilir hâle gelir.
--              bkz. .plans/yayin-hazirlik/02-veri-dayanikliligi.md §3.1
--                   docs/release/veri-kurtarma.md
-- Depends on: 0005 (played_levels), 0006 (donor_profiles), 0012 (skipped_levels),
--             0013 (daily_results)
--
-- EKLEMELİ migration (00-ilkeler §2.5): hiçbir kolon silinmez, hiçbir kolon
-- yeniden adlandırılmaz, hiçbir satır dokunulmaz. Geri alınması ücretsizdir:
-- kolonu kullanan kod geri çekilirse veri aynen eski hâlinde kalır.
--
-- Semantik: `deleted_at IS NULL`  → satır canlı
--           `deleted_at = <ISO>`  → satır mantıksal olarak silinmiş; okuma
--                                   sorgularının onu görmemesi gerekir.
--
-- ─── Neden NULL'lanabilir TEXT, ayrı bir `is_deleted` bayrağı değil? ─────────
-- Alternatif 1 (reddedildi): `is_deleted INTEGER NOT NULL DEFAULT 0`. Ne zaman
--   silindiğini kaybeder; "30 gün önce silinenleri gerçekten temizle" gibi bir
--   bakım işi yazılamaz ve adli iz kurulamaz.
-- Alternatif 2 (reddedildi): silinen satırı ayrı bir `*_deleted` tablosuna
--   taşımak. Her yeni kaynak tablo için yeni bir gölge tablo + yeni migration
--   gerektirir (yani "yeni tür eklenince şema değişmek zorunda" kokusu) ve
--   taşıma sırasında satır iki tablo arasında kaybolabilir.
-- Değer eksik/NULL gelirse: NULL "canlı" demektir — yani migration'dan önceki
--   TÜM satırlar otomatik olarak canlı sayılır. Yanlış yönde hata yapmaz.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── played_levels ───────────────────────────────────────────────────────────
-- Oyuncu ilerlemesi: kaybı telafi edilemez (§1.2 "taç mücevher").
-- Tek yıkıcı yol: DELETE /admin/levels/:levelId kaskadı → artık soft delete.
ALTER TABLE played_levels ADD COLUMN deleted_at TEXT;

-- ─── skipped_levels ──────────────────────────────────────────────────────────
-- Atlanan bölümler kilit açma kuralına girer; kaybı oyuncunun ilerlemesini
-- geri sarar. played_levels ile aynı kaskadda silinir → aynı korumayı alır.
ALTER TABLE skipped_levels ADD COLUMN deleted_at TEXT;

-- ─── daily_results ───────────────────────────────────────────────────────────
-- Resmî günlük sonuçlar. Bugün kodda hiçbir soft delete yazıcısı YOKTUR;
-- kolon ileriye dönük olarak eklenmiştir (şema değişikliği canlı sistemde
-- yapmak yerine şimdi ucuza yapılır).
-- DİKKAT (sonraki geliştiriciye): bu tabloya ilk `deleted_at` YAZAN değişiklik,
-- aynı commit'te services/daily/dailyResults.ts + dailySchedule.ts + dailyView.ts
-- içindeki tüm okuma sorgularına `AND deleted_at IS NULL` eklemek ZORUNDADIR.
-- Aksi hâlde "silinmiş" satır liderlik tablosunda görünmeye devam eder.
ALTER TABLE daily_results ADD COLUMN deleted_at TEXT;

-- ─── donor_profiles ──────────────────────────────────────────────────────────
-- Para. En hassas tablo. Bugün hiçbir silme yolu yok; kolon aynı gerekçeyle
-- ileriye dönük eklenir. Okuma sorguları (routes/donorApi.ts) şimdiden
-- `deleted_at IS NULL` filtresi alır — bağış tablosunda "silinmiş ama görünen"
-- bir kayıt riskini hiç doğurmamak için.
ALTER TABLE donor_profiles ADD COLUMN deleted_at TEXT;

-- ─── Kısmî indeksler ─────────────────────────────────────────────────────────
-- Mevcut indeksler (idx_played_levels_uid_updated vb.) tüm satırları kapsar.
-- Soft delete sonrası sıcak sorgular yalnızca canlı satırlarla ilgilendiği için
-- kısmî indeks hem daha küçük hem de silinen satırlar büyüdükçe daha hızlıdır.
CREATE INDEX IF NOT EXISTS idx_played_levels_live_uid_updated
  ON played_levels(uid, updated_at ASC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_played_levels_live_level
  ON played_levels(level_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_skipped_levels_live_uid_updated
  ON skipped_levels(uid, updated_at ASC) WHERE deleted_at IS NULL;
