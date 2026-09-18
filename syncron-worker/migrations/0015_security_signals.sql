-- Migration: 0015_security_signals.sql
-- Description: Kötüye kullanım sinyallerinin (category = 'security') uid'den
--              BAĞIMSIZ sorgulanabilmesi için indeks.
--              bkz. .plans/yayin-hazirlik/03-rate-limit-ve-kotuye-kullanim.md §3.5
--
-- EKLEMELİ: hiçbir kolon silinmez, yeniden adlandırılmaz, hiçbir satır dokunulmaz
-- (00-ilkeler.md §2.5). Yalnızca yeni bir indeks eklenir.
--
-- Neden gerekli: mevcut indekslerin hepsi `uid` ile başlıyor
-- (idx_logs_uid_category_created). Güvenlik incelemesinin sorusu ise
-- "SON 24 SAATTE KİM OLURSA OLSUN hangi güvenlik olayları oldu?" — bu sorgu
-- bugün tam tablo taraması yapardı. Ayrıca `security.*` kayıtlarının bir kısmı
-- uid'i çözülemeyen ('unknown') olaylardır; uid ile başlayan indeks onlar için
-- hiçbir seçicilik sağlamaz.
--
-- Maliyet: audit_logs'a yazan her INSERT bir indeks daha günceller. Güvenlik
-- kayıtları eşik aşımında yazıldığı için hacimleri düşüktür; takas bilinçlidir.

CREATE INDEX IF NOT EXISTS idx_logs_category_created
  ON audit_logs(category, created_at DESC);
