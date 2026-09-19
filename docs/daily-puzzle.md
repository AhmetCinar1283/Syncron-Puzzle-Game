# Günlük Bulmaca

Her gün (UTC) herkese aynı bulmaca. Oyuncu en az hamleyle çözmeye çalışır; günün ilk
doğrulanmış tamamlaması resmî sonuçtur, seri (🔥) ve günlük liderliğe işlenir,
Wordle tarzı paylaşılır. Bulmacaları admin, **Günlük Bulmaca Takvimi**'nden planlar.

Plan ve kararlar: `.plans/monetization/06-gunluk-bulmaca.md`, `.plans/monetization/raporlar/06-rapor.md`.

---

## 1. Oyuncu akışı

```
Ana sayfa "Günün Bulmacası" kartı ──▶ /daily (hub)
  (capabilities.dailyPuzzle && worker URL tanımlı)
      │  GET /daily/today   → bulmaca (level + par) + varsa resmî sonucum/sıram
      │  GET /daily/streak  → seri
      │  GET /daily/archive → geçmiş bulmacalar
      ▼
/daily/play?date=YYYY-MM-DD ── oyna (ipucu ✓, level atlama ✗)
      │  POST /daily/complete { date, moves[], timeSpent, hintsUsed }
      ▼
Sonuç kartı: hamle / par, yıldız, seri, sıra, "Paylaş"
```

| Kural | Nerede |
|---|---|
| "Bugün" UTC'dir. Bulmaca numarası `#N` = `DAILY_POLICY.epochDate`'ten bu yana gün + 1. | `services/daily/dailyDate.ts` |
| Gelecek tarihin bulmacası oyuncuya asla dönmez; arşiv en fazla 365 gün geriye gider. | `dailyView.ts` |
| Çözüm (`solution`) oyuncu uç noktalarından asla dönmez. | `dailyView.ts` |
| Hamleler sunucuda oynatılarak doğrulanır (`verifyMoves`). | `completeDaily.ts` |
| **Resmî sonuç** = o günün tarihinde ilk doğrulanmış tamamlama (`daily_results` PK `(uid,date)`). Tekrar oynama doğrulanır, kayıt değişmez. | `dailyResults.ts` |
| **Arşiv** (geçmiş tarih) ücretsizdir; doğrulanır ama hiçbir şey yazılmaz (seri, liderlik, XP yok). | `completeDaily.ts` |
| **Yıldız:** `hamle ≤ par → 3★`, `≤ floor(par×1.2) → 2★`, aksi 1★; ipuçlu en fazla 2★. | `dailyPolicy.starsForMoves` |
| **Seri:** son resmî gün dün → +1, bugün → değişmez, aksi → 1. Dünden eski ise gösterilen seri 0. | `dailyPolicy.nextStreak`, `dailyStreaks.ts` |
| **Ödül:** yalnızca XP — resmî ilk tamamlama 50, ipuçlu 25. totalScore / completedCount / kampanya liderliği etkilenmez. | `dailyXp.ts` |
| **Günlük liderlik:** ipuçsuzlar önde → az hamle → az süre → erken tamamlama. İpuçlu satırlar işaretlidir. | `dailyResults.ts` |
| **İpucu:** mevcut ödüllü ipucu akışı `levelId = 'daily:<puzzleId>'` ile. Worker yalnızca yayınlanmış (onaylı + tarihi ≤ bugün) bulmacaya ipucu verir. İpucu şu an global olarak KAPALI (bkz. `docs/scoring.md` → Hints). | `hintAction.ts`, `dailyLevelSource.ts` |
| **Level atlama** günlükte gösterilmez; sunucu da reddeder (bölüm üyeliği yok). | — |

### Paylaşım

```
Syncron #142 ⭐⭐⭐ 14 hamle 🔥5
https://syncron.polimelo.com/daily/
```

- İpuçlu sonuçta metne "ipuçlu" eklenir. Link yalnızca `capabilities.externalLinks` true ise eklenir (portallar).
- Sıra: Capacitor yerel paylaşım menüsü (`@capacitor/share`, dinamik import) → `navigator.share` → pano.
- `/daily/` sayfası statik Open Graph / Twitter metadata taşır (statik export → günlük değişen görsel yok).

### Portallar

Giriş noktası `capabilities.dailyPuzzle` **ve** worker URL'si tanımlıysa görünür; `/daily` doğrudan açılırsa ve koşul sağlanmıyorsa ana sayfaya yönlenir. Portal bellek içi router tablosunda `/daily` ve `/daily/play` vardır.

---

## 2. Admin kullanımı

`/admin` → **Daily Puzzle** kartı → `/admin/daily-calendar`. Sayfa `AdminGuard` ile korunur.
**Moderatör** takvimi ve kütüphane listesini salt okunur görür; bulmaca içeriğini/çözümünü
göremez ve değiştiremez. **Admin** her şeyi yapar. Worker aynı kuralları uygular.

### 2.1 Bulmaca hazırlama — iki yol

**a) Editörde tasarla**

