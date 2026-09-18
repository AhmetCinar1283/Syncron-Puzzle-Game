# 08 — Telemetri Onarımı (`level_telemetry` üretimde boş)

**Tarih:** 2026-09-18 · **Kapsam:** `POST /game/telemetry` → D1 veri yolu.
**Oyuncunun gördüğü davranış değişmedi.** Telemetrinin kapsamı genişletilmedi; yeni kişisel
veri alanı eklenmedi.

---

## 1. Teşhis — veri yolu uçtan uca izlendi

Sırayla her halka **kanıtla** denetlendi. Sonuçlar:

| # | Halka | Nasıl kanıtlandı | Sonuç |
|---|---|---|---|
| 1 | İstemci telemetriyi gönderiyor mu? | **Üretim bundle'ı indirildi ve okundu** (`https://syncron.polimelo.com/play` → `_next/static/chunks/*.js`). Telemetri çağrısı bundle'da mevcut ve doğru gövdeyi kuruyor. | ✅ Gönderiyor |
| 2 | Gönderim koşulu (`sessionRef`) sağlanıyor mu? | Bundle'da oturum `if (r.firestoreId)` ile kuruluyor; `/complete-level`'ı tetikleyen state (`I(r.firestoreId)`) **aynı koşula** bağlı. `played_levels`'ta 45 satır var (03 raporu) → bu koşul 45 kez sağlanmış. Kazanma akışında `n.success && (q("win"), ...)` → her başarılı tamamlama telemetri gönderiyor. | ✅ Tetikleniyor |
| 3 | İstek worker'a ulaşıyor mu? | Üretim worker'ına canlı istek: `POST /game/telemetry` → **401** (rota var), `/game/bogus-xyz` → **404** (kıyas). Preflight: `OPTIONS` + `Origin: https://syncron.polimelo.com` → **204**, `Access-Control-Allow-Origin` doğru. | ✅ Ulaşıyor |
| 4 | Route gövdeyi servise veriyor mu? | Firebase REST ile anonim ID token alındı, üretime gerçek istek atıldı. Bozuk gövde → **400 `Missing id`** (zod çalışıyor, auth geçildi). Geçerli gövde → **200 `{"success":true}`**. | ✅ Veriyor |
| 5 | Servis D1'e yazıyor mu? | **Aynı `id` ile ikinci istek → 500.** Yani birinci satır gerçekten kalıcı oldu (PRIMARY KEY çakışması). Tablo üretimde VAR, `hints_used` kolonu dahil şema doğru. | ✅ Yazıyor (bugün) |
| 6 | Kod yolu izole olarak doğru mu? | `vitest-pool-workers` ile gerçek D1 üzerinde uçtan uca test: satır yazılıyor. | ✅ Doğru |

### 1.1 Kök neden

Kod yolunda **bugün kopuk bir halka yok** — 4/5/6 numaralı adımlar bunu kanıtlıyor.
Buna rağmen 2026-09-17'de tablo boştu (`03-rapor.md` §3.1) ve o tarihte `played_levels`'ta
45 tamamlama vardı. **45 başarılı tamamlama = en az 45 telemetri isteği**, sonuç 0 satır.

Yani yazma bir dönem boyunca **sunucu tarafında başarısız oldu ve hiçbir yerde iz bırakmadı.**
Kök neden tam olarak budur: *veri yolunun sessiz olması*. Eski kodda hata yolu şuydu:

```
istemci catch → console.warn        worker catch → console.error → HTTP 500
```

İstemci 500'ü yutuyor (oyun akışı bozulmasın diye — bu doğru), worker ise yalnızca konsola
yazıyordu. Worker konsolu kalıcı değildir. Sonuç: yazma yolu aylarca kopuk kalabilir,
`audit_logs`'ta, `security_events`'te, hiçbir tabloda tek bir iz olmaz, kimse fark etmez.
Bu bulgu 03/04/05/06 raporlarında dört kez "kapsam dışı" olarak devredildi — çünkü
*fark edilebilir* bir sinyali yoktu.

