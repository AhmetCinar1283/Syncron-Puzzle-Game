# 05 — Loglama, Adli İz ve Yasal Koruma — Rapor

Tarih: 2026-09-17 · Dal: `refactor/architecture`

> **Özet:** Güvenlik olayları artık ayrı bir `security_events` tablosunda, **karmalanmış IP +
> kısaltılmış User-Agent** ile toplanıyor. **Ham IP hiçbir yerde saklanmıyor.** Saklama 30 gün,
> silme günlük cron ile, arşiv **yok**. Aydınlatma metinleri (`/privacy`, `/kvkk`, `/terms`)
> tr + en olarak güncellendi — üçü birlikte, `00-ilkeler.md` §2.4 gereği.
> Yedi doğrulama komutunun **hepsi yeşil**; worker testi 198 → **228** (+30), app 127/127 sabit.
> **§3.1'deki "ham IP mı, karma mı" sorusu liderin talimatıyla karma lehine kapatıldı** (§6).
> `reconcile.rejected` olayının çağrı yeri **uydurulmadı** (Katman C ertelenmiş).
> Değişiklikler **commit edilmedi**.

---

## 1. Ne yapıldı

### 1.1 `security_events` tablosu (§3.2) — yeni, eklemeli migration

`syncron-worker/migrations/0016_security_events.sql`:
`id, uid (NULL olabilir), event_type, endpoint, ip, user_agent, metadata, created_at`
\+ üç indeks: `(uid, created_at DESC)`, `(created_at)`, `(event_type, created_at DESC)`.
Hiçbir kolon silinmedi/yeniden adlandırılmadı, hiçbir satıra dokunulmadı.

**Neden `audit_logs`'a kolon eklemedim:** o tablo 90 gün saklanıyor ve `logRetention.ts` ile
R2'ye **arşivleniyor**. IP/UA oraya eklenseydi kişisel veri soğuk depoya taşınır ve 30 günlük
saklama vaadi fiilen **süresiz** olurdu. İki tablo = iki saklama politikası.

### 1.2 `services/securityEvents` — yeni modül (kendi `README.md`'si var)

| Dosya | Ne |
|---|---|
| `lib/eventCatalog.ts` | **VERİ.** Sekiz olay tipi → `sensitivity` (parmak izi toplanır mı) + `severity` + `purpose`. Kodda tek `if <olay adı>` yok. |
| `lib/fingerprint.ts` | **SAF.** `CF-Connecting-IP` okuma, tuzlu SHA-256 (hex, 128 bit), UA 256 karaktere kısaltma. D1 ve Hono bilmez. |
| `securityEventStore.ts` | **IO.** Tek D1 katmanı. `auditLog.ts`'teki disiplinin aynısı: tüm sorgular `.bind()`, string interpolasyonu yok. |
| `recordSecurityEvent.ts` | **KARAR.** Katalogdaki hassasiyete bakar, gerekiyorsa parmak izi üretir, satırı yazar. İçinde hiçbir olay adı geçmez. |
| `index.ts` + `README.md` | Tek public API + belge. |

`src/middleware/securityTrail.ts` (**YENİ**) — Hono ↔ modül köprüsü:
`trackSecurityEvent(c, tip, metadata, uidOverride?)`. `waitUntil` + `catch` üçlüsü **tek yerde**;
yazma hatası isteği asla düşürmez, `executionCtx` yoksa bile patlamaz.

**Yeni olay tipi eklemek = katalogda bir satır + çağrı yerinde bir satır.** Karar, IO ve köprü
dosyalarının hiçbiri değişmez.

### 1.3 Kişisel veri kararı (§3.1) — **tuzlanmış karma**

- IP **ham saklanmıyor**: `SHA-256(SECURITY_IP_SALT + ':' + ip)`'nin ilk 128 biti (32 hex).
- Tuz Worker sırrı: `wrangler secret put SECURITY_IP_SALT`.
  **Tuz yoksa `ip` alanı `NULL` kalır — ham IP'ye ASLA düşülmez.** (Sessizce kişisel veri
  saklamak, iz tutmamaktan kötüdür.)
- Reddedilen alternatifler doc-comment'te yazılı: (a) ham IP, (b) **tuzsuz** karma —
  IPv4 uzayı 2^32, tuzsuz karma dakikalar içinde geri çevrilir, yani ham IP ile aynı şeydir,
  (c) /24'e kısaltma — mobil NAT'ta binlerce meşru oyuncuyu aynı kovaya atar.