1. `/editor`'da level'ı tasarla (admin'e üst çubukta **Günlük Bulmaca** butonu görünür).
2. Butona bas → dialog açılır. Çözücü sonucu varsa hazır gelir; yoksa **Çözücüyü çalıştır**.
3. Çözücü bütçe içinde bulamazsa: **Test** modunda level'ı kendin çöz. Kazandığında hamlelerin
   kaydedilir; dialog "Test modundaki çözümün: N hamle" gösterir. Par bu sayı olur ve kütüphanede
   **Admin çözümü** ("en iyi olmayabilir") olarak işaretlenir.
4. Başlık, durum (taslak/onaylı), yedek havuz ve isteğe bağlı tarih seçip **Kaydet**.
   Çözümden sonra level değiştiyse kayıt engellenir ("yeniden çöz").

**b) Aday üretici** (takvim sayfası → *Aday üretici* sekmesi)

1. Zorluk, boyut, oyuncu sayısı, adet seç → **Üret** (tarayıcıda çalışır).
2. Her aday önizleme + par ile gelir. İstersen **Editörde düzenle** (adayı editöre taşır, a yolundan devam),
   ya da başlık/tarih/havuz seçip **Onayla ve kaydet**.

Her kayıtta worker çözümü hamle hamle oynatır; çözmüyorsa kayıt reddedilir. Par = doğrulanan çözümün uzunluğu.

### 2.2 Takvim

- Varsayılan görünüm bugünden 28 gün; `← 14` / `14 →` ile kaydır.
- Her gün için onaylı bulmacalardan birini seç ya da atamayı kaldır.
- **Onaylanmamış (taslak) bulmaca takvime atanamaz ve asla yayınlanmaz.**
- **Boşluk uyarısı:** önümüzdeki 14 günde atanmamış günler listelenir; boş gün politikasına göre
  "havuzdan doldurulacak" ya da "oyuncular bulmaca görmeyecek" yazar.

### 2.3 Boş gün politikası ve yedek havuz

| Politika | Davranış |
|---|---|
| `pool` (varsayılan) | Atanmamış **bugün** ilk istendiğinde, havuzdaki onaylı bulmacalardan en az kullanılanlar arasından tarih hash'iyle biri seçilir ve o güne **kalıcı** yazılır (`assigned_by='fallback'`, takvimde "Havuzdan"). Herkes aynısını görür. |
| `none` | Boş günde oyuncuya "bugün bulmaca yok" gösterilir. |

Geçmişte boş kalmış günler sonradan doldurulmaz. Havuzdan alınmış bir bulmaca daha önce
yayınlandıysa arşivde de oynanabilir durumdadır; havuzu yeterince büyük tut.

### 2.4 Kilitler (adalet)

| Durum | Sonuç |
|---|---|
| Geçmiş tarih | Ataması değiştirilemez (`date-in-past`). |
| Bugün, en az bir resmî sonuç var | Ataması değiştirilemez (`date-has-results`). |
| Bugüne/geçmişe atanmış (yayınlanmış) bulmaca | İçeriği/par'ı değiştirilemez, taslağa çekilemez (`puzzle-published`). |
| Herhangi bir tarihe atanmış bulmaca | Silinemez (`puzzle-scheduled`); önce atamayı kaldır. |

Yayınlanmamış bir bulmacanın içeriği değişince `version` artar. Tüm admin yazmaları
`audit_logs`'a (`admin.daily_*`) yazılır.

---

## 3. Worker uç noktaları

| Metot | Yol | Yetki | Açıklama |
|---|---|---|---|
| GET | `/daily/:date` (`today` veya `YYYY-MM-DD`) | isteğe bağlı | Bulmaca + resmî sonucum/sıram |
| GET | `/daily/streak` | oyuncu | Seri özeti |
| GET | `/daily/archive?days=` | isteğe bağlı | Geçmiş bulmacalar (+ resmî yıldızım) |
| GET | `/daily/leaderboard/:date?limit=` | isteğe bağlı | Günlük liderlik (≤100) + benim sıram |
| POST | `/daily/complete` | oyuncu, ban kontrolü | Doğrula; bugünse resmî kaydet (seri + XP) |
| GET | `/admin/daily/calendar?from=&days=` | admin/moderatör | Takvim + boşluklar |
| GET | `/admin/daily/puzzles` | admin/moderatör | Kütüphane (içeriksiz) |
| GET | `/admin/daily/puzzles/:id` | **admin** | Level + çözüm |
| POST | `/admin/daily/puzzles` | admin | Kaydet (çözüm oynatılır) |
| POST | `/admin/daily/puzzles/:id/flags` | admin | Onay / havuz |
| DELETE | `/admin/daily/puzzles/:id` | admin | Sil (atanmamışsa) |
| POST | `/admin/daily/schedule` | admin | Tarihe ata / kaldır |
| GET/POST | `/admin/daily/settings` | okuma: admin/moderatör, yazma: admin | Boş gün politikası |

D1 tabloları (`migrations/0013_daily_puzzles.sql`): `daily_puzzles`, `daily_schedule`,
`daily_settings`, `daily_results`, `daily_streaks`. Anonim kullanıcı temizliği
`daily_results` ve `daily_streaks` satırlarını da siler.

---

## 4. Yayına alma sırası

1. `cd syncron-worker && npx wrangler d1 migrations apply <AUDIT_DB> --remote` (0013).
2. Worker deploy.
3. İstemciler: web build; Android için `npx cap sync android` (yeni `@capacitor/share` eklentisi); portal build'leri.
4. Lansmandan önce `DAILY_POLICY.epochDate`'i (bulmaca #1 günü) gerçek başlangıç gününe ayarla.
5. İlk günlerin takvimini doldur ya da havuza en az birkaç onaylı bulmaca koy.