Başarısızlığın **fiziksel sebebi** için en güçlü aday, o dönemde `level_telemetry`
tablosunun/kolonunun üretim D1'inde bulunmaması (migration uygulanmamış olması):

- Migration'lar bu projede **elle** uygulanıyor (bkz. `03-rapor.md` §4 madde 1).
- Yerel D1'de (`.wrangler/state`) `d1_migrations` **0005'te duruyor**; `level_telemetry`
  tablosu yerelde hiç yok — ortamların migration'larda geride kalması gözlenen bir durum.
- `/complete-level` (tablo: 0001/0005) çalışırken telemetri (tablo: 0010/0011) çalışmıyordu;
  ayrım tam da migration numarasında.

Bu adayı **kesinleştiremedim**: üretim D1'ine okuma erişimim yok
(`wrangler d1 execute --remote` → `code 7403, account not authorized`) ve SQLite tablo
oluşturma zamanı tutmaz. Doğrulama komutu §4'te; doğrulanamasa bile **onarım aynıdır**,
çünkü onarılan şey sebebin kendisi değil, sebebi görünmez kılan sessizliktir.

---

## 2. Ne değiştirildi

| Dosya | Değişiklik |
|---|---|
| `syncron-worker/src/services/levelTelemetry/lib/writeOutcome.ts` | **YENİ, saf.** D1 hata metnini `schema_missing` / `duplicate` / `unknown` olarak sınıflar; alarm üretilip üretilmeyeceğine karar verir. |
| `syncron-worker/src/services/levelTelemetry/recordTelemetry.ts` | **YENİ.** Yazar, **satır sayısını doğrular** (`changes === 1`), `duplicate` dışındaki her başarısızlığı `audit_logs`'a `telemetry.write_failed` olarak yazar. Denetim kaydı da yazılamazsa `console.error` ile ikinci savunma. |
| `syncron-worker/src/services/levelTelemetry/README.md` | **YENİ.** Modül sözleşmesi + "kopukluğu nasıl sorgularsın" SQL'i. |
| `syncron-worker/src/services/telemetry.ts` | `insertTelemetry` artık `{ changes }` döndürüyor — "hata fırlatmadı" ile "gerçekten yazıldı" ayrıldı. |
| `syncron-worker/src/routes/game.ts` | Route **inceldi**: iş mantığı servise taşındı, route yalnızca sonucu HTTP'ye çeviriyor. |
| `syncron-worker/src/services/auditLog.ts` | `AuditAction` birliğine `telemetry.write_failed` eklendi (katkısal). |
| `syncron-worker/migrations/0017_level_telemetry_repair.sql` | **YENİ, EKLEMELİ.** `level_telemetry` + `level_feedback` + indeksler `IF NOT EXISTS` ile. Tablolar varsa tamamen no-op; yoksa **nihai** şemayla (`hints_used` dahil) kurar. Hiçbir kolon silinmiyor/yeniden adlandırılmıyor. |
| `syncron-worker/test/levelTelemetry.spec.ts` | **YENİ, 12 test.** |
| `syncron-worker/README.md` | Klasör haritasına `services/levelTelemetry/` satırı. |

Yeni karar noktaları ve testleri:

- **`duplicate` başarısızlık sayılmaz** → HTTP 200, alarm yok. Oturum kimliği istemcide
  üretildiği için tekrar gönderim idempotenttir; satır zaten yazılıdır.
- **`changes !== 1` de başarısızlıktır** → sahte bir D1 ile test edildi.
- **Alarm `audit_logs`'a gider, telemetri tablosuna değil** — asıl senaryoda telemetri
  tablosu zaten yazılamaz durumdadır.

**Bugünkü bozuk hâli yakalayan test:**
`"tablo yokken 500 döner VE audit_logs'a görünür bir kayıt bırakır"` — tabloyu düşürür,
isteği atar, `audit_logs`'ta `failure: 'schema_missing'` kaydını arar. Eski kod bu testten
**geçemez** (hiçbir kayıt bırakmıyordu).