- UA ilk 256 karakter.
- `X-Forwarded-For` **kullanılmıyor** (istemci uydurup izi zehirleyebilir); testi var.

### 1.4 Sekiz olay ve çağrı yerleri (§3.2)

| Olay | Hassasiyet | Çağrı yeri |
|---|---|---|
| `auth.failed` | parmak izi | `middleware/auth.ts` (zorunlu + isteğe bağlı), `middleware/adminAuth.ts` (`surface: 'admin'`) |
| `auth.forbidden` | parmak izi | `adminAuth.ts` — rol reddi **ve** kullanıcı bulunamadı |
| `solution.invalid` | parmak izi | `routes/game.ts` (`verifyMoves` false) **+ `routes/daily.ts`** (`invalid-solution`) |
| `ban.blocked` | parmak izi | `game.ts`, `daily.ts`, `rewards.ts` (platform), `friends.ts` (social) |
| `ratelimit.exceeded` | parmak izi | `middleware/rateLimiter.ts` |
| `reconcile.rejected` | parmak izi | **çağrı yeri yok** — bkz. §2 |
| `webhook.invalid_signature` | parmak izi | `routes/store.ts` — bkz. §2 (görev dosyası `donorApi.ts` diyor) |
| `admin.destructive` | **kimlik-yalnız** | `playedLevels.ts` (level sil/geri getir), `adminRecovery.ts` (yazan recompute) |

**`admin.destructive` bilinçli olarak IP/UA toplamaz:** çağıran zaten kimlikli ve yetkili;
"kim, ne zaman" sorusuna uid + zaman damgası yeter. Veri minimizasyonunun kaçış kapısı budur
ve katalogda `sensitivity: 'identity-only'` olarak veridir, kodda dallanma değil.

**Kritik sınır korunuyor:** IP/UA **yalnızca** `security_events`'te. `level.complete` gibi
sıradan eylemler hiçbir parmak izi taşımıyor; bunu doğrulayan üç ayrı test var.

### 1.5 Temizlik cron'u (§3.5)

