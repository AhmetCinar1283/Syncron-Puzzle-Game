# Veri Kurtarma Runbook'u

> Kapsam: Cloudflare D1 (`syncron-audit-logs`) ve R2 (`syncron-audit-archive`).
> Firestore tarafı (`users`, `levels`) bu belgenin **dışındadır** — ayrı bir iş.
>
> Kaynak görev: `.plans/yayin-hazirlik/02-veri-dayanikliligi.md`

**Bu belgenin tek amacı:** panik anında hangi düğmeye basılacağını, daha önemlisi
**hangisine basılmayacağını** söylemek.

---

## 0. Önce şunu oku

Refleks "veritabanını geri yükleyelim" olur. Canlı bir oyunda bu **neredeyse her
zaman yanlış** araçtır: 6 saat geriye dönmek, o 6 saatte oynayan **herkesin**
ilerlemesini siler. Tek bir sorunu binlerce sorun üreterek çözersin.

Katmanlar, **kullanılma sıklığına göre** sıralanmıştır:

| Katman | Araç | Ne kadar sık |
|---|---|---|
| A — Önleme | Soft delete + onay kapısı + audit | Her zaman (otomatik) |
| B — Yeniden hesaplama | `POST /admin/recovery/recompute` | Ayda birkaç kez olabilir |
| C — İstemci uzlaştırma | *(uygulanmadı — bkz. §6)* | — |
| D — Soğuk dışa aktarım | `scripts/recovery/restore-export.mjs` | Yılda bir olsa çok |
| E — Time Travel | `wrangler d1 time-travel restore` | Neredeyse hiç |

---

## 1. Karar tablosu

| Belirti | Katman | Ne yapılır |
|---|---|---|
| Liderlik tablosu bir kullanıcı için yanlış (şişmiş/eksik) | B | `recompute` scope=`user` |
| Bir yapımcının "Usta Mimarlar" skoru yanlış | B | `recompute` scope=`creator` |
| Geçmiş bir haftanın/ayın rozetleri dağıtılmamış | B | `recompute` scope=`badges` |
| Admin yanlış bölümü sildi, ilerlemeler gitti | A | `POST /admin/levels/:id/restore` + B |
| Tek bir oyuncunun ilerlemesi kayıp, bölüm silinmemiş | D | §4 (dışa aktarımdan o satırları geri yükle) |
| Bir tablo tamamen boşalmış / kısmen bozulmuş | D | §4 |
| Migration/script tüm veritabanını bozdu, dakikalar içinde fark edildi | E | §5 |
| `daily_puzzles` içeriği silindi | D | §4 (`--table daily_puzzles`) |
| Ödeme/bağış kaydı tutarsız | D + elle | §4, **önce** Lemon Squeezy paneliyle karşılaştır |

---

## 2. Katman A — Önleme (otomatik, müdahale gerektirmez)

* `played_levels` ve `skipped_levels` **hard delete edilmez**. `DELETE /admin/levels/:id`
  satırları `deleted_at` ile işaretler; satırlar diskte durur, okuma sorguları görmez.
* Aynı uç nokta **iki adımlı onay** ister:

  ```bash
  # 1. adım — gövdesiz: hiçbir şey silinmez, etkilenecek satır sayısı döner (409)
  curl -X DELETE https://<worker>/admin/levels/LVL123 -H "Authorization: Bearer $TOKEN"
  # → {"success":false,"error":"confirmation-required","affectedRows":184}

  # 2. adım — sayıyı aynen geri gönder
  curl -X DELETE https://<worker>/admin/levels/LVL123 \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"confirm":184}'
  ```

  Sayı bu arada değiştiyse onay tutmaz ve işlem yeniden onaylanır.
* Her yıkıcı/onarıcı admin işlemi `audit_logs` tablosuna yazar:
  `admin.level_delete`, `admin.level_restore`, `admin.recovery_recompute`.

### Yanlışlıkla silinen bölümü geri alma

```bash
curl -X POST https://<worker>/admin/levels/LVL123/restore -H "Authorization: Bearer $TOKEN"
# → {"success":true,"restoredRows":184,"firestoreLevelRestored":false}
```

**Dikkat — iki eksik:**
1. Bu uç nokta **liderlik sayaçlarına dokunmaz**. Silme sırasında sayaçlar geri
   alınmıştı; geri yükleme sonrası etkilenen kullanıcılar için §3'teki yeniden
   hesaplamayı çalıştır.