Ayrıca test şemayı **gerçek migration dosyalarından** (`0010` + `0011`'in ALTER'ı, `?raw`
import) kuruyor: kod, migration'ların yaratmadığı bir kolona yazmaya kalkarsa CI kırmızıya döner.

### Yapılmayanlar (bilinçli)

- **İstemci dokunulmadı.** `sendTelemetry` hatayı yutmaya devam ediyor — doğrusu budur,
  oyun akışı telemetriye bağlı olmamalı. Görünürlük sunucuda çözüldü. Bu yüzden yeni
  kullanıcı metni gerekmedi; i18n (`tr`/`en`) değişikliği yok.
- Telemetri kapsamı genişletilmedi, yeni alan eklenmedi.
- Kapsam dışı olarak bırakılanlar: `friends.ts` 890 satır, `AuthContext.tsx:209` OAuth
  fallback, `worker-configuration.d.ts` gömülü anahtar.

---

## 3. Doğrulama (`00-ilkeler.md` §2.1 — yedisi de çalıştırıldı)

| Kontrol | Komut | Sonuç |
|---|---|---|
| App tip denetimi | `npx tsc --noEmit` | ✅ hatasız |
| App testleri | `npx vitest run` | ✅ `Test Files 20 passed (20)` · `Tests 136 passed (136)` |
| Worker tip denetimi | `cd syncron-worker && npx tsc --noEmit` | ✅ hatasız |
| Worker testleri | `cd syncron-worker && npx vitest run` | ✅ `Test Files 19 passed (19)` · `Tests 263 passed (263)` |
| CrazyGames build | `npm run build:crazygames` | ✅ `crazygames: 96 dosya, 3.43MB → dist-portals\crazygames.zip` |
| GameDistribution build | `npm run build:gd` | ✅ `gamedistribution: 96 dosya, 3.43MB → dist-portals\gamedistribution.zip` |
| Android build | `npm run build:mobile` | ✅ `√ update android` · `[info] Sync finished in 0.533s` |

**Taban çizgisi korundu.** Worker **251 → 263** (+12, hepsi bu görevden).
App **127 → 136**; bu artış benim değil — çalışma ağacında eşzamanlı çalışan başka bir
ajanın (editör/i18n dosyaları) katkısı. App tarafına hiç dokunmadım.

Dokunulan dosyalar yalnızca §2'deki listedir; `git diff --stat` ile doğrulandı. Diğer
ajanların commit edilmemiş işi (`rateLimit/*`, `types.ts`, `wrangler.jsonc`, `rateLimiter.ts`,
app tarafı) **değiştirilmedi**. Commit atılmadı.

---

## 4. Proje sahibinin yapması gerekenler

1. **Migration'ları uygula (deploy'dan ÖNCE):**
   ```
   cd syncron-worker
   npx wrangler d1 migrations apply syncron-audit-logs --remote
   ```
   `0017_level_telemetry_repair.sql` dahil tüm bekleyenler uygulanır. Tablolar zaten
   varsa 0017 hiçbir şey yapmaz (no-op).

2. **Kök nedeni kesinleştir (30 saniye).** Hangi migration'ların gerçekten uygulandığını gör:
   ```
   npx wrangler d1 execute syncron-audit-logs --remote --command "SELECT name, applied_at FROM d1_migrations ORDER BY id"
   ```
   Listede `0010_level_telemetry.sql` / `0011_reward_grants.sql` **yoksa ya da tarihleri
   2026-09-17'den sonraysa** §1.1'deki hipotez doğrulanmış olur. (Benim hesabımın D1 okuma
   yetkisi yok: `code 7403`. Bu komut senin oturumunla çalışır.)

