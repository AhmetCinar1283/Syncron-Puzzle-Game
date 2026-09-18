# 06 — Hız Limiti: Cloudflare Rate Limiting Binding'i — Rapor

Tarih: 2026-09-18 · Dal: `refactor/architecture` · **Commit edilmedi.**

> **Özet:** `RateLimitStore` sözleşmesinin ikinci uygulaması (Cloudflare Rate Limiting
> binding) yazıldı; bellek içi uygulama **silinmedi**, ucuz ön filtre olarak öne alındı.
> Sıralama tek kompozisyon noktasında (`resolveStore.ts`) kuruldu. **Çağrı yerleri ve
> `lib/policy.ts` kademe tablosu değişmedi.** Worker testleri 228 → **251** (+23), worker
> tipleri temiz, üç build yeşil. **App test komutu ise makinede kırmızı** — ama bu benim
> değişikliğimden bağımsız, dokunulmamış ağaçta da kırmızı (kanıt §3.1).

---

## 1. Ne yapıldı

| Dosya | Durum | Ne |
|---|---|---|
| `syncron-worker/wrangler.jsonc` | değişti | `ratelimits` bölümü: **7 binding**, adlandırma `RL_<limit>_PER_<saniye>S`. Eşikler `lib/policy.ts` ile birebir aynı (30/60/120/2/100/20/10 — hepsi 60 sn). |
| `src/services/rateLimit/lib/bindingName.ts` | **YENİ, saf** | `{limit, windowMs}` → binding adı. İfade edilemeyen kurala `undefined` der. Env/binding bilmez. |
| `src/services/rateLimit/cloudflareRateLimitStore.ts` | **YENİ** | `RateLimitStore`'un ikinci uygulaması. Binding'i runtime'da tip-korumasıyla doğrular, yoksa geçirir ve **bir kez** loglar. |
| `src/services/rateLimit/layeredStore.ts` | **YENİ** | Katmanları sırayla dener; **ilk reddeden kazanır**, sonraki katman hiç çağrılmaz. |
| `src/services/rateLimit/resolveStore.ts` | **YENİ — kompozisyon noktası** | Sıra: **[1] bellek içi ön filtre → [2] binding**. Env başına `WeakMap` önbelleği. Binding hiç yoksa bir kez `console.warn`. |
| `src/services/rateLimit/index.ts` | değişti | Yeni public API'ler dışa açıldı. |
| `src/middleware/rateLimiter.ts` | değişti (**2 satır**) | `sharedRateLimitStore` → `resolveRateLimitStore(c.env)`. Mekanizma seçimi HTTP katmanına sızmıyor. |
| `src/types.ts` | değişti | `Env`'e desenli indeks: `[k: \`RL_${string}\`]: RateLimit \| undefined` — her eşik için ayrı alan yazmak policy tablosunun ikinci kopyasını doğururdu. |
| `src/services/rateLimit/README.md` | değişti | "AÇIK KARAR" bölümü, uygulanmış iki katmanlı mekanizma anlatımıyla değiştirildi. |
| `test/rateLimitBinding.spec.ts` | **YENİ** | +23 test. |

Her yeni dosyada `DOSYA AMACI` başlığı ve karar noktalarında üç soruya (alternatif /
yeni tür eklenince değişir mi / değer eksik gelirse) doc-comment cevabı var.
Gerekçesiz `any` yok (`unknown` + runtime tip koruması kullanıldı).

### 1.1 Katman sırası ve gerekçesi

1. **Bellek içi (isolate başına)** — ucuz. Döngüye girmiş tek istemciyi kenara hiç
   çıkmadan keser.
2. **Cloudflare binding (hesap geneli)** — paylaşılan gerçek; dağıtık saldırgan
   isolate'lere dağılsa bile aynı kovaya düşer.

Eşikler iki katmanda da **aynı tablodan** geldiği için ön filtre hiçbir zaman arkadakinden
daha gevşek davranamaz.

### 1.2 Yeni testler (23)

Ad eşlemesi (dakika/10 sn/saat/bozuk limit), binding izin/ret, ret'te `Retry-After` =
pencere, binding yokken geçirme + **bir kez** loglama, binding adı dolu ama nesne yanlış
tipteyken patlamama, saatlik kuralın bellek katmanına düşmesi, `cost > 1` çoklu sayım,
saçma `cost` tavanı, `NaN` cost, binding hatasının yutulmaması, katman sırası (ön filtre
reddederse arkadaki **hiç çağrılmaz**), boş zincir fail-open, `resolveStore` önbelleği,
env yokken çalışma, uçtan uca `evaluateRateLimit` + binding (Retry-After 60 sn, kapsam
`uid`), kademe tablosunun değişmediğinin doğrulanması.