2. Firestore'daki bölüm dokümanı silme sırasında yok edilmiştir. Bölümün kendisi
   elle yeniden yüklenmelidir; bu uç nokta yalnızca D1 ilerlemesini kurtarır.

---

## 3. Katman B — Yeniden hesaplama

`POST /admin/recovery/recompute` — yalnızca `role === 'admin'` (moderatör erişemez).

**Varsayılan kuru çalışmadır.** Gövde göndermesen bile hiçbir şey yazılmaz.

```bash
# 1) Kuru çalışma — ne değişecekti?
curl -X POST https://<worker>/admin/recovery/recompute \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"scope":"user","uid":"UID123"}'
# → {"success":true,"dryRun":true,"preview":{"affectedRows":3,"changes":[...],"untouched":[...]}}

# 2) Uygula — affectedRows sayısını confirm olarak geri gönder
curl -X POST https://<worker>/admin/recovery/recompute \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"scope":"user","uid":"UID123","dryRun":false,"confirm":3}'
```

Kapsamlar:

| `scope` | Ek alan | Ne yapar |
|---|---|---|
| `user` | `uid` (zorunlu) | `user_period_scores` satırlarını yeniden kurar |
| `creator` | `levelId` (isteğe bağlı) | `creator_scores` satırlarını yeniden kurar |
| `badges` | `period` (zorunlu) | O periyodun rozetlerini yeniden dağıtır |

### Okurken bilmen gereken üç şey

1. **`untouched` listesini oku.** `audit_logs` 90 günde bir arşivlenir. Kanıt
   ufkundan eski periyotlara **bilinçli olarak dokunulmaz** — aksi hâlde onarım
   aracı imha aracına dönerdi. O periyotlar elle düzeltilir ya da olduğu gibi bırakılır.
2. **`creator` kapsamı sayacın anlamını değiştirebilir.** Canlı yol her tamamlamayı
   sayar, yeniden hesaplama "farklı oyuncu" sayar. Bazı yapımcıların `plays_gained`
   değeri **düşebilir**. Önce kuru çalıştır, farkı gör, sonra karar ver.
3. **`badges` yalnızca EKLER.** Eksik rozet verilir; fazla verilmiş rozet
   **silinmez** (kazanılmış bir rozeti silmek geri alınamaz ve oyuncunun profilini
   değiştirir). Fazla rozet varsa elle karar ver.

---

## 4. Katman D — Soğuk dışa aktarım ve geri yükleme

### Dışa aktarım ne, ne zaman?

* Cron: **her cumartesi 02:00 UTC** (`"0 2 * * SAT"` → `scheduled/dataExport.ts`).
* Yalnızca **kaynak tablolar** (türetilmişler yeniden hesaplanır, kopyalanmaz).
* Hedef: `R2 syncron-audit-archive` → `exports/YYYY-MM-DD/<tablo>.ndjson`
  (büyük tablolar `<tablo>.part-0000.ndjson` biçiminde parçalanır).
* **D1'den hiçbir şey silinmez.** Bu bir kopyalamadır, taşıma değildir.
* Saklama: 12 hafta (görev "en az 8" istiyor; pay bırakıldı). Daha eski
  `exports/…` klasörleri budanır; tanınmayan önek asla silinmez.

### Ne var, kontrol et

```bash
cd syncron-worker
npx wrangler r2 object get syncron-audit-archive/exports/2026-09-19/played_levels.ndjson \
  --file ../tmp/played_levels.ndjson
```

### Geri yükleme

Tam kullanım: `scripts/recovery/README.md`. Özet:

```bash
node scripts/recovery/restore-export.mjs --file tmp/played_levels.ndjson --table played_levels
#   → KURU ÇALIŞMA. Üretilen SQL'i gözle oku.
node scripts/recovery/restore-export.mjs --file tmp/played_levels.ndjson --table played_levels --apply
#   → Sonra §3'teki yeniden hesaplamayı çalıştır.
```

Araç yalnızca `INSERT OR IGNORE` üretir: **eksik satırı geri getirir, var olanın
üstüne asla yazmaz.** Bozuk (yanlış değerli) bir satır bu araçla düzelmez; önce o
satır elle düzeltilmelidir.

---

## 5. Katman E — Time Travel (son çare)

Cloudflare D1, veritabanının son ~30 güne kadar herhangi bir anına dönmesine izin verir.

