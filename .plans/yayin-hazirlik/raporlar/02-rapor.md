# 02 — Veri Dayanıklılığı: Koruma ve Onarım — Rapor

Tarih: 2026-09-17 · Dal: `refactor/architecture`

> **Özet:** Katman A (önleme), B (yeniden hesaplama), D (soğuk dışa aktarım + geri yükleme)
> ve E (runbook) uygulandı. **Katman C (istemci uzlaştırma) UYGULANMADI** — görev dosyası
> §3.4'ün ön koşulu kodda sağlanmıyor, karar proje sahibinin (bkz. §7 LİDERE SORU).
> Yedi doğrulama komutunun hepsi yeşil; worker test sayısı 135 → **165**.
> Değişiklikler **commit edilmedi**.

---

## 1. Ne yapıldı

### 1.1 Katman A — Önleme (§3.1)

| Dosya | Ne |
|---|---|
| `syncron-worker/migrations/0014_soft_delete.sql` | **YENİ.** `played_levels`, `skipped_levels`, `daily_results`, `donor_profiles` tablolarına `deleted_at TEXT` ekler + 3 kısmî indeks. Tamamen eklemeli: kolon silinmez, yeniden adlandırılmaz, satır dokunulmaz. |
| `src/services/levelLifecycle.ts` | **YENİ.** Bölüm silme/geri getirme kaskadı buraya taşındı (`playedLevels.ts` 346 satıra çıkmıştı). `deleteLevelRecords` artık `DELETE` değil `UPDATE … SET deleted_at`. `restoreLevelRecords` ve `countLevelDeletionRows` eklendi. Route'taki inline geri alma SQL'i `buildLeaderboardRollbackStatements` olarak servise alındı. |
| `src/services/playedLevels.ts` | Tüm okumalara `deleted_at IS NULL`. `upsertPlayedLevel` **diriltme** kuralı aldı: silinmiş satırın üstüne oynanırsa eski yıldız MAX() ile geri gelmez (geri alınmış puan sızmaz) ve `wasFirstCompletion: true` döner. |
| `src/services/skipLevel/skippedLevels.ts` | Aynı desen: okumalarda filtre, `deleteSkippedLevelsStatement` mantıksal silme üretir. |
| `src/routes/adminApi.ts`, `src/routes/donorApi.ts`, `src/services/telemetry.ts` | İlgili okuma sorgularına `deleted_at IS NULL`. |
| `src/services/recovery/confirmDestructive.ts` | **YENİ, saf.** İki adımlı onay kapısı: onay bir bayrak değil **sayıdır**; ilk adımda dönen satır sayısı aynen geri gönderilmek zorundadır. Sayı değiştiyse onay tutmaz. |
| `src/routes/playedLevels.ts` | `DELETE /admin/levels/:id` artık onay kapısına tabi (gövdesiz çağrı 409 + `affectedRows`). Audit metadata'sına `affectedRows` + `softDelete` eklendi. **YENİ:** `POST /admin/levels/:id/restore`. |
| `src/services/auditLog.ts` | `AuditAction` birliğine `admin.level_delete`, `admin.level_restore`, `admin.recovery_recompute` eklendi (öncekiler serbest string olarak yazılıyordu). |

### 1.2 Katman B — Yeniden hesaplama (§3.2)

