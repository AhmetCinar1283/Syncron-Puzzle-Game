-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: 0018_leaderboard_ranked.sql
-- Description: Liderlik tablolarında anonim oyuncuların GÖRÜNMEMESİ için
--              `user_profiles.is_ranked` bayrağı.
-- Depends on: 0002 (user_profiles)
--
-- Semantik: is_ranked = 1 → oyuncu herkese açık sıralamalarda listelenir,
--           rozet alır. is_ranked = 0 → anonim (ya da henüz doğrulanmamış);
--           yalnızca KENDİ sırasını görür, kimsenin listesinde yer almaz.
--
-- Ölçüt, middleware/auth.ts ile aynı ilke: doğrulanmış e-posta ≡ anonim değil.
-- Bayrak yalnızca 0 → 1 yönünde ilerler (complete-level, daily/complete ve
-- leaderboard okumasında token `email_verified` ise).
--
-- Varsayılan 0 (güvenli taraf): D1'de anonim/kayıtlı ayrımı tutulmuyordu.
-- Tag'i olan kullanıcı kesin kayıtlıdır (tag yalnızca doğrulanmış e-postayla
-- alınır) → geri doldurulur. Tag'i olmayan kayıtlı oyuncu, bir sonraki seviye
-- bitirişinde ya da liderlik sayfasını açtığında listeye girer.
--
-- EKLEMELİ migration: kolon silinmez, mevcut satırlar bozulmaz.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE user_profiles ADD COLUMN is_ranked INTEGER NOT NULL DEFAULT 0 CHECK (is_ranked IN (0, 1));

UPDATE user_profiles SET is_ranked = 1 WHERE tag IS NOT NULL;