---

## 2. Ne yapılmadı / sapmalar

1. **SAPMA (platform sınırı) — saatlik tavan binding'e giremiyor.** Cloudflare "simple"
   rate limiting binding'i `period` olarak **yalnızca 10 veya 60 saniye** kabul eder
   (`wrangler` config şeması: `ratelimits[].simple.period` enum `[10, 60]`). Bu yüzden
   `strict` kademesinin ikinci tavanı (**600/saat**) paylaşılan sayaçla uygulanamaz;
   o kural **bellek içi katmanda, yani isolate başına** kalır. Asıl koruma olan dakikalık
   tavan (30/dk) artık paylaşılan sayaçtadır. Durum kodda, `wrangler.jsonc` yorumunda ve
   modül README'sinde açıkça yazılıdır; sessiz değil, isolate başına bir kez loglanır.
   **Etkilenen:** ileride "saatlik tavan da kesin olsun" denirse mekanizma Durable Object
   ya da KV olur; o zaman yalnızca `resolveStore.ts`'e üçüncü bir katman eklenir.
2. **SAPMA (`notlar.md` §2 adım 2) — panelden elle kural ayarı gerekmedi.** Rate Limiting
   binding'i tamamen `wrangler.jsonc` ile tanımlanır; `namespace_id` panelde önceden
   oluşturulan bir kaynak değil, sayaç uzayını ayıran serbest bir kimliktir (1001–1007
   verildi). Panelde yapılacak iş **doğrulama** ve isteğe bağlı WAF'tır (§4). Bu adımı
   uydurup "panelden şunu aç" demedim; doğrulama adımlarını §4'e yazdım.