`syncron-worker/src/services/recovery/` — **yeni modül** (kendi `README.md`'si var):

| Dosya | Ne |
|---|---|
| `lib/periods.ts` | Saf. Periyot başlangıç anları (ISO hafta matematiği dahil) + kanıt penceresi kuralı. Periyot **kimlikleri** kopyalanmadı, `services/leaderboard.getCurrentPeriodIds` yeniden kullanıldı. |
| `recomputeUserScores.ts` | `all_time` ← `played_levels` (birebir kesin), `daily/weekly/monthly` ← `audit_logs`. Mutlak değer yazar → idempotent. |
| `recomputeCreatorScores.ts` | `creator_scores` ← `played_levels` + enjekte edilen `LevelCreatorLookup`. Firestore'u **bilmez** (arayüze bağlı; test düz nesne verir). |
| `recomputeBadges.ts` | `scheduled/badgeDistribution.ts`'i **yeniden kullanır**, kopyalamaz. Yalnızca EKLER, hiçbir rozeti silmez. |
| `levelCreatorLookup.ts` | Sözleşmenin Firestore uyarlaması (kompozisyon kökü route'tadır). |
| `index.ts`, `README.md` | Modülün tek public API'si + belgesi. |

**Kritik tasarım kararı — kanıt penceresi.** `audit_logs` 90 günde bir arşivlenip D1'den
siliniyor (`logRetention.ts`). Kanıtı kalmamış eski bir periyodu "yeniden hesaplamak"
sonucu SIFIR yapar; yani onarım aracı sessizce **imha aracına** dönerdi. Bu yüzden
yalnızca başlangıcı `MIN(audit_logs.created_at)` (global kanıt ufku) anından sonra olan
periyotlara yazılır; daha eskiler `untouched: 'out-of-coverage'` olarak raporlanır.
Testle korunuyor.

Uç nokta: `src/routes/adminRecovery.ts` (ince) + `src/schemas/recovery.ts` (Zod).
`POST /admin/recovery/recompute`, `adminAuth` + `role === 'admin'` (moderatör 403),
**varsayılan `dryRun: true`**, yazan çalıştırma `confirm` sayısı ister ve audit yazar.

### 1.3 Katman D — Soğuk dışa aktarım (§3.3)

| Dosya | Ne |
|---|---|
| `src/services/recovery/exportTables.ts` | **YENİ, saf.** 15 kaynak tablonun açık allowlist'i (tablo adı SQL'e bağlanamadığı için tek savunma), R2 anahtar kurgusu, NDJSON, budama eşiği. Türetilmiş tablolar bilinçli olarak **dışarıda**. |
| `src/scheduled/dataExport.ts` | **YENİ.** Haftalık cron. `rowid` keyset sayfalaması (tablo-agnostik, OFFSET'in satır atlama sorunu yok). `logRetention.ts`'in batch + hata deseni; **hiç DELETE yok**. Bir tablo patlarsa diğerleri devam eder, özet `ok: false` döner. |
| `src/index.ts`, `wrangler.jsonc` | `"0 2 * * SAT"` cron'u + `scheduled` dallanması. |
| `scripts/recovery/restore-export.mjs` + `README.md` | **YENİ.** Elle çalıştırılan geri yükleme aracı. Varsayılan kuru çalışma; `--apply` gerekir. **Yalnızca `INSERT OR IGNORE`** üretir — var olan satırın üstüne asla yazmaz (eski yedekten geri yükleme kimsenin ilerlemesini geri saramaz). Tablo allowlist'i + tek noktadan SQL kaçışlaması. Kuru çalışma + allowlist reddi fiilen denendi. |

R2 anahtarı: tek parçada görev dosyasındaki düzen birebir (`exports/YYYY-MM-DD/<tablo>.ndjson`);
2000 satırı aşan tablolar `<tablo>.part-0000.ndjson` biçiminde parçalanır.
Saklama: **12 hafta** ("en az 8" şartının üstünde pay). Tanınmayan önek asla silinmez.

### 1.4 Katman E — Runbook (§3.5)

`docs/release/veri-kurtarma.md` (yeni, ~200 satır): karar tablosu, katman katman komutlar,
**Time Travel maliyetini önceden ölçen SQL** ("bu düğme şu kadar oyuncunun ilerlemesini
siler"), geri yükleme scripti kullanımı ve **tatbikat tablosu** (4 tatbikat, hiçbiri henüz
yapılmadı — §6'da sende).

### 1.5 Testler (§2.2)

`test/recovery.spec.ts` (21) + `test/dataExport.spec.ts` (9) + `test/recoverySchema.ts` (paylaşılan şema).
Kapsanan karar noktaları: onay kapısı (5 durum), periyot çözümleme + bozuk girdi,
soft delete/diriltme/geri getirme (3), yeniden hesaplama (bozuk→tutarlı, kuru çalışma
yazmıyor, idempotent, kapsam dışı periyoda dokunmuyor, silinmiş bölüm sayılmıyor,
self-play hariç, çözülemeyen sahiplik), dışa aktarım (D1 dokunulmadı, türetilmiş tablo
dışarıda, silinmiş satır yedeğe giriyor, allowlist, budama seçiciliği).

---

## 2. Ne yapılmadı ve neden

### 2.1 Katman C — istemci uzlaştırma → **LİDERE SORU** (§7)

Görev dosyası §3.4 zaten bunu şarta bağlıyordu ve şart sağlanmıyor. Ayrıntı §7'de.

### 2.2 Hard delete'i bırakılan yerler (bilinçli)

`Kaynak tablolarda hard delete kalmadı` kriteri **kısmen** karşılandı. Kalanlar ve gerekçeleri:

| Yer | Neden bırakıldı |
|---|---|
| `scheduled/anonymousCleanup.ts` | Bu bir **gizlilik silmesi**. Soft delete'e çevirmek kişisel veriyi süresiz saklamak demektir → 00-ilkeler §2.4 (veri minimizasyonu) ile doğrudan çelişir. |
| `scheduled/logRetention.ts` (`audit_logs`) | Silmeden önce R2'ye arşivliyor; kayıp yok. |
| `routes/friends.ts` (`friendships`) | Kullanıcının kendi isteğiyle yaptığı işlem (arkadaşlıktan çıkarma/reddetme). §3.1'in öncelik listesinde değil. Soft delete'e çevirmek "engelledim ama kayıt duruyor" beklentisini bozar → oyuncunun gördüğü davranış kararı. |
| `services/daily/dailyPuzzles.ts`, `dailySchedule.ts` | Admin içerik silme; zaten **hiç atanmamış** bulmacayla sınırlı ve audit'li. §3.1'in öncelik listesinde değil. Kapsam dışı, not edildi. |

### 2.3 `daily_results` / `donor_profiles` — kolon var, yazıcı yok

Öncelik listesinde oldukları için `deleted_at` kolonu eklendi (canlı sistemde şema
değiştirmek yerine şimdi ucuza). Bugün bu tablolara `deleted_at` yazan **hiçbir kod yolu
yok**. `donor_profiles` okumalarına yine de filtre eklendi (para tablosunda "silinmiş ama
görünen" kaydı hiç doğurmamak için). `daily_results` okumalarına (7 yer) filtre
**eklenmedi** — yazıcısı olmayan bir filtre saf gürültü olurdu. Kural migration dosyasına
büyük harfle yazıldı: o tabloya ilk `deleted_at` yazan değişiklik, aynı commit'te
okuma filtrelerini de eklemek zorundadır.

### 2.4 Kapsam dışı (görev §4)

Firestore yedeklemesi, `level_telemetry`/`level_feedback` koruması, hız limitleri (03),
IP/UA loglaması (05) — hiçbirine dokunulmadı.

### 2.5 Sapmalar (görev dosyasından)

1. **R2 anahtarı parçalanabilir.** Görev `exports/YYYY-MM-DD/<tablo>.ndjson` diyor; tek
   parçada birebir bu, 2000 satırı aşan tabloda `<tablo>.part-NNNN.ndjson`. Tek nesneye
   sığmayan tablo için alternatif yoktu. Runbook ve `--dir` bayrağı bunu karşılıyor.
2. **`recomputeCreatorScores` sayım semantiği.** Canlı yol (`upsertCreatorScores`) her
   tamamlamayı sayar; bölüm silme geri alması (mevcut kod) **farklı oyuncu** sayısını
   düşer. Yani sayaç zaten kendi içinde tutarsız. Yeniden hesaplama "farklı oyuncu"
   semantiğini temel alıyor (geri alma mantığının varsaydığı anlam) → onarım sonrası
   sistem tutarlı hâle geliyor, ama bazı yapımcıların `plays_gained` değeri **düşebilir**.
   Bu yüzden uç nokta varsayılan kuru çalışıyor. Mevcut tutarsızlık kapsam dışı, not edildi.
3. **Test aracı kısıtı.** Gerçek R2 üzerinde nesne silmek, `vitest-pool-workers`'ın izole
   depolama çerçevesini Windows'ta bozuyor (`Isolated storage failed / EBUSY`). Budama
   testi bu yüzden bellek içi bir R2 taklidiyle yazıldı; diğer dışa aktarım testleri
   gerçek binding'i kullanıyor. `isolatedStorage: false` denendi (165/165 geçti) ama
   **geri alındı**: tekrar çalıştırmada testler arası kirlenme yüzünden
   `leaderboard.spec.ts` düştü. İzolasyon açık bırakıldı; `vitest.config.mts`'e yalnızca
   `DOSYA AMACI` yorumu eklendi.
4. **Var olan bir test dosyasının import'u değişti.** `test/skipLevel.spec.ts`
   `deleteLevelRecords`'u artık `services/levelLifecycle`'dan alıyor (fonksiyon taşındı).
   Üç test dosyasının (`skipLevel`, `daily`, `donorApi`) yerel şema tanımlarına
   `deleted_at` kolonu eklendi. Test mantığı değişmedi.

---

## 3. Doğrulama (§2.1 tablosu — gerçek çıktılar)

| Kontrol | Komut | Sonuç |
|---|---|---|
| App tip denetimi | `npx tsc --noEmit` | ✅ exit 0, hatasız |
| App testleri | `npm test` | ✅ **86/86** (değişmedi) |
| Worker tip denetimi | `cd syncron-worker && npx tsc --noEmit` | ✅ exit 0, hatasız |
| Worker testleri | `cd syncron-worker && ./node_modules/.bin/vitest run --root .` | ✅ **165/165** (14 dosya) — taban 135, **+30** |
| CrazyGames build | `npm run build:crazygames` | ✅ 95 dosya, 3.37 MB → `dist-portals\crazygames.zip` |
| GameDistribution build | `npm run build:gd` | ✅ 95 dosya, 3.37 MB → `dist-portals\gamedistribution.zip` |
| Android build | `npm run build:mobile` | ✅ `cap sync` 1.271 s, 4 plugin |

> Worker testleri **iki kez ardışık** çalıştırıldı, ikisinde de 165/165 — kararlı.
> (01 raporundaki not geçerli: kök dizinden `npx vitest run` app testlerine düşer.)

### Kabul kriterleri (görev §5)

| Kriter | Durum |
|---|---|
| Kaynak tablolarda hard delete kalmadı, soft delete/tombstone uygulandı | ⚠️ **Kısmen** — `played_levels` + `skipped_levels` tam; kalan 4 yer gerekçeli bırakıldı (§2.2) |
| `recomputeUserScores` / `recomputeCreatorScores` / `recomputeBadges` yazıldı, idempotent, testli | ✅ bozuk→tutarlı geçiş ve "ikinci çalıştırma 0 satır" testleri var |
| `POST /admin/recovery/recompute` yalnızca `role === 'admin'`, audit yazar | ✅ |
| `dataExport.ts` haftalık cron, D1'den hiçbir şey silmiyor, R2'ye yazıyor | ✅ "D1 dokunulmadı" ayrı bir test |
| `scripts/recovery/` aracı yazıldı, varsayılanı `--dry-run` | ✅ fiilen çalıştırılıp doğrulandı |
| Katman C uygulandı ya da karar rapora yazıldı | ✅ §7 — **uygulanmadı, soru sende** |
| Katman C uygulandıysa uydurma iddia testi | — (uygulanmadı) |
| `docs/release/veri-kurtarma.md` + karar tablosu | ✅ |
| §2.1'deki yedi kontrol yeşil | ✅ yukarıdaki tablo |
| Bu rapor | ✅ |

### Dokunulan dosyalar

Yeni: `migrations/0014_soft_delete.sql`, `src/services/levelLifecycle.ts`,
`src/services/recovery/**` (8 dosya + README), `src/scheduled/dataExport.ts`,
`src/routes/adminRecovery.ts`, `src/schemas/recovery.ts`, `test/recovery.spec.ts`,
`test/dataExport.spec.ts`, `test/recoverySchema.ts`, `scripts/recovery/**` (2),
`docs/release/veri-kurtarma.md`.
Değişen: `src/index.ts`, `wrangler.jsonc`, `README.md`, `src/routes/playedLevels.ts`,
`src/routes/adminApi.ts`, `src/routes/donorApi.ts`, `src/services/playedLevels.ts`,
`src/services/skipLevel/skippedLevels.ts`, `src/services/telemetry.ts`,
`src/services/auditLog.ts`, `vitest.config.mts`, 3 test dosyası.
**Uygulama (`src/`) tarafına hiç dokunulmadı** — Katman C uygulanmadığı için.

---

## 4. Elle kontrol listesi (senin yapman gerekenler)

1. **Migration'ı uygula** — kod `deleted_at` kolonunu kullanıyor; migration'sız
   `DELETE /admin/levels/:id` "no such column" ile patlar (batch geri alınır, veri
   kaybolmaz ama işlem başarısız olur):
   ```bash
   cd syncron-worker
   npx wrangler d1 execute syncron-audit-logs --remote --file migrations/0014_soft_delete.sql
   ```
2. **Cloudflare paneli → D1 → Time Travel**: planında gerçekten açık mı, saklama süresi ne?
   Runbook bunu varsaymıyor, senden doğrulama bekliyor.
3. **İlk cumartesi 02:00 UTC'den sonra R2'yi kontrol et**: `exports/YYYY-MM-DD/` klasörü
   oluştu mu, `played_levels.ndjson` dolu mu?
   ```bash
   npx wrangler r2 object get syncron-audit-archive/exports/<tarih>/played_levels.ndjson --file /tmp/x.ndjson
   ```
   (Beklemek istemezsen `wrangler dev` + `curl "http://localhost:8787/__scheduled?cron=0+2+*+*+SAT"` ile tetiklenebilir.)
4. **Yeniden hesaplamayı test hesabında dene** — önce kuru çalıştır, `changes` ve
   `untouched` listelerini oku, sonra uygula. Liderlik tablosunun bozulmadığını gör.
5. **Tatbikatları yap** — `docs/release/veri-kurtarma.md` §7'deki 4 satırlık tablo.
   Hiçbiri henüz yapılmadı. Denenmemiş kurtarma yolu, kurtarma yolu değildir.
6. **Değişiklikler commit edilmedi.** 01 raporundaki 97 stage'li dosya hâlâ commit
   bekliyor; bu görevin dosyaları onların üstüne geldi. `git status` ile gözden geçir.

---

## 5. Sonraki göreve not

**03 (hız limiti ve kötüye kullanım) için:**

- `POST /admin/recovery/recompute` ve `POST /admin/levels/:id/restore` **yeni admin
  uç noktalarıdır**; limit kademelerini kurarken listene ekle. İkisi de `adminAuth`
  arkasında ve `role === 'admin'` şartlı.
- `services/recovery/confirmDestructive.ts` **kullanıma hazır ve saftır**. Yeni bir
  yıkıcı uç nokta yazarsan onay mantığını yeniden icat etme, bunu çağır.
- Görev dosyası §3.4 "bu uç nokta en sıkı limit kademesine tabidir" diyordu; o uç nokta
  (Katman C) **yazılmadı**. Proje sahibi "evet, yaz" derse limit ihtiyacı geri gelir.
- `audit_logs` artık üç yeni `admin.*` aksiyonu taşıyor (`level_delete`, `level_restore`,
  `recovery_recompute`) — kötüye kullanım sinyallerinde kullanılabilir.

**05 (loglama ve adli iz) için:**

- `AuditAction` birliği artık admin veri işlemlerini de kapsıyor; gürültü temizliğinde
  bunları **silme**, adli izin ta kendisi.
- `dataExport.ts` `audit_logs`'u da kopyalıyor → 90 gün üstü geçmiş R2'de iki yerde
  duruyor (`audit-logs/` arşivi + `exports/` yedeği). Çakışma yok, bilinçli.

**Genel:** `syncron-worker/src/services/playedLevels.ts` artık yalnızca okuma/upsert
yapıyor; bölüm yaşam döngüsü `levelLifecycle.ts`'te. `deleteLevelRecords` import eden
yeni kod ikincisinden almalı.

---

## 6. Ölçülen gerçekler (varsayım değil)

Görev dosyasındaki tespitlerin kodda doğrulanan hâli:

| Görev dosyası diyor ki | Kodda durum |
|---|---|
| "D1'de 21 tablo var" | ✅ 13 migration, 21 tablo. Dışa aktarıma 15 kaynak tablo girdi. |
| "`deleted_levels` tombstone deseni zaten var" | ✅ `0005_played_levels.sql`; desen korunarak yeniden kullanıldı. |
| "`user_period_scores` kaynağı `played_levels` + `audit_logs`" | ✅ Doğru — ama `all_time` yalnızca `played_levels`'tan **kesin** çıkıyor; periyodikler audit penceresiyle sınırlı (§1.2). |
| "`syncPlayedLevels` tek yönlü (D1 → Dexie)" | ✅ Doğrulandı. |
| "`StoredPlayedLevel` hamle dizisini tutmuyor" | ⚠️ **Yarı doğru** — `moves?: string[]` alanı şemada **tanımlı**, ama hiçbir yerde **yazılmıyor** (§7). |

---

## 7. LİDERE SORU — Katman C (istemci uzlaştırma)

**Durum.** Görev dosyası §3.4 şunu şart koşuyordu: "Dexie'deki `StoredPlayedLevel` şu an
`moveCount` tutuyor ama hamle dizisini tutmuyor… Önce bunu kodda doğrula. Saklanmıyorsa
proje sahibine sor."

**Kodda doğruladım:**

- `src/services/db/schema.ts` → `StoredPlayedLevel` içinde `moves?: string[]` alanı
  **tanımlı** (isteğe bağlı).
- Ama bu alana **hiçbir yerde değer yazılmıyor**. Tek yazıcı
  `src/features/play/hooks/useLevelCompletion.ts`; iki `putPlayedLevel` çağrısının
  ikisinde de yalnızca `moveCount` var, `moves` yok. D1 → Dexie senkronizasyonu da
  (`src/services/sync/playedLevels.ts`) hamle dizisi taşımıyor — worker `GET /played-levels`
  yanıtında hamle yok.
- Sonuç: **pratikte hamle dizisi cihazda saklanmıyor.** `verifyMoves` ile doğrulanamayan
  bir iddiayı kabul etmek, "3 yıldızım vardı" diyen herkese 3 yıldız vermektir.
  §3.4'ün 3. bağlayıcı kuralı ("yıldız/skor hamle dizisinden yeniden doğrulanır")
  bugünkü kodla **sağlanamaz**.

Bu yüzden Katman C'yi **uygulamadım** ve buna bağlı olmayan her şeyi bitirdim.

**Soru (iki seçenek):**

- **(A)** Dexie şemasına son çözümün hamle dizisi eklensin mi? Bu şunları gerektirir:
  yeni Dexie sürümü (v12) + `useLevelCompletion` içinde `moves` yazımı + yükleme yönü
  uç noktası + 03'ün en sıkı hız limiti. Bedeli: cihazda bölüm başına ~birkaç yüz baytlık
  ek saklama ve **sunucuya gönderilen yeni bir veri alanı** (aydınlatma metni gözden
  geçirilmeli mi? — hamle dizisi kişisel veri sayılmıyor ama oyuncu davranışıdır).
  Ayrıca bu alan **ancak bundan sonra oynanan bölümler için** dolar; bugünkü oyuncuların
  geçmiş ilerlemesi yine kurtarılamaz.
- **(B)** Katman C kalıcı olarak kapsam dışı kalsın mı? Bu durumda tek kullanıcının kayıp
  ilerlemesi Katman D (soğuk dışa aktarımdan geri yükleme) ile onarılır — çalışır, ama
  en fazla bir haftalık veri kaybı riski taşır ve elle müdahale gerektirir.

Kararı ben veremem (00-ilkeler §5: şema değişikliği + oyuncunun gördüğü davranış +
veri kapsamı). Runbook'a şimdilik "uygulanmadı, gerekçesi şu" diye yazdım
(`docs/release/veri-kurtarma.md` §6); cevap geldiğinde orası ve bu rapor güncellenir.