> **Planında gerçekten açık mı ve saklama süresi ne?** Cloudflare panelinden
> **doğrula**. Bu belge bunu varsayamaz.

```bash
cd syncron-worker
# 1) Hangi ana dönülebilir?
npx wrangler d1 time-travel info syncron-audit-logs

# 2) ÖNCE mevcut hâli dışarı al (dönüş yolu):
npx wrangler d1 export syncron-audit-logs --remote --output ../tmp/pre-restore.sql

# 3) Geri dön (YIKICI)
npx wrangler d1 time-travel restore syncron-audit-logs --timestamp 2026-09-19T02:00:00Z
```

### MALİYET — bu düğmeye basmadan önce oku

Geri dönüş **seçilen andan sonraki HER ŞEYİ siler**. Kaç oyuncuyu etkilediğini
**önceden ölç**:

```bash
npx wrangler d1 execute syncron-audit-logs --remote --command \
  "SELECT COUNT(DISTINCT uid) AS oyuncu, COUNT(*) AS satir
   FROM played_levels WHERE updated_at > '2026-09-19T02:00:00Z'"
```

Çıkan `oyuncu` sayısı, **ilerlemesini geri saracağın insan sayısıdır.** Bu sayı
1'den büyükse ve sorun tek bir kullanıcıyı ilgilendiriyorsa, Katman E **yanlış
araçtır** — §4'e dön.

Adım 2'deki dışa aktarım pazarlık konusu değildir: geri dönüş yanlış bir karar
çıkarsa geri dönüşün de bir dönüş yolu olmalıdır.

---

## 6. Katman C — İstemci uzlaştırma (UYGULANMADI)

Her oyuncunun cihazında `played_levels` kaydının Dexie kopyası durur
(`src/services/sync/playedLevels.ts`), ama senkronizasyon **tek yönlüdür** (D1 → Dexie).

Bu katman, tek bir kullanıcının kayıp ilerlemesini kimseyi geri sarmadan onarabilirdi.
Uygulanmadı, çünkü ön koşulu karşılanmıyor: `StoredPlayedLevel.moves` alanı şemada
**tanımlı ama hiçbir zaman yazılmıyor** (bkz. `src/features/play/hooks/useLevelCompletion.ts`).
Hamle dizisi olmadan istemcinin iddiası sunucuda `verifyMoves` ile doğrulanamaz;
doğrulanamayan bir iddiayı kabul etmek, "3 yıldızım vardı" diyen herkese 3 yıldız
vermek demektir.

Karar proje sahibindedir: ya Dexie şemasına son çözümün hamle dizisi eklenir
(yeni sürüm + migration), ya da bu katman kalıcı olarak kapsam dışıdır.
Bkz. `.plans/yayin-hazirlik/raporlar/02-rapor.md` → "LİDERE SORU".

---

## 7. Tatbikat — denenmemiş kurtarma yolu, kurtarma yolu değildir

Aşağıdakiler **gerçek bir olay olmadan, en az bir kez** denenmelidir. Her biri
denendiğinde tarihi bu tabloya yazılır.

| # | Tatbikat | Nasıl | Son deneme |
|---|---|---|---|
| 1 | Bölüm silme + geri alma | Test bölümünü sil (onay akışıyla), `/restore` ile geri al, `recompute` çalıştır | *(hiç)* |
| 2 | Yeniden hesaplama | Test hesabının `user_period_scores` satırını elle boz, kuru çalıştır, uygula | *(hiç)* |
| 3 | Dışa aktarımdan geri yükleme | R2'den bir NDJSON indir, `--local` ile geri yükle | *(hiç)* |
| 4 | Time Travel `info` | Yalnızca `info` — restore DEĞİL. Saklama süresini doğrula | *(hiç)* |

---

## 8. Hızlı referans

| Ne | Nerede |
|---|---|
| Dışa aktarım cron'u | `syncron-worker/src/scheduled/dataExport.ts` · `"0 2 * * SAT"` |
| Yeniden hesaplama servisleri | `syncron-worker/src/services/recovery/` |
| Soft delete kaskadı | `syncron-worker/src/services/levelLifecycle.ts` |
| Şema | `syncron-worker/migrations/0014_soft_delete.sql` |
| Geri yükleme scripti | `scripts/recovery/restore-export.mjs` |
| Anahtar/sır yönetimi | `docs/release/anahtar-yonetimi.md` |