3. **Bellek içi uygulama silinmedi** (istendiği gibi), `lib/policy.ts` ve çağrı yerleri
   (route'lar) **tek satır değişmedi**.
4. **Yeni kullanıcı metni yok** → i18n değişikliği gerekmedi. 429 akışının tr+en metinleri
   (`common.rate_limited`, `play.rate_limited`) 03'te eklenmişti, davranış aynı.
5. **`wrangler types` çalıştırılmadı** — üretilen `worker-configuration.d.ts` kapsam dışı
   ve içinde gerçek `FIREBASE_API_KEY` gömülü (kapsam dışı bulgu, §5). Tipler
   `src/types.ts` üzerinden elle verildi; `tsc` temiz.

---

## 3. Doğrulama (`00-ilkeler.md` §2.1 — gerçekten çalıştırıldı)

| Kontrol | Komut | Sonuç |
|---|---|---|
| App tip denetimi | `npx tsc --noEmit` | ✅ hatasız (exit 0, çıktı yok) |
| App testleri | `npm test` | ❌ **`Test Files 19 failed (19)` · `Tests no tests`** — bkz. §3.1 |
| Worker tip denetimi | `cd syncron-worker && npx tsc --noEmit` | ✅ hatasız |
| Worker testleri | `cd syncron-worker && npx vitest run` | ✅ `Test Files 18 passed (18)` · **`Tests 251 passed (251)`** (taban 228, +23) |
| CrazyGames build | `npm run build:crazygames` | ✅ `crazygames: 95 dosya, 3.40MB → dist-portals\crazygames.zip` |
| GameDistribution build | `npm run build:gd` | ✅ `gamedistribution: 95 dosya, 3.40MB → dist-portals\gamedistribution.zip` |
| Android build | `npm run build:mobile` | ✅ `√ update android in 1.22s` · `[info] Sync finished in 2.413s` |

### 3.1 App testleri neden kırmızı — ve neden bu değişiklikten değil

Hata her dosyada aynı ve **toplama (collect) aşamasında**, ilk `describe(...)` satırında:

```
TypeError: Cannot read properties of undefined (reading 'config')
 ❯ src/game-engine/hint/hintProgress.test.ts:4:1
```

Kanıt: değişiklikler `git stash -u` ile **tamamen geri alınıp** aynı test tek başına
çalıştırıldığında **aynı hata** alınıyor (sonra `git stash pop` ile geri yüklendi):

```
 FAIL  src/game-engine/hint/hintProgress.test.ts [ ... ]
TypeError: Cannot read properties of undefined (reading 'config')
 Test Files  1 failed (1)
```

Bu bir test-koşucusu/bağımlılık sorunudur (kök `vitest@5.0.0` kurulumu); `npm install`
tekrarlandı, düzelmedi. Bu iş **yalnızca `syncron-worker/` altına dokunuyor**
(`git diff --stat`: 5 değişen + 5 yeni dosya, hepsi `syncron-worker/`), app kodunda tek
satır değişmedi. Kapsam dışı olduğu için **düzeltilmedi** (`00-ilkeler.md` §20/§5).
**App test tabanı (127/127) bu makinede şu an doğrulanamıyor.** → §6 LİDERE SORU.

---

## 4. Proje sahibinin Cloudflare panelinde/terminalde yapması gerekenler

> Rate Limiting binding'i için panelde **önceden kaynak oluşturmak gerekmez**; tanım
> `wrangler.jsonc`'tadır ve deploy ile gider. Aşağıdakiler sırasıyla yapılmalıdır.

1. **Deploy et.** Terminal:
   `cd syncron-worker && npx wrangler deploy`
   Çıktıda bindings listesinde 7 satırın (`RL_30_PER_60S`, `RL_60_PER_60S`,
   `RL_120_PER_60S`, `RL_2_PER_60S`, `RL_100_PER_60S`, `RL_20_PER_60S`, `RL_10_PER_60S`)
   göründüğünü doğrula. Görünmüyorsa **durma noktası** — koruma binding'siz çalışır
   (bellek içi) ve log'a uyarı düşer.
2. **Panelden doğrula.** Cloudflare Dashboard → **Workers & Pages** → `syncron-worker` →
   **Settings** → **Bindings**. "Rate limiting" başlığı altında aynı 7 ad görünmeli.
   Panelden bu binding'lerin **limit/period değerlerini elle değiştirme**; tek gerçek
   kaynak `wrangler.jsonc`'tur ve kod binding adını eşikten türetir — ad ile gerçek limit
   ayrışırsa koruma sessizce yanlış eşikte çalışır.
3. **`namespace_id`'lere dokunma.** 1001–1007 sabittir. Değiştirirsen o kovanın sayacı
   sıfırlanır (tek etkisi budur, veri kaybı değildir), ama iki binding'e **aynı id**
   verirsen kovalar karışır ve limitler birbirini yer.
4. **Canlıda tek seferlik duman testi.** Giriş yapmış bir hesapla `/complete-level`'a
   dakikada 30'dan fazla istek at: 31. istekten itibaren `429` + `Retry-After` gelmeli,
   oyun çökmemeli. Normal hızda 10 bölüm bitir: **hiç 429 görmemelisin.**
5. **Log'u kontrol et** (`npx wrangler tail` veya panelde Logs): üretimde
   `Cloudflare Rate Limiting binding bulunamadı` uyarısı **görünmemeli**. Görünüyorsa
   deploy binding'siz gitmiştir.
6. **İsteğe bağlı (03'ten devir, hâlâ elle):** WAF tarafında `/complete-level` ve
   `/admin/*` için ülke/ASN bazlı kural + Bot Fight Mode. Bu, kod tarafındaki limitin
   yerine değil **önüne** geçer.

---

## 5. Kapsam dışı bulgular (düzeltilmedi)

1. `syncron-worker/worker-configuration.d.ts` (wrangler üretimi, repoda) içinde **gerçek
   `FIREBASE_API_KEY` değeri gömülü** görünüyor — `00-ilkeler.md` §2.3 ile gerilimde.
   Ayrı bir işin konusu.
2. Kök `npm test` koşucusu bozuk (§3.1).
3. Bilinen ve dokunulmayanlar: `level_telemetry` boş, `friends.ts` 890 satır,
   `AuthContext.tsx:209`.

---

## 6. LİDERE SORU

1. **App test tabanı doğrulanamadı.** Kök `vitest@5.0.0` kurulumu bu makinede tüm test
   dosyalarını toplama aşamasında düşürüyor; sorun dokunulmamış ağaçta da var. Onarımı
   (vitest sürüm/bağımlılık işi) bu işin kapsamı dışında bıraktım. Ayrı bir iş olarak mı
   açılsın, yoksa bu işin bitiş şartına mı dahil?
2. **Saatlik tavan (600/saat) paylaşılan sayaca alınamıyor** (platform sınırı, §2.1).
   Bugün isolate başına kalıyor. Kesin saatlik tavan isteniyorsa mekanizma Durable Object
   olur ve bu, "her istekte DO çağrısı" bedeli demektir — karar senin.
3. **Panel adımı beklendiği gibi çıkmadı** (§2.2): binding tamamen konfigürasyondan
   geliyor. `notlar.md` §2'deki "panelden kural ayarlanır" maddesi bu raporun §4'ü ile
   değiştirilsin mi?