3. **Teşhis satırını sil.** Yolu kanıtlamak için üretime **bir** satır yazdım:
   ```
   npx wrangler d1 execute syncron-audit-logs --remote --command "DELETE FROM level_telemetry WHERE id = 'diag-probe-0918-1'"
   ```
   (`level_id = '__diag_probe__'`, `outcome = 'quit'`. Silinmezse bölüm analizinde sahte
   bir bölüm olarak görünür.) Ayrıca teşhis sırasında Firebase'de **bir anonim hesap**
   oluştu; 04:00 UTC temizlik cron'u 30 gün sonra kendiliğinden siler, elle işlem gerekmez.

4. **Deploy et:** `npx wrangler deploy`. (Üretimdeki istemci bundle'ı eski bir sürüm —
   telemetri gönderimi açısından doğru çalışıyor, bu görev için yeniden deploy şart değil.)

5. **Bir hafta sonra tek sorguyla doğrula.** Artık ölçüm yolunun sağlığı sorgulanabilir:
   ```sql
   SELECT COUNT(*) FROM level_telemetry;                                   -- > 0 olmalı
   SELECT created_at, uid, metadata FROM audit_logs
    WHERE action = 'telemetry.write_failed' ORDER BY created_at DESC LIMIT 20;  -- boş olmalı
   ```
   İkinci sorgu doluysa `metadata.failure` sebebi söyler (`schema_missing` → migration eksik).

---

## 5. Geçmiş veri kurtarılabilir mi?

**Hayır.** `level_telemetry` satırları yalnızca istemcinin o anki oturum sayaçlarından
(süre, restart, ölüm, hamle sayısı, ipucu) doğar; bu sayaçlar başka hiçbir yerde saklanmaz:

- `played_levels` yalnızca **son/en iyi** durumu tutar — deneme sayısı, ölüm, restart yok.
- `audit_logs`'taki `level.complete` kayıtlarında oturum metrikleri yok.
- R2 soğuk dışa aktarımı (`runDataExport`) **D1'i kopyalar**; kaynak boşsa kopya da boştur.
- İstemcideki `active_level_session` yalnızca *yarım kalan* tek bir oturumdur ve gönderildikten
  sonra silinir.

Yani bu görevden önceki bölüm zorluk/tamamlanma ölçümü **kalıcı olarak kayıptır**.
Onarımdan sonraki oyunlar ölçülür. Eşik/zorluk ayarı yapılacaksa yeniden veri birikmesi
beklenmelidir (03'teki `played_levels` + `audit_logs` tahmini, o zamana kadar geçerli
kalan tek kaynaktır).

---

## 6. LİDERE SORU

1. **Kök nedenin fiziksel doğrulaması bende tamamlanamadı.** §4 madde 2'deki `d1_migrations`
   sorgusu proje sahibinin oturumunu gerektiriyor. Sonuç `0010/0011` uygulanmamış çıkarsa
   teşhis kapanır; uygulanmış ve tarihi eski çıkarsa **başka bir sebep vardır** ve
   `telemetry.write_failed` kayıtları (artık üretilecekler) onu bir hafta içinde
   isimlendirecektir. Bu durumda yeni bir görev açılmalı mı, yoksa §4 madde 5'teki sorgu
   sonucunu beklemek yeterli mi?

2. **`telemetry.write_failed` için uyarı eşiği istiyor musun?** Şu an kayıt *üretiliyor* ama
   kimse *bakmıyorsa* yine sessizlik riski var (daha zayıf bir biçimde). Otomatik bir
   uyarı (ör. günlük cron ile son 24 saatte N'den fazla kayıt varsa e-posta/webhook)
   ayrı ve küçük bir iş olur — bu görevin kapsamına almadım, çünkü yeni bir dış entegrasyon
   kararı gerektiriyor.

3. **Üretim üzerinde teşhis isteği atmak** (bir anonim hesap + bir satır) bu görev için
   zorunluydu; kod yolunun sağlam olduğunu başka türlü kanıtlamak mümkün değildi. Bundan
   sonraki görevlerde bu tür üretim probları için önceden onay isteyen bir kural ister misin?
