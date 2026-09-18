# 06 — Günlük Bulmaca — Uygulama Planı

## Ürün sahibi kararları (2026-09-14)

| Konu | Karar |
|---|---|
| Profil ödülü | **Yalnızca XP.** Resmî ilk tamamlamada sabit XP (50, ipuçlu 25). totalScore / completedCount / yıldız-rekor liderlikleri etkilenmez. |
| Arşiv | **Ücretsiz.** Arşiv oynanışı seri ve günlük liderliği etkilemez, XP vermez. Normal bölüm arası reklam kuralı geçerli. |
| Çözülebilirlik | Çözücü **admin tarayıcısında** çalışır (worker CPU sınırı). Worker gönderilen çözümü **oynatarak** doğrular. Çözücü bulamazsa **adminin kendi çözümü** (editör test modunda oynanmış) kabul edilir; par = o çözümün hamle sayısı, "par optimal olmayabilir" işaretlenir. |
| Paylaşım | `@capacitor/share` (yerelde, dinamik import) → `navigator.share` → pano. |

## Mimari kararlar

- **Veri D1'de** (Firestore'da değil): bulmacalar, takvim, ayarlar, resmî sonuçlar, seriler. Tek yazar worker; admin CRUD `adminAuth` ile, yazma yalnızca `role === 'admin'`.
- **Kampanya `/complete-level`'a dokunulmaz.** Ayrı `POST /daily/complete`: aynı `verifyMoves` + `hintScoring` kullanılır; `played_levels`, solutions, dünya rekorları yazılmaz.
- **"Aynı gün aynı bulmaca":** takvim `daily_schedule(date PK)`. Boş gün + politika `pool` → yedek havuzdan tarih-hash'iyle seçilir ve `INSERT OR IGNORE` ile o güne **kalıcı** yazılır (herkes aynısını görür, havuz sonradan değişse bile).
- **Tarih referansı UTC.** Bulmaca numarası `#N` = `DAILY_EPOCH`'tan bu yana gün + 1.
- **Resmî sonuç** = o günün tarihinde (UTC) yapılan ilk doğrulanmış tamamlama (`daily_results` PK `(uid,date)`, `INSERT OR IGNORE`). Tekrar oynama doğrulanır ama kayıt değişmez. Arşiv (geçmiş tarih) doğrulanır, hiçbir şey yazılmaz.
- **Seri:** resmî tamamlamada `last_date == dün → current+1`, `== bugün → değişmez`, aksi → 1. Okurken `last_date < dün` ise gösterilen seri 0.
- **Yıldız (par'a göre):** `moves ≤ par → 3`, `≤ floor(par×1.2) → 2`, aksi 1; ipuçlu en fazla 2 (mevcut `capStarsForHint`).
- **Günlük liderlik:** `daily_results` üzerinden; sıra `hinted ASC, move_count ASC, time_spent ASC, completed_at ASC`; ipuçlu satır işaretli. Mevcut kampanya liderlik tabloları (dönem skorları) yapısal olarak farklı olduğu için yeniden kullanılmaz; yalnızca `user_profiles` (isim/tag) JOIN'i paylaşılır.
- **İpucu:** mevcut ödüllü ipucu akışı `levelId = 'daily:<puzzleId>'` ile çalışır; hint handler bu önekte level'ı D1'den yükler. (İpucu şu an global olarak KAPALI — açıldığında günlükte de çalışır.) **Atlama** günlükte UI'da gösterilmez, sunucuda da `level-not-in-part` ile reddedilir.
- **Düzenleme kilidi:** geçmiş tarih değiştirilemez; bugünün ataması yalnızca sonuç yoksa değişir; bugüne/geçmişe atanmış bulmacanın içeriği değiştirilemez.
- **Portal / platform:** yetenek nesnesine `dailyPuzzle` eklenir; giriş noktası `dailyPuzzle && worker yapılandırılmış` ise görünür. Paylaşım metnine link yalnızca `externalLinks` true ise eklenir.
- **OG:** statik export olduğu için `/daily` rotasına sabit Open Graph metadata (günlük dinamik görsel yok).

## Dosya planı

### Worker
- `migrations/0013_daily_puzzles.sql`
- `services/daily/`: `dailyDate.ts` (saf UTC), `dailyPolicy.ts` (sabitler, yıldız, seri — saf), `dailyPuzzles.ts`, `dailySchedule.ts`, `dailySettings.ts`, `dailyResults.ts`, `dailyStreaks.ts`, `puzzleValidation.ts`, `completeDaily.ts`, `dailyLevelSource.ts`, `dailyXp.ts`
- `schemas/daily.ts`, `routes/daily.ts` (oyuncu), `routes/adminDaily.ts`
- `services/hint/hintAction.ts` (daily: öneki), `scheduled/anonymousCleanup.ts`, `index.ts`
- `test/daily.spec.ts`

### İstemci
- `services/api/dailyClient.ts`, `services/api/adminDailyClient.ts`, `services/share/` (paylaş/kopyala)
- `services/monetization/capabilities.ts` (`dailyPuzzle`)
- `game-engine/solver/par.ts` (derin çözüm + hamle kodları)
- `features/daily/` (hub, oyun, sonuç, paylaşım, liderlik, arşiv) + `app/daily/`, `app/daily/play/`, portal rotaları, ana sayfa kartı
- `features/play/index.ts` → `usePlaySession`, `usePlayHint`, `HintDialog`, `usePlayAds` public API
- `features/admin/daily-calendar/` (takvim, boşluk uyarısı, kütüphane, aday üretici, ayarlar) + `app/admin/daily-calendar/`, dashboard kartı
- `features/editor/`: admin için "Günlük Bulmaca olarak kaydet" diyaloğu, `?dailyPuzzleId=` / `?dailyDraft=1` yükleme, test modunda çözüm kaydı
- i18n (tr/en), `docs/daily-puzzle.md`, README'ler, `src/README.md`, rapor