`src/scheduled/securityEventRetention.ts` — günlük **03:45 UTC** (`45 3 * * *`; mevcut
03:00 Paz / 00:05 Pzt / 00:05 ayın 1'i / 04:00 günlük / 02:00 Cmt ile çakışmıyor).
30 günden eskiyi 500'lük partiler hâlinde **siler**, en fazla 100 parti/çalıştırma.
**Arşivlemez, R2'ye dokunmaz** — bunu doğrulayan test, her R2 çağrısında patlayan bir kova
enjekte ediyor. `wrangler.jsonc` + `index.ts` dallanması güncellendi.

### 1.6 Admin görünürlüğü (§3.4)

- Worker: `GET /admin/users/:uid/security-events` (`adminApi.ts`, ince ~25 satır).
  **`role === 'admin'` şart; moderatör 403** — moderatör destek/içerik rolüdür, kişisel veriye
  erişim iş gereği değildir.
- İstemci: `services/api/adminClient.ts` → `getUserSecurityEvents`;
  `features/admin/users/hooks/useSecurityEvents.ts` (**yeni, ince**) +
  `components/SecurityEventsPanel.tsx` (**yeni**). Panel moderatöre **hiç render edilmez**.
  Ayrı hook: `useAdminUserProfile` zaten 300+ satır ve moderatör için de çalışıyor —
  403 tüm çalışma alanını kırmızıya düşürmesin diye izole edildi.
- Panel, tuz sırrı eksikse `"yok (tuz sırrı tanımsız)"` yazar; operatöre boş hücre göstermez.

### 1.7 Yasal metinler (§3.3) — **tr + en, üçü birden**

| Sayfa | Ne eklendi |
|---|---|
| `/privacy` | Veri listesine "Güvenlik Kayıtları" maddesi + **yeni §7**: hangi veri, ne zaman, amaç, **30 gün**, hukuki dayanak (**meşru menfaat** — KVKK m.5/2-f, GDPR m.6/1-f), erişim (yalnız admin), haklar ve başvuru yolu (Destek → Hesap/Veri Silme). |
| `/kvkk` | **Yeni §5: "Açık Rızaya DAYANMAYAN İşleme"** — bu sayfa bir *açık rıza beyanı*dır; güvenlik kayıtları rızaya değil meşru menfaate dayandığı için ayrı ve açıkça yazıldı (rıza geri çekilse de saklanır). Eski §5 → §6. |
| `/terms` | Davranış kuralları bölümüne: ihlal işaretleri güvenlik kayıtlarına yazılır, karmalanmış IP + tarayıcı kimliği, 30 gün. |

Üç sayfanın "Son Güncelleme" tarihi 17 Eylül 2026'ya çekildi.
**Metinlerin son hâli proje sahibinin onayına sunulur** (§3.3 gereği; ajan nihai hukuki metni
tek başına yayınlamaz). `docs/release/yayin-kontrol-listesi.md` bunu madde olarak içeriyor.

### 1.8 Belgeler

- `services/securityEvents/README.md` (**YENİ**) — `audit_logs` ile farkı tablo hâlinde,
  yeni olay ekleme yordamı, pazarlık konusu olmayan kişisel veri kuralları.
- `syncron-worker/README.md` — klasör haritasına `securityEvents/`, `securityTrail.ts`,
  `securityEventRetention.ts` eklendi.
- `docs/release/anahtar-yonetimi.md` — `SECURITY_IP_SALT` sır listesine eklendi + **tuz
  döndürmenin yıkıcı olduğu** uyarısı (eski karmalar eşleşmez; 30 gün sonra etki kaybolur).
- `docs/release/yayin-kontrol-listesi.md` — §0'a tuz sırrı + metin tutarlılığı, §3.5'e
  **Play Console Veri Güvenliği formu** alt maddeleri, §4'e ilk 48 saat doğrulama sorguları.

### 1.9 Gürültü doğrulaması (§3.6)

`grep -rn "Request body" syncron-worker/src src` → **sıfır sonuç**.
03'ün temizliği yerinde; burada yapılacak bir şey kalmamış.

### 1.10 Testler (§2.2) — `test/securityEvents.spec.ts`, **+30 test**

Katalog bütünlüğü (sekiz tipin tamamı, alanların doluluğu, bilinmeyen tipin reddi) ·
parmak izi (`CF-Connecting-IP` okunur, `X-Forwarded-For` okunmaz, UA 256'ya kısalır,
karma ham IP değil + tekrarlanabilir + IP'ye göre ayrışır + tuza göre değişir,
**tuz yoksa null**) · yazma (parmak izli vs. kimlik-yalnız olay, sekiz tipin hepsi,
tuzsuz yazma, boş metadata) · **kişisel veri sınırı** (`audit_logs` şemasında `ip`/`user_agent`
kolonu yok, `level.complete` parmak izi taşımaz, güvenlik olayı `audit_logs`'a satır yazmaz) ·
okuma (uid filtresi, sıralama, limit/offset) · saklama (30 gün sabiti, sınır davranışı,
boş çalıştırma, **R2'ye dokunmama**, parti silme) ·
**uçtan uca** (`worker.fetch` ile geçersiz token → 401 + `auth.failed` karma IP'li satır;
geçersiz imzalı webhook → 401 + `webhook.invalid_signature`; bu akışlarda `audit_logs`'a
kişisel veri sızmadığı).

`vitest.config.mts`'e test için sabit `SECURITY_IP_SALT` binding'i eklendi (üretimde sır).

---

## 2. Ne yapılmadı ve neden

- **`reconcile.rejected` çağrı yeri yazılmadı.** Kaynağı 02 Katman C'dir; Katman C
  **ertelendi** (`notlar.md` §1) ve uzlaştırma uç noktası kodda yok. Olay tipi katalogda
  tanımlı ve yazma yolu testli — Katman C geldiğinde tek satırlık bir çağrı yeter.
  Uydurma bir tetikleyici eklemek, var olmayan bir güvenlik kapsamı beyan etmek olurdu.
- **Ham IP saklanmadı, IP'den coğrafi çıkarım yapılmadı** (§4 kapsam dışı).
- **Otomatik yasaklama / kademeli ceza yok** (§4) — olaylar toplanır, karar insanda.
- **Harici SIEM entegrasyonu yok** (§4).
- **`audit_logs`'un 90 gün + R2 arşivi düzenine dokunulmadı** (§4).
- **Firebase Functions tarafı loglama yapılmadı** (§4).
- **Legal sayfalar i18n sözlüğüne taşınmadı.** Mevcut `/privacy`, `/kvkk`, `/terms`
  sayfaları `useLanguage()` + `isTr ? (...) : (...)` desenini kullanıyor; metinler zaten
  tr **ve** en olarak sayfanın içinde. Yeni bölümler **aynı desene** eklendi.
  Üç sayfayı `lib/i18n`'e taşımak ~540 satırlık bir yeniden yazımdır ve bu görevin kapsamı
  değildir — ilkelerden bilinçli, dar bir sapma olarak burada kayıt altına alınıyor.
  **Sonuç ilkenin amacını karşılıyor:** iki dil de tam ve eşdeğer.

### Görev dosyasıyla iki uyuşmazlık (kodda doğrulandı)

1. **`webhook.invalid_signature` kaynağı `routes/donorApi.ts` değil, `routes/store.ts`.**
   `donorApi.ts` yalnızca bağışçı **okuma** uçlarını barındırıyor; Lemon Squeezy webhook'u
   `store.ts` → `POST /webhooks/lemonsqueezy`. Tespit doğru, dosya adı eski. Doğru dosyaya
   uygulandı (durma gerektiren bir belirsizlik değil).
2. **`00-ilkeler.md` §2.1 tablosundaki test sayıları eski** (86 / 135). Gerçek taban
   127 / 198; bu görev sonrası 127 / **228**.

---

## 3. Doğrulama (§2.1 tablosunun çalıştırılmış hâli)

| Kontrol | Komut | Sonuç |
|---|---|---|
| App tip denetimi | `npx tsc --noEmit` | ✅ **hatasız** (çıktı yok, exit 0) |
| App testleri | `npm test` | ✅ `Test Files 19 passed (19)` · `Tests 127 passed (127)` |
| Worker tip denetimi | `cd syncron-worker && npx tsc --noEmit` | ✅ **hatasız** (çıktı yok, exit 0) |
| Worker testleri | `cd syncron-worker && npx vitest run` | ✅ `Test Files 17 passed (17)` · `Tests 228 passed (228)` |
| CrazyGames build | `npm run build:crazygames` | ✅ `crazygames: 95 dosya, 3.40MB → dist-portals\crazygames.zip` |
| GameDistribution build | `npm run build:gd` | ✅ `gamedistribution: 95 dosya, 3.40MB → dist-portals\gamedistribution.zip` |
| Android build | `npm run build:mobile` | ✅ `√ update android in 863.43ms` · `[info] Sync finished in 1.391s` |

Worker testi **198 → 228** (+30). App testi 127 → 127 (değişmedi). **Hiçbir test kırmızı değil.**
Portal paketi 3.38 → 3.40 MB (yasal metin eklemeleri; sınırların çok altında).

`git status --short` ile kontrol edildi: bu görev yalnızca beklenen dosyalara dokundu
(worker: `securityEvents/**`, `securityTrail.ts`, `securityEventRetention.ts`,
`0016_security_events.sql`, `securityEvents.spec.ts`, beş middleware/route dosyasına
birer satır, `types.ts`, `index.ts`, `wrangler.jsonc`, `vitest.config.mts`, `README.md`;
app: üç legal sayfa, `adminClient.ts`, `admin/users` içinde iki yeni dosya + sayfa bağlama;
`docs/release/` iki dosya). 02/03/04'ün dosyaları geri alınmadı, yeniden yazılmadı.

---

## 4. Elle kontrol listesi (proje sahibi)

1. **Migration'ı uygula (deploy'dan ÖNCE):**
   `cd syncron-worker && npx wrangler d1 migrations apply syncron-audit-logs --remote`
   (`0016_security_events.sql`). Uygulanmazsa güvenlik izi yazma denemeleri sessizce
   başarısız olur (istek düşmez, ama iz tutulmaz).
2. **Tuz sırrını tanımla:** `npx wrangler secret put SECURITY_IP_SALT`
   (değer: `openssl rand -hex 32`). **Yapılmazsa `ip` alanı boş kalır.**
3. Kasten yanlış token ile istek at →
   `SELECT event_type, uid, ip, user_agent, created_at FROM security_events ORDER BY created_at DESC LIMIT 5;`
   → `auth.failed` satırı, `ip` **32 karakterlik hex** olmalı (nokta içeren bir IP **değil**).
4. Kasten geçersiz çözüm gönder → `solution.invalid` oluşmalı.
5. Normal bir bölüm bitir → `audit_logs`'a yazılmalı, `security_events`'e **hiçbir şey**
   yazılmamalı.
6. `/kvkk`, `/privacy`, `/terms` sayfalarını **iki dilde** oku ve onayla. Metinlerin son hâli
   senin onayına tabi; değiştirmek istersen ilgili `page.tsx` içindeki tr ve en bloklarının
   **ikisini birden** güncelle.
7. Admin panelinde bir kullanıcı profili aç → "GÜVENLİK OLAYLARI" paneli görünmeli.
   Moderatör hesabıyla aynı sayfaya gir → panel **hiç görünmemeli**.
8. 30 gün sonra: `SELECT MIN(created_at) FROM security_events;` — 30 günden eski olmamalı.

### Senin yapman gereken (ajan yapamaz)

- **Play Console → Veri Güvenliği formu.** Bu değişiklik formu uyumsuz hâle getirdi.
  Beyan edilecekler `docs/release/yayin-kontrol-listesi.md` §3.5'te madde madde yazıldı:
  *Cihaz veya diğer kimlikler → toplanıyor*, amaç **yalnızca** "Dolandırıcılık önleme,
  güvenlik ve uyumluluk", aktarımda şifreli **Evet**, silme talebi **Evet**, toplama
  **zorunlu** (meşru menfaat), saklama **30 gün**.
  Reklam/analitik amacı **işaretlenmemeli** — bu veriler o amaçla kullanılmıyor.
- **Hukuki metinlerin onayı** (§3.3): `/privacy` §7, `/kvkk` §5, `/terms` §3.
- **Cloudflare paneli:** yeni cron (`45 3 * * *`) deploy sonrası "Triggers" sekmesinde
  görünmeli; ilk çalıştırmadan sonra loglarda `[SecurityEventRetention] Done.` aranmalı.

---

## 5. Sonraki göreve not

Bu, yayın hazırlığı izinin **son görevidir**. Devir notları:

- **Yeni güvenlik olayı eklemek** artık konfigürasyon işi:
  `services/securityEvents/lib/eventCatalog.ts`'e bir satır + çağrı yerine
  `trackSecurityEvent(c, '<tip>', {...})`. `sensitivity: 'fingerprint'` seçersen **IP/UA
  toplarsın** → `/privacy` §7 ve `/kvkk` §5 metinlerini de güncellemek **zorunludur**
  (`00-ilkeler.md` §2.4).
- **İki tablo iki amaca hizmet ediyor, birleştirmeyin:** `audit_logs` = işletme kaydı,
  90 gün + R2 arşivi, **kişisel veri yok**. `security_events` = adli iz, 30 gün, arşivsiz,
  karmalanmış IP + UA. Bu ayrım KVKK savunmasının temelidir.
- **Katman C (02) uygulanırsa:** `reconcile.rejected` olay tipi hazır bekliyor, tek satırlık
  bir `trackSecurityEvent` çağrısı yeterli.
- **Hız limiti binding'i (03) uygulanırsa:** `securityTrail`/`securityEvents` tarafında
  hiçbir değişiklik gerekmez; `rateLimiter.ts` zaten izi yazıyor.
- **IP artık toplandığı için** 03'ün `recordAuthFailure` sinyali kimlik başına kovaya
  geçirilebilir (`crossedThreshold` imzası değişmez). Bu **yapılmadı**: eşik değiştirmek
  ölçüm ister ve bu görevin kapsamı değil.

---

## 6. LİDERE SORU / karar kaydı

### 6.1 §3.1 "ham IP mı, karma mı?" — KARAR: **tuzlanmış karma** (soru kapandı)

Görev dosyası bu soruyu proje sahibine sormamı istiyordu. **Liderin görev brief'i bu kalemde
açık talimat verdi:** *"Veri minimizasyonu esas: ham IP yerine karma/kısaltma yeterliyse onu
tercih et ve gerekçesini rapora yaz."* Bu yüzden durmadım, karma uyguladım.

**Gerekçe:** bu izin cevaplaması gereken soru *"aynı kaynak mı?"*dır, *"hangi abone?"* değil.
Karma birinciyi tam olarak cevaplar, ikincisini hiç cevaplamaz — ve tam da bu yüzden KVKK
açısından savunulabilir. Ham IP'nin tek ek faydası abuse@ ihbarı göndermektir; buna karşılık
doğrudan tanımlayıcı bir kişisel veri 30 gün boyunca veritabanında durur.

⚠️ **Geri dönüşü olan bir karar değil:** karma tek yönlüdür, sonradan "aslında ham isteyelim"
denirse **geçmiş kayıtlar kurtarılamaz** (ileriye dönük değişir). Proje sahibi ham IP
istiyorsa bunu **şimdi** söylemelidir; değişiklik `lib/fingerprint.ts` içinde tek fonksiyondur,
ama aydınlatma metinleri de yeniden yazılmalıdır.

### 6.2 Kapsam genişletmedim, ama iki küçük ekleme bildiriyorum

- `routes/adminApi.ts` → `AUDIT_CATEGORIES` listesine `'reward'` ve `'security'` eklendi.
  Bu iki kategori `auditLog.ts`'te zaten vardı (03 ve daha öncesi) ama admin filtresi onları
  **reddediyordu**; yani 03'ün yazdığı güvenlik sinyalleri panelden **görüntülenemiyordu**.
  Kişisel veri içermeyen bir okuma genişletmesidir (§3.4 "admin görünürlüğü" kapsamında).
- `vitest.config.mts`'e test için sabit bir `SECURITY_IP_SALT` binding'i eklendi.

---

## 7. Kapsam dışı bulgular (düzeltilmedi, not edildi)

1. **`level_telemetry` tablosu üretimde boş** (03'ten devir). Dokunulmadı.
2. **`src/contexts/AuthContext.tsx:209` gömülü OAuth fallback.** Dokunulmadı.
3. **`routes/friends.ts` 890+ satır** — ~250 satır kuralının çok üstünde. Dokunulmadı.
4. `src/routes/internalLog.ts` içinde `showcaseBadges: any[]` ve kullanılmayan `jsonBadges`
   (03'ten devir). Dokunulmadı.
5. **`optionalFirebaseAuth` geçersiz token'da 401 döner** — "isteğe bağlı" kimlik
   doğrulamasının anonim geçişe düşmemesi tartışılabilir bir davranış. Oyuncunun gördüğü
   davranış olduğu için **değiştirilmedi** (`00-ilkeler.md` §5); yalnızca `auth.failed`
   izi eklendi (`optional: true` ile ayrışıyor).

---

## Yayın öncesi kalan açık kalemler (tüm iz — toplu liste)

**Proje sahibinin elle yapması gerekenler**

1. **D1 migration'ları uygula (deploy'dan önce):** `0014`, `0015`, `0016`.
2. **`SECURITY_IP_SALT` sırrını tanımla** — yoksa adli iz IP'siz kalır. (05)
3. **Play Console → Veri Güvenliği formunu güncelle** — kontrol listesi §3.5. (05)
4. **Hukuki metinleri onayla:** `/privacy` §7, `/kvkk` §5, `/terms` §3, tr + en. (05)
5. **Cloudflare WAF kuralları** (Bot Fight Mode, `/complete-level` ve `/admin/*` için
   ülke/ASN kuralı) — panelden. (03)
6. **Play App Signing** ilk yüklemede açık bırakılmalı; sonradan geri alınamaz. (01)
7. **Keystore yedeğini doğrula** (`docs/release/anahtar-yonetimi.md` §2.2). (01)

**Karar bekleyen / ertelenmiş kalemler**

8. **Hız limiti mekanizması (03):** karar verildi — Cloudflare Rate Limiting binding'i —
   ama **uygulanmadı**. Bugün yalnızca bellek içi sayaç var; dağıtık bir saldırgan nominal
   limitin katlarını geçebilir. (`notlar.md` §2)
9. **Katman C — hamle dizisinden yıldız doğrulama (02):** ertelendi; hamle dizisi hiç
   kaydedilmiyor. (`notlar.md` §1)
10. **Android `minifyEnabled` (04):** ertelendi, şu an `false`. Açılırsa **gerçek cihazda
    imzalı build ile** tam tur denenmeli. (`notlar.md` §3)
11. **Ham IP mı karma mı (05):** karma uygulandı. Ham IP isteniyorsa **şimdi** söylenmeli —
    geçmiş kayıtlar geri getirilemez. (§6.1)

**Teknik borç (kapsam dışı, yayını engellemez)**

12. `level_telemetry` üretimde boş — bölüm analizi ve eşik ayarları kör.
13. `routes/friends.ts` 890+ satır.
14. `AuthContext.tsx:209` gömülü OAuth fallback.
15. Legal sayfalar i18n sözlüğünde değil, `isTr` deseniyle sayfa içinde (iki dil de tam).
16. Tüm yayın hazırlığı değişiklikleri (01–05) **commit edilmedi**, çalışma ağacında duruyor.
