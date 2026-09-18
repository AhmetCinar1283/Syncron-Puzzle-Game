# services/daily

Günlük Bulmaca'nın sunucu kuralları. Rotalar ince: `routes/daily.ts` (oyuncu),
`routes/adminDaily.ts` (admin). Veri D1'de (`migrations/0013_daily_puzzles.sql`).
Akış ve admin kılavuzu: `docs/daily-puzzle.md`.

| Dosya | Sorumluluk |
|---|---|
| `dailyDate.ts` | Saf UTC tarih yardımcıları, bulmaca numarası |
| `dailyPolicy.ts` | `DAILY_POLICY` sabitleri + saf kurallar: yıldız, seri, XP, takvim kilidi |
| `dailyPuzzles.ts` | `daily_puzzles` CRUD (içerik değişince `version++`) |
| `dailySchedule.ts` | Takvim; `resolvePuzzleForDate` (boş bugün → havuzdan kalıcı seçim) |
| `dailySettings.ts` | Boş gün politikası |
| `dailyResults.ts` | Resmî sonuç (`INSERT OR IGNORE`), liderlik, sıra |
| `dailyStreaks.ts` | Seri; `recordStreakDay` atomik + idempotent, `recorded` bayrağı XP'yi belirler |
| `puzzleValidation.ts` | Kayıtta çözümü oynatarak doğrula, par = uzunluk |
| `dailyLevelSource.ts` | `daily:<id>` level kimliği; ipucu için yalnızca yayınlanmış bulmacayı yükler |
| `completeDaily.ts` | `POST /daily/complete` kuralı |
| `dailyView.ts` | Oyuncuya dönen görünümler (çözüm asla dönmez) |
| `dailyXp.ts` | Firestore `users.xp` + D1 `user_profiles.xp` artışı |
| `adminDaily.ts` | Admin kuralları: kayıt kilitleri, atama, silme, takvim görünümü |

Değişmezler:

- Gelecek tarih oyuncuya çözümlenmez; onaysız bulmaca yayınlanmaz.
- Bir günün sonucu varsa ataması değişmez; yayınlanmış bulmacanın içeriği değişmez.
- Çözücü worker'da çalışmaz (CPU); yalnızca istemcinin gönderdiği çözüm oynatılır.

Testler: `test/daily.spec.ts`.
