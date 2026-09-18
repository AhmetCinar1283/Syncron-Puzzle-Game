# 03 — Hız Limiti ve Kötüye Kullanım Direnci — Rapor

Tarih: 2026-09-17 · Dal: `refactor/architecture`

> **Özet:** Worker'daki iki ayrı hız limiti implementasyonu tek bir modül-agnostik
> katmanda birleşti (`services/rateLimit`). 15 uç nokta kademelere bağlandı; eşikler
> üretim verisiyle **ölçülerek** doğrulandı. Aşım 429 + `Retry-After` döner, iç eşik
> sızdırmaz, `audit_logs`'a `category: 'security'` izi bırakır. İstemci 429'da
> kilitlenmiyor, tr+en metinleri eklendi. Yedi doğrulama komutunun **hepsi yeşil**;
> worker test sayısı 165 → **198**, app 86/86 sabit.
> **§3.1'deki mekanizma kararı ajanın yetkisinde değil** — §6'da "LİDERE SORU".
> Değişiklikler **commit edilmedi**.

---

## 1. Ne yapıldı

### 1.1 Paylaşılan hız limiti katmanı (§3.2) — yeni modül

`syncron-worker/src/services/rateLimit/` (kendi `README.md`'si var):

| Dosya | Ne |
|---|---|
| `lib/window.ts` | **YENİ, saf.** Tek pencere adımının matematiği. `Date.now()`, D1, Hono bilmez. Reddedilen istek sayacı artırmaz (ceza yok). Bozuk kademe tanımında **fail-open**. |
| `lib/policy.ts` | **YENİ, VERİ.** Kademe tablosu + uç nokta → `{tier, cost}` eşlemesi. Kod içinde hiçbir `if <uç nokta>` yok; eşiklerin ölçüm gerekçesi doc-comment'te. |
| `store.ts` | **YENİ.** `RateLimitStore` arayüzü = **mekanizma sınırı**. Bugünkü uygulama bellek içi; Cloudflare binding'i yarın ikinci bir uygulama olur, **çağrı yerleri değişmez**. |
| `rateLimitService.ts` | **YENİ, saf.** `evaluateRateLimit(store, {endpoint, identity, now, cost})`. Bu dosyada hiçbir uç nokta adı geçmez. |
| `index.ts` + `README.md` | Tek public API + belge. |

`src/middleware/rateLimiter.ts` **yeniden yazıldı**: artık `rateLimit('<uç-nokta-kimliği>')`
fabrikası. İçinde yalnızca kimlik çözümü, 429 yanıtı ve güvenlik izi var (~60 satır).
Eski `checkInternalLogRateLimit` kaldırıldı.

`src/routes/tickets.ts` içindeki **bağımsız implementasyon silindi** (`ticketRateLimits`
Map + `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX_TICKETS`). Eşik (2/dk) ve 429 gövdesi
(`RATE_LIMIT_EXCEEDED`) **birebir korundu**; tek fark limitin artık Zod doğrulamasından
*önce* uygulanması (daha ucuz).

**Yeni uç nokta korumak artık konfigürasyon işi:** `policy.ts` tablosuna bir satır +
route'a bir middleware satırı. Kod kopyalanmıyor.

### 1.2 Kademeler ve bağlanan uç noktalar (§3.3)

| Kademe | Eşik | Uç noktalar |
|---|---|---|
| `strict` | 30/dk **+ 600/saat** | `/complete-level`, `/daily/complete` |
| `moderate` | 60/dk | `/rewards/prepare\|claim\|cancel`, `/friends/request`, `/badges/showcase` |
| `relaxed` | 120/dk | `/game/telemetry`, `/game/feedback`, `/played-levels` |
| `support` | 2/dk | `/create-ticket` — **değişmedi** |
| `internalLog` | 100/dk global + 20/dk uid | `/internal/log` — **değişmedi** |
| `adminSensitive` | 10/dk | `/admin/recovery/recompute`, `DELETE /admin/levels/:id`, `POST /admin/levels/:id/restore` |

Son satır 02'den devirdir. `confirmDestructive.ts` **yeniden icat edilmedi**, dokunulmadı;
hız limiti onay kapısının *önüne* eklendi (döngüye giren bir admin script'i onay kapısını
tekrar tekrar tetikleyemesin).

**Katman C için uç nokta uydurulmadı** (ertelendi — `notlar.md` §1).

### 1.3 Aşım davranışı (§3.4)

- `429` + `Retry-After: <saniye>`, **asla 0** (anında yeniden deneme daveti yok).
- Gövde: `{ "success": false, "error": "RATE_LIMIT_EXCEEDED" }` — limit, pencere ve
  kalan hak **sızmaz**; bunu doğrulayan ayrı bir test var.
- İstemci: `workerClient.ts` 429'u `WorkerRateLimitError` olarak ayırır (`isRateLimitError`).
  `useLevelCompletion` → `reason: 'rate_limited'`, `useDailyCompletion` → `reason: 'rate_limited'`.
  İkisinde de oyun akışı devam eder, yerel iyimser kayıt yerinde kalır, günlükte
  "tekrar dene" düğmesi açık kalır.
- i18n: `common.rate_limited` + `play.rate_limited` (**tr + en**). Metinler eşik değeri içermez.

### 1.4 Kötüye kullanım sinyalleri (§3.5)

`src/services/securitySignals.ts` (**YENİ**) — `audit_logs`'a `category: 'security'` yazar,
**otomatik ban yok** (§4 gereği):

| Sinyal | Eşik | Not |
|---|---|---|
| `security.rate_limit_exceeded` | eşiksiz | uid + uç nokta + kapsam. |
| `security.verify_moves_failed` | uid başına **5/dk** | "Tek tük normaldir, tekrarlayanı şüphelidir" — yalnızca eşik aşımında yazılır. |
| `security.auth_failure_spike` | **global 50/dk** | Kimlik yok (token zaten geçersiz) ve **IP toplanmadı** (05'in kararı, §4 sınırı). Bu yüzden sinyal global ani yükseliştir. |

Sinyal sayaçları hız limiti sayaçlarıyla **aynı mekanizmayı** kullanır; ikinci bir sayaç
altyapısı yazılmadı. Her başarısızlığı D1'e yazmak, tam da korumaya çalıştığımız yazma
bütçesini saldırganın eline vermek olurdu.

`migrations/0015_security_signals.sql` (**YENİ, eklemeli**): `audit_logs(category, created_at DESC)`
indeksi. Mevcut indekslerin hepsi `uid` ile başlıyor; "son 24 saatte kim olursa olsun hangi
güvenlik olayları oldu?" sorgusu bugün tam tablo taraması yapardı. Hiçbir kolon
silinmedi/yeniden adlandırılmadı.

`services/auditLog.ts`: `AuditCategory` birliğine `'security'`, `AuditAction`'a üç yeni eylem.

### 1.5 Gürültü temizliği (§3.6)

`routes/game.ts`:
- `console.log('[CompleteLevel] Request body:', JSON.stringify(body))` → **kaldırıldı**.
- `verifyMoves` başarısızlığında tüm hamle dizisini basan log → `{ uid, levelId, moveCount }`
  ile sınırlı `console.warn`.

### 1.6 Testler (§2.2)

`test/rateLimit.spec.ts` (26) + `test/securitySignals.spec.ts` (7) = **+33 test**.

Kapsanan karar noktaları: pencere matematiği (taze/dolu/süresi geçmiş/ceza yok/kalan süre),
**maliyet** (1'den büyük, geçersiz kılma, NaN), bozuk kademede fail-open, tablo bütünlüğü
(her uç noktanın kademesi var, 15 uç nokta eksiksiz, bilinmeyen uç nokta uydurmaz, mevcut
iki kademe değişmemiş), kimlik ayrışması, uç nokta ayrışması, kimliksiz istekte global
kuralın işlemesi, saatlik ikinci tavan, **normal oyun akışının takılmadığı** (30 ardışık
tamamlama geçer), middleware'in 429 + `Retry-After` döndürmesi, **eşik sızdırmaması**,
audit kaydı yazması, sinyal eşiklerinin altında yazmaması/üstünde yazması, eşiğin
oyuncular arası ayrışması ve pencere sonunda sıfırlanması.

---

## 2. Ne yapılmadı ve neden

- **Mekanizma değişikliği (§3.1).** Cloudflare Rate Limiting binding'i `wrangler.jsonc`
  binding'i + panel ayarı gerektirir → `00-ilkeler.md` §5 gereği ajan karar veremez.
  §3.2 mekanizmadan bağımsız yazıldı; karar geldiğinde tek yapılacak ikinci bir
  `RateLimitStore` uygulaması. Bkz. §6.
- **Global kova (`/internal/log` hariç) konulmadı.** Global sayaç, bir saldırganın tüm
  oyuncuları birden kilitlemesine (DoS amplifikasyonu) izin verir ve isolate başına olduğu
  için zaten kesin değildir. `/internal/log`'un tek bir sunucu-sunucu çağıranı olduğu için
  orada anlamlıdır ve korundu.
- **IP tabanlı limit yok** (§4 — 05'in kararına bağlı). Bu yüzden kimlik doğrulama sinyali
  "arka arkaya aynı kaynaktan" değil "global ani yükseliş" olarak yazıldı.
- **Otomatik ban / CAPTCHA / WAF yok** (§4 kapsam dışı).
- **Katman C uç noktası yok** — ertelendi (`notlar.md` §1), uydurulmadı.
- **`rewards` içindeki mevcut `maxPerUidPerMinute` kuralına dokunulmadı.** O, ödül
  iş kuralıdır (hangi aksiyondan kaç tane); hız limiti onun üstünde ayrı bir kattır.

---

## 3. Doğrulama (§2.1 tablosunun çalıştırılmış hâli)

| Kontrol | Komut | Sonuç |
|---|---|---|
| App tip denetimi | `npx tsc --noEmit` | ✅ **hatasız** (çıktı yok, exit 0) |
| App testleri | `npm test` | ✅ `Test Files 16 passed (16)` · `Tests 86 passed (86)` |
| Worker tip denetimi | `cd syncron-worker && npx tsc --noEmit` | ✅ **hatasız** (çıktı yok) |
| Worker testleri | `cd syncron-worker && npx vitest run` | ✅ `Test Files 16 passed (16)` · `Tests 198 passed (198)` |
| CrazyGames build | `npm run build:crazygames` | ✅ `crazygames: 95 dosya, 3.38MB → dist-portals\crazygames.zip` |
| GameDistribution build | `npm run build:gd` | ✅ `gamedistribution: 95 dosya, 3.38MB → dist-portals\gamedistribution.zip` |
| Android build | `npm run build:mobile` | ✅ `√ update android` · `[info] Sync finished in 0.518s` |

Worker testi **165 → 198** (+33). App testi 86 → 86 (değişmedi). Hiçbir test kırmızı değil.

### 3.1 Eşiklerin gerçek veriyle doğrulanması (§5 kabul kriteri)

Görev dosyası `level_telemetry.time_spent` dağılımına bakmayı söylüyordu. **Ölçtüm:
`level_telemetry` tablosu üretimde BOŞ (0 satır)** — hiç telemetri yazılmamış. Bu yüzden
aynı soruyu iki başka gerçek kaynaktan sordum (üretim D1, `wrangler d1 execute --remote`):

| Ölçüm | Değer |
|---|---|
| `played_levels` satır sayısı | 45 |
| `played_levels.time_spent` | min **1 sn**, medyan ~6 sn, maks 84 sn |
| `audit_logs` toplam | 63 |
| **Bir uid'in bir dakikada yaptığı en fazla `level.complete`** | **9** (2026-09-11T10:41). İkinci en yoğun dakika 5. |

**Sonuç:** 30/dk, ölçülen en hızlı gerçek oyuncunun **~3.3 katı**. Sabit pencere sınırındaki
en kötü durumda (60/dk) bile insan davranışının çok üstünde kalıyor.

**Görev dosyasından bilinçli sapma — saatlik eşik 300 → 600.** Önerilen 300/saat, sürekli
5/dk demektir ve bu **ölçülen 9/dk'lık tepe dakikanın altındadır**; uzun bir seansta ya da
çevrimdışı birikmiş senkronda meşru bir oyuncu takılabilirdi (§2 hedef 4 ihlali). 600/saat,
tepe dakikanın 2 katı bir ortalamayı bir saat boyunca sürdürmeye izin verir; saldırgan için
hâlâ sert bir tavandır. Gerekçe `lib/policy.ts` doc-comment'inde de yazılıdır.

⚠️ **Uyarı:** Bu veri kümesi küçük (45 satır, ağırlıklı olarak tek bir uid — büyük olasılıkla
geliştirici test oynamaları). Gerçek oyuncu tabanı oluştuğunda eşikler yeniden ölçülmelidir.
`level_telemetry`'nin boş olması ayrıca **kapsam dışı bir bulgudur** (bkz. §5).

---

## 4. Elle kontrol listesi (proje sahibi)

1. **Migration'ı uygula:** `cd syncron-worker && npx wrangler d1 migrations apply syncron-audit-logs --remote`
   (`0015_security_signals.sql`). Deploy'dan önce yapılmalı; yapılmazsa kod yine çalışır
   (indeks yalnızca sorgu hızıdır), ama güvenlik sorgusu yavaş kalır.
2. Normal hızda **10 bölüm arka arkaya bitir** — hiçbir yerde 429 görmemelisin.
3. Aynı `/complete-level` isteğini script'le hızla tekrarla → 429 + `Retry-After` gelmeli,
   oyun çökmemeli, kazanma ekranında "Biraz yavaşla" rozeti çıkmalı.
4. `/create-ticket` davranışının değişmediğini doğrula: dakikada 3. talep 429
   `RATE_LIMIT_EXCEEDED` almalı (eskisiyle aynı).
5. `audit_logs` tablosunda `category = 'security'` kayıtlarının oluştuğunu gör:
   `SELECT action, uid, metadata, created_at FROM audit_logs WHERE category='security' ORDER BY created_at DESC LIMIT 20;`
6. Cloudflare panelinden Worker CPU ve D1 yazma grafiklerinin **taban çizgisini not et**
   (kıyas için; 05 bunu kullanacak).

### Senin yapman gereken (ajan yapamaz)

- **Cloudflare WAF kuralları** (§4): panelden. Öneri: `/complete-level` ve `/admin/*` için
  ülke/ASN bazlı hız kuralı, Bot Fight Mode.
- **Mekanizma kararı** — bkz. §6.

---

## 5. Kapsam dışı bulgular (düzeltilmedi, not edildi)

1. **`level_telemetry` tablosu üretimde tamamen boş.** İstemci `sendTelemetry` çağırıyor
   (`services/api/gameClient.ts`) ve uç nokta var, ama D1'de tek satır yok. Ya telemetri
   hiç ulaşmıyor ya da yazma sessizce başarısız oluyor (istemcide hata `console.warn` ile
   yutuluyor). Bu, bölüm kalite analizini ve gelecekteki eşik ayarlarını kör bırakıyor.
   **Bu görevin kapsamı değil** — ayrı bir iş olarak ele alınmalı.
2. `routes/friends.ts` 890+ satır, `00-ilkeler.md` §1'in ~250 satır kuralının çok üstünde.
   Dokunulmadı.
3. `src/routes/internalLog.ts` içinde `showcaseBadges: any[]` ve kullanılmayan
   `jsonBadges` değişkeni duruyor (bu görevden önce de vardı). Dokunulmadı.

---

## 6. LİDERE SORU — hız limiti mekanizması (§3.1, zorunlu soru)

**Durum.** Bugünkü uygulama **bellek içidir** ve sayaç Worker isolate'ine bağlıdır.
Cloudflare aynı anda çok sayıda isolate çalıştırıp geri dönüştürdüğü için bu limit
**kesin değildir**: kaba kötüye kullanımı ve döngüye giren istemciyi keser, kararlı ve
dağıtık bir saldırıyı kesmez. Görev dosyası §1.3 bunu zaten tespit etmişti; ölçüm de
bunu değiştirmiyor.

**Neden ben seçmedim.** Görev dosyası §3.1 açıkça "ajan tek başına seçmez" diyor; ayrıca
seçenek B `wrangler.jsonc`'ye binding eklemeyi **ve Cloudflare panelinden ayar yapmayı**
gerektiriyor → `00-ilkeler.md` §5'in dördüncü maddesi.

**Soru (üç seçenek, önerim işaretli):**

- **(A) Bellek içi kalsın.** Sıfır maliyet, bugün çalışıyor. Kesin değil.
- **(B) ✅ ÖNERİM — Cloudflare Rate Limiting binding'i ana mekanizma olsun,** bellek içi
  limitleyici ucuz ön filtre olarak önde kalsın. Görev dosyasının da önerisi bu.
  Gerektirdiği: `wrangler.jsonc`'ye binding + panelden kural, ardından tek bir yeni dosya
  (`store.ts` yanına `cloudflareRateLimitStore.ts`). **Çağrı yerlerinin ve kademe tablosunun
  hiçbiri değişmez** — mimari bunun için hazırlandı.
- **(C) D1 tabanlı sayaç.** Önermiyorum: her istekte bir D1 yazması, korumaya çalıştığımız
  bütçeyi saldırganın yerine bizim harcamamız olur (§1.2'deki sorunu büyütür).

Karar (B) ise: binding adını ve panel kuralını belirle, bana ilet; uygulaması küçük ve
izole bir iştir. **Bu soru beklerken sistem korumasız değildir** — mevcut katman devrede.

---

## 7. Sonraki göreve (04 / 05) not

- **05 için hazır temel:** `audit_logs`'ta `category: 'security'` üç eylemle canlı
  (`security.rate_limit_exceeded`, `security.verify_moves_failed`, `security.auth_failure_spike`)
  ve `idx_logs_category_created` indeksi var. 05 yeni sinyal eklerken
  `services/securitySignals.ts`'e bir eşik + bir ince fonksiyon ekler; sayma/eşik
  mantığını **kopyalamamalıdır**.
- **05 IP kararını verdiğinde:** kimlik doğrulama sinyali bugün *global ani yükseliş*tir.
  IP toplanmasına karar verilirse `recordAuthFailure` kimlik başına kovaya geçirilebilir;
  `crossedThreshold` zaten kimlik parametresi alıyor, imza değişmez.
- **Yeni uç nokta ekleyen herkese:** hız limiti `services/rateLimit/lib/policy.ts`
  tablosundadır. Yeni uç noktayı oraya ekle + route'a `rateLimit('<kimlik>')` koy.
  Tabloda olmayan uç nokta **sessizce limitsizdir** (fail-open, bilinçli).
- **`services/rateLimit` dışa yalnızca `index.ts`'ten açılır**; `lib/*` import edilmez.
- 04'ün build sertleştirmesi bu görevin dosyalarına dokunmuyor; çakışma beklemiyorum.
