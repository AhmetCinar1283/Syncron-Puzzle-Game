# 06 — Günlük Bulmaca — Rapor

Plan: `06-plan.md`. Kullanım ve kurallar: `docs/daily-puzzle.md`.

## Kararlar (ürün sahibi — Ahmet, 2026-09-14)

| Konu | Karar |
|---|---|
| Profil ödülü | **Yalnızca XP**: resmî ilk tamamlama 50, ipuçlu 25. totalScore / completedCount / kampanya liderliği etkilenmez. |
| Arşiv | **Ücretsiz**; seri, liderlik, XP etkilenmez. |
| Çözülebilirlik | Çözücü admin tarayıcısında; worker çözümü **oynatarak** doğrular. Çözücü bulamazsa adminin test modu çözümü kabul edilir (`par_source='admin'`, "en iyi olmayabilir"). |
| Paylaşım | `@capacitor/share` (dinamik import) → `navigator.share` → pano. |

## Akış

```
Admin                                   Worker (D1)                         Oyuncu
─────                                   ───────────                         ──────
Editör / aday üretici
  çözücü (tarayıcı) ya da test çözümü
POST /admin/daily/puzzles ────────────▶ verifyMoves(çözüm) → par
  (onaylı + tarih)                       daily_puzzles, daily_schedule
                                                                  ◀──────── GET /daily/today
                                         boş bugün + politika pool →        (level + par; çözüm YOK)
                                         havuzdan seç, kalıcı yaz
                                                                  ◀──────── POST /daily/complete
                                         verifyMoves → hint kayıtları → yıldız
                                         bugünse: daily_results (ilk) → seri (atomik) → XP
                                         ────────────────────────────────▶ sonuç, seri, sıra → Paylaş
```

## Ne yapıldı

### Worker (`syncron-worker/`)

| Dosya | Değişiklik |
|---|---|
| `migrations/0013_daily_puzzles.sql` | `daily_puzzles`, `daily_schedule`, `daily_settings`, `daily_results`, `daily_streaks` |
| `services/daily/*` (13 dosya + README) | Tarih, politika (saf), CRUD, takvim + havuz, sonuç/liderlik, seri, doğrulama, tamamlama, görünümler, XP, admin kuralları |
| `schemas/daily.ts`, `routes/daily.ts`, `routes/adminDaily.ts`, `index.ts` | İnce rotalar + Zod |
| `services/hint/hintAction.ts` | `daily:` önekli level'ı D1'den yükler (yalnızca yayınlanmış) |
| `services/auditLog.ts` | `daily.complete`, `admin.daily_*` aksiyonları |
| `scheduled/anonymousCleanup.ts` | `daily_results`, `daily_streaks` da silinir |
| `test/daily.spec.ts` | 23 test |

### İstemci (`src/`)

| Yer | Değişiklik |
|---|---|
| `features/daily/` (+README) | Hub, oyun, sonuç kartı, paylaşım, günlük liderlik, arşiv |
| `features/admin/daily-calendar/` (+README) | Takvim, boşluk uyarısı, politika, kütüphane, aday üretici |
| `features/editor/` | `useDailyPuzzleEditor` + `DailyPuzzleDialog`; test modu hamle kaydı (`EditorTestOverlay.onSolved`); admin'e üst çubuk butonu |
| `features/home/` | "Günün Bulmacası" hero kartı; menü klavye/gamepad gezinmesi saf `lib/menuGrid.ts`'e taşındı (+test) |
| `features/play/index.ts` | Günlük oyunun kullandığı hook/bileşenler public API'ye eklendi |
| `features/admin/dashboard` | "Daily Puzzle" kartı |
| `app/daily/`, `app/daily/play/`, `app/admin/daily-calendar/`, `app/_portal/portalRoutes.tsx` | Rotalar; `/daily` statik OG/Twitter metadata |
| `services/api/dailyClient.ts`, `adminDailyClient.ts` | Worker istemcileri |
| `services/share/` (+README) | Paylaş/kopyala servisi |
| `services/monetization/capabilities.ts` | `dailyPuzzle` yeteneği (6 platformda da açık) |
| `game-engine/solver/par.ts` | Derin bütçeli par çözücüsü + hamle kodları |
| `game-engine/components/LevelMiniPreview.tsx` | Editörün `GeneratorMiniPreview`'ı buraya taşındı (iki feature ortak kullanır) |
| `lib/dailyDraftHandoff.ts` | Takvim → editör aktarım sözleşmesi |
| `lib/i18n/tr.ts`, `en.ts` | `home.daily*`, `daily.*`, `daily_admin.*` |
| `package.json` | `@capacitor/share` |
| Dokümanlar | `docs/daily-puzzle.md` (yeni), `docs/scoring.md` → Daily Puzzle, `src/README.md`, `syncron-worker/README.md` |

## Güvenlik ve tutarlılık kontrolü

Uygulama sonrası ayrıca gözden geçirildi; bulunan ve **düzeltilen** noktalar:

| Bulgu | Düzeltme |
|---|---|
| Resmî sonuç yazılıp seri yazımı düşerse (ör. D1 hatası) yeniden denemede `INSERT OR IGNORE` "kayıt yok" dediği için seri ve XP **kalıcı kayboluyordu**. | `recordStreakDay` artık her resmî denemede çalışır, koşullu upsert (`WHERE last_date IS NOT excluded.last_date`) ile **atomik ve idempotent**; XP, günün seride gerçekten işlendiği çağrıya bağlandı. Eşzamanlı iki istek de XP'yi iki kez veremez. Test eklendi. |
| Moderatör `GET /admin/daily/puzzles/:id` ile gelecek bulmacaların level + **çözümünü** okuyup liderliği önceden çözerek bozabilirdi. | Uç nokta yalnızca admin. Moderatör listeyi/takvimi görmeye devam eder (editör entegrasyonu zaten yalnızca admin). |
| `timeSpent` üst sınırsızdı. | Resmî kayıtta 24 saate kırpılır (`DAILY_POLICY.maxTimeSpentSeconds`). Test eklendi. |

Doğrulanan (değişiklik gerekmeyen) noktalar:

- Gelecek tarih hiçbir oyuncu uç noktasından (bulmaca, liderlik, tamamlama, ipucu) çözümlenmez; çözüm oyuncuya dönmez.
- Onaysız bulmaca takvime atanamaz, havuzdan seçilmez, oyuncuya ve ipucuna çözümlenmez.
- Tüm SQL parametreli; admin yazmaları rol kontrolü + Zod + audit log; `/daily/complete` ban kontrolü yapar.
- İstemci yeni kodda `any`, `dangerouslySetInnerHTML` yok; başlıklar React ile kaçışlanır.
- i18n: kodda kullanılan tüm anahtarlar tr ve en'de mevcut (script ile kontrol edildi).

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| Worker `tsc --noEmit` | Temiz |
| Worker `vitest` | **135/135** (daily 23) |
| İstemci `tsc --noEmit` | Temiz |
| İstemci `vitest` | **86/86** (önce 78; yeni: shareText, menuGrid, candidateFilters) |
| `eslint` (değişen modüller) | Değişen/yeni dosyalarda hata yok. Kalan hatalar dokunulmamış dosyalarda (ör. `useWinFeedback.ts`, portal provider testlerindeki `any`) — kapsam dışı. |
| `npm run build` | Başarılı; `/daily`, `/daily/play`, `/admin/daily-calendar` statik üretildi |
| Elle test | **Yapılmadı** (cihaz/tarayıcıda uçtan uca akış, Android paylaşım menüsü, portal build'leri). |

## Sapmalar

- **OG görseli statik**: statik export nedeniyle günlük değişen önizleme yok; genel `og-image.png` kullanılır.
- **Günlük liderlik ayrı tablodan** (`daily_results`): kampanyanın dönem skor tabloları "tek skor artırma" modeline dayandığı için yeniden kullanılmadı; yalnızca `user_profiles` (isim/tag) paylaşılır.
- **Telemetri**: günlük oyun oturumları kampanya level analitiğine gönderilmez.

## Açık konular (kapsam dışı / karar bekleyen)

1. **İpucu global olarak kapalı** (04, CPU sınırı). Günlük entegrasyonu hazır; açılınca çalışır.
2. **Çift `adminAuth`**: `adminApiRouter.use('/admin/*', adminAuth)` tüm `/admin/*` isteklerine de uygulanıyor gibi görünüyor; `/admin/daily/*` rotalarındaki kendi `adminAuth`'u ile birlikte istek başına iki Firestore rol okuması olur. Mevcut `playedLevels` admin rotasında da aynı durum var. Güvenlik açığı değil, maliyet; ayrı bir iş olarak ele alınmalı.
3. **Gece yarısı sınırı**: UTC gece yarısından önce başlayıp sonra biten çözüm, bulmacanın tarihiyle gönderilir ve **arşiv** sayılır (seri/liderlik yok). İstenirse küçük bir tolerans penceresi eklenebilir.
4. **Havuz tekrarları**: havuzdan seçilen ya da birden çok tarihe atanan bulmaca daha önce yayınlandıysa arşivde oynanmış olabilir → o gün bazı oyuncular çözümü bilir. Havuz büyük tutulmalı; istenirse "yayınlanmış bulmaca tekrar atanamaz" kuralı eklenebilir.
5. **`timeSpent` istemci beyanı**: yalnızca eşit hamlede sıralamayı belirler; sunucu tarafı süre ölçümü (başlangıç jetonu) yok. Kampanya `/complete-level` ile aynı düzey.
6. **Hız sınırı**: `/daily/complete` için hız sınırı yok (kampanya `/complete-level` ile aynı). Worker genelinde bir karar olarak ele alınmalı.
7. **Admin/moderatör hilesi**: admin (moderatör artık değil) gelecek bulmacaları bilir; yönetici güveni varsayımı.
8. **Paylaşım alan adı tutarsızlığı**: paylaşım linki `layout.tsx` ile uyumlu `syncron.polyvoclub.com`; bazı plan/rapor dokümanlarında (ör. `03-android-admob.md`) `polimelo.com` geçiyor. Doğru alan adı teyit edilmeli (`features/daily/lib/dailyConfig.ts`).
9. **`epochDate`** (`2026-09-15`) lansman gününe göre ayarlanmalı; değişirse paylaşılan numaralar kayar.
10. **Ödüllü ipucu `via:'ad'`** sunucuda reklam sağlayıcısıyla doğrulanmıyor (04'ten devralınan genel durum).
11. **Android**: `npx cap sync android` çalıştırılmalı (yeni eklenti).

## Yayına alma

1. `wrangler d1 migrations apply` → `0013_daily_puzzles.sql`
2. Worker deploy
3. Web / Android (`npx cap sync android`) / portal build'leri
4. `epochDate` ayarı, takvimi ya da havuzu doldurma
