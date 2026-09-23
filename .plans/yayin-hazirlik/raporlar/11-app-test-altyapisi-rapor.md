# 11 — Kök (App) Test Altyapısı: Teşhis Raporu

**Durum: ONARILMADI — çünkü onarılacak bir bozukluk bulunamadı.** Belirti bu oturumda
30+ koşuda hiç üretilemedi. Aşağıda (a) hatanın **tam satır seviyesinde mekanizması**,
(b) **kanıtla elenen** hipotezler, (c) neden "yeşil gördüm, kapattım" demediğim ve
(d) lidere açık sorular var. Hiçbir dosya değiştirilmedi, commit yapılmadı.

---

## 1. Hatanın mekanizması (kod okumasıyla kesinleştirildi)

Rapor 09 kritik ayrıntıyı vermiş: hata **`describe()` satırında**. Bu, hatayı tek bir
satıra kilitler.

`node_modules/vitest/dist/chunks/run.CQOUYP-x.js`:

```js
let runner;                                  // 2534 — modül kapsamlı, başlangıçta undefined

function clearCollectorContext(file, currentRunner) {   // 2561
  currentTestFilepath = file.filepath;
  runner = currentRunner;                    // ← `runner` SADECE burada atanır
  ...
}

function createSuiteCollector(...) {         // 2604
  const task = function (name = "", options = {}) {
    ...
    const tagDefinition = runner.config.tags?.find(...)   // 2613  ← İLK `.config` erişimi
```

`describe(...)` gövdesi içindeki ilk `it()`/`test()` kaydı satır 2613'e düşer. Orada
`runner === undefined` ise fırlatılan istisna **birebir**:

```
TypeError: Cannot read properties of undefined (reading 'config')
```

ve yığın izi `describe()` satırını gösterir. Rapor 09'un tarifiyle tam uyuşuyor.

`runner`, worker her test dosyasını import etmeden **önce** `clearCollectorContext` ile
atanır. Dolayısıyla `undefined` kalmasının tek yolu şudur:

> **Test dosyasının `import { describe } from 'vitest'` ile aldığı vitest runtime modülü,
> worker'ın `clearCollectorContext`'i çağırdığı modül örneğinden FARKLI bir örnektir.**
> Yani süreç içinde vitest runtime'ının **iki kopyası** yüklenmiştir.

Bu yüzden belirti "her dosyada, 0 test" şeklindedir: tekilleşme kararı süreç başına bir
kez verilir ve `externalizeMap` / `externalizeCache` / `packageScopeTypeCache` içinde
**önbelleğe alınır**, yani bir koşunun tamamı ya sağlam ya tamamen çöküktür. Ara durum yok.
"51 dosya fail / 0 test" imzası bunun doğrudan sonucudur.

İlgili kırılgan noktalar (vitest'in kendi kodunda, hata yutan yerler):

- `dist/chunks/resolver.CBCHRZ7j.js` → `lookupPackageScopeType()`: `statSync`/`readFileSync`
  hatalarını **sessizce yutar** (`try {} catch {}`), sonucu `"none"` olarak önbelleğe alır.
- `dist/chunks/index.B89dZ0-N.js:9512` → `isValidNodeImport()`: `readFile` hatasında
  `catch { return false }`.
- `dist/chunks/index.B89dZ0-N.js:9573` → `_shouldExternalize()`: yukarıdakiler `false`
  dönerse `undefined` döner → paket **externalize edilmez, inline edilir** → ikinci kopya.
- `dist/chunks/index.1_nbEjJY.js:619-660` → `getCachedVitestImport()`: vitest'in kendisini
  externalize eden özel yol; `id.includes(distDir)` **büyük/küçük harfe duyarlı** string
  karşılaştırması ve `normalizedDistDir.slice(root.length)` gibi kırılgan aritmetik içerir.
  `root` (`process.cwd()` kaynaklı) ile `distDir` (`import.meta.url` kaynaklı) yazımı
  ayrışırsa bu yol ıskalanabilir.

Yani: **geçici bir dosya sistemi hatası (AV/Defender kilidi, EBUSY, EMFILE, indeksleyici)
veya yol yazımı ayrışması, `node_modules/vitest/package.json` okumasını bir kez düşürürse,
o koşuda vitest inline edilir ve 51 dosyanın tamamı bu TypeError ile düşer.** Bu, belirtinin
hem "her şey kırmızı" hem "aralıklı" olmasını aynı anda açıklayan tek mekanizma.

**Dürüst sınır:** Bu mekanizmayı *zorlayarak* üretemedim (aşağıda §3). Kod okumasıyla
tutarlı ve imzayı birebir açıklıyor, ama bu oturumda **doğrudan kanıtı yok**.

---

## 2. Kanıtla ELENEN hipotezler

| # | Hipotez | Eleme kanıtı |
|---|---|---|
| 1 | Bozuk/yarım `npm install`, node_modules ↔ lock tutarsızlığı | `node_modules/.package-lock.json` ile `package-lock.json` sürüm-sürüm karşılaştırıldı: **tek fark bile yok** (112 fark var, hepsi win32 dışı `optional` platform paketleri — darwin/linux/wasm binding'leri). Ağaç sağlam. |
| 2 | Sürüm kayması (`^5.0.0` → 5.0.1 vb.) | `node_modules/vitest` = 5.0.0, `vite` = 8.3.0, lock ile aynı. `npm ls vite vitest`: tek kopya, `deduped`, çakışma yok. Kayma **olmamış**. |
| 3 | node_modules bu arada değişti / biri kurulum yaptı | `node_modules/vitest` mtime **2026-09-11**, `node_modules/.package-lock.json` **2026-09-20**. npm log dizininde **bugün benim oturumumdan önce hiç npm çalıştırılmamış** (ilk log 12:20 UTC = benim ilk komutum). Rapor 09 (15:14) ile benim ilk koşum (15:19) **aynı, bayt-bayt aynı node_modules**'ü kullandı. Biri kırmızı, biri yeşil → **disk durumu sebep değil.** |
| 4 | vitest/vite sürüm uyumsuzluğu (worker ile karşılaştırma) | syncron-worker'ın vitest 3.2.4'ü ile **kök config'i çalıştırdım**: `51 passed / 517 passed`. Yani kök test paketi vitest 3.2 ile de vitest 5.0 ile de çalışıyor. Sürüm suçlu değil. |
| 5 | İkinci bir vite/vitest kurulumu (parent dir, global, junction) | `C:\Dev`, `C:\Dev\MyProjects`, `C:\`, `%USERPROFILE%` altında node_modules/package.json **yok**. Global npm'de sadece `firebase-tools` + `npm`. `dir /AL` → kökte junction/symlink **yok**. |
| 6 | `@types/node@20` ↔ vitest peer `^22 \|\| >=24` uyumsuzluğu (rapor 09'un şüphesi) | Bu yalnızca **tip** düzeyinde bir peer uyarısı; çalışma zamanına etkisi yok. Ayrıca `npx tsc --noEmit` **temiz** (exit 0). Gerçek bir kusur ama **bu belirtinin sebebi değil**. |
| 7 | Eşzamanlılık / yarış (paralel ajan, paralel vitest) | 2 kök vitest + 1 worker vitest **aynı anda** çalıştırıldı: üçü de yeşil (51/51, 51/51, 19/263). |
| 8 | Önbellek (`node_modules/.vite`, `.vite-temp`) | Her ikisi de **silindi**, soğuk önbellekle `npm test` → 51/51, 517/517. |
| 9 | Kabuk / yol farkı (Windows'a özgü) | Git Bash, PowerShell (`npx.cmd`), `npx`, `node_modules/.bin/vitest` — hepsi yeşil. Küçük harfli cwd (`cd /c/dev/myprojects/...` → `process.cwd() = C:\dev\myprojects\...`) ile de yeşil. |
| 10 | `NODE_OPTIONS` / ortam değişkeni kirliliği | `--experimental-vm-modules`, `--experimental-strip-types`, `--no-experimental-detect-module`, `--experimental-transform-types`, `NODE_ENV=production`, `CI=true` — hepsi yeşil. |
| 11 | Pool / izolasyon ayarı | `--pool=threads\|forks\|vmThreads\|vmForks`, `--maxWorkers=1`, `--no-file-parallelism`, `--sequence.shuffle`, `--typecheck` — hepsi yeşil. |
| 12 | Seyrek (rare) yarış — tekrarla yakalanır mı | **20 ardışık koşu**, hata yakalama döngüsünde: `total failures: 0 / 20`. |
| 13 | Test kodu / kaynak kodu | Rapor 09 zaten 2 satırlık boş bir diag testiyle elemiş. Ayrıca repo içeriği 09'dan beri değişmedi (her iki koşuda da tam **51 dosya** toplandı) — aynı içerik bir kez 51 fail, bir kez 51 pass verdi. |

**Elemelerin toplamı:** Sebep ne diskte (deps/lock/config/cache), ne repo içeriğinde,
ne sürümlerde, ne de sabit bir ortam ayarındadır. **Süreç ömrü boyunca sürebilen, geçici
bir dış etken**dir — §1'deki mekanizmayla uyumlu tek sınıf budur.

---

## 3. Üretme girişimleri (hepsi başarısız)

Hatayı **zorla** üretmeye çalıştım ki mekanizmayı kanıtlayabileyim:

- `server.deps.inline: ['vitest']`, `inline: [/node_modules[\\/]vitest[\\/]/]`,
  `inline: true` ile geçici bir config (`--config` ile, repo dışında) → **hiçbiri vitest'i
  inline edemedi**, testler yeşil kaldı.
- `VITEST_DEBUG_DUMP` ile modül dökümü alındı: `inline: true` altında bile
  `externalized: 0, inlined: 7` — **vitest hiç modül fetcher'ına uğramıyor**. Sebebi
  `getCachedVitestImport()` (index.1_nbEjJY.js:622) — vitest kendini normal yoldan önce
  externalize ediyor. Yani vitest 5 kullanıcı config'i ile bu duruma **sokulamıyor**;
  ancak `getCachedVitestImport` içindeki string/yol karşılaştırması ıskalanırsa normal
  yola (kırılgan heuristik) düşüyor.
- `--deps.optimizer.ssr.enabled` → vitest 5'te böyle bir CLI seçeneği yok
  (`CACError: Unknown option --deps`); `deps.optimizer` v5'te kaldırılmış. Bu hipotez de öldü.

---

## 4. Yapılamayan doğrulama (ortam kısıtı)

Görevde istenen **"node_modules yeniden kurulduktan sonra da yeşil mi"** adımı
**yapılamadı**: bu ajan oturumu ağ erişimi kapalı bir sandbox'ta çalışıyor.

```
$ npm install --dry-run
npm error code EALLOWREMOTE
npm error Fetching packages of type "remote" have been disabled
npm error Refusing to fetch ".../@tailwindcss/oxide-wasm32-wasi-4.2.2.tgz"
```

`npm ci` node_modules'ü **önce siler**; ağ kapalıyken yarıda kalırsa repoyu çalışamaz hale
getirirdi ve geri alamazdım. **Bilerek çalıştırmadım.** Aynı sebeple herhangi bir bağımlılık
değişikliği (örn. `@types/node` 20→22, sürüm sabitleme) de yapılamadı: `package.json`'daki
aralığı elle daraltmak, `npm install` çalıştırılamadığı için `package-lock.json` ile
tutarsızlık yaratır ve **`npm ci`'yi kırardı**. Bu yüzden `package.json`'a dokunulmadı.

---

## 5. Doğrulama çıktıları (gerçek, bu oturum)

**Koşul A — normal, sıcak önbellek, Git Bash:**
```
$ npx vitest run
 RUN  v5.0.0 C:/Dev/MyProjects/Syncron/know-and-conquer
 Test Files  51 passed (51)
      Tests  517 passed (517)
```

**Koşul B — 20 ardışık koşu (kırmızı yakalama döngüsü):**
```
$ for i in $(seq 1 20); do vitest run --reporter=dot; grep -q "51 passed" || echo FAIL; done
total failures: 0 / 20
```

**Koşul C — 3 süreç eşzamanlı (2 kök + 1 worker):**
```
A:  Test Files  51 passed (51)
B:  Test Files  51 passed (51)
C:  Test Files  19 passed (19)   Tests  263 passed (263)
```

**Koşul D — SOĞUK önbellek (`node_modules/.vite` ve `.vite-temp` silindikten sonra):**
```
$ npm test
 Test Files  51 passed (51)
      Tests  517 passed (517)

$ npx tsc --noEmit
(çıktı yok — exit 0)
```

**Koşul E — PowerShell + `npx.cmd`:** `Test Files 51 passed (51)`, `Tests 517 passed (517)`
**Koşul F — küçük harfli cwd:** `Test Files 51 passed (51)`
**Koşul G — vitest 3.2.4 (worker'ınki) ile kök config:** `51 passed`, `517 passed`

**syncron-worker (bozulmadı):**
```
$ cd syncron-worker && npx vitest run
 Test Files  19 passed (19)
      Tests  263 passed (263)
```

**Çalışma ağacı:** `git status --porcelain` çıktısı oturum başındakiyle aynı; benim
eklediğim/değiştirdiğim tek dosya bu rapor. `git stash` kullanılmadı, hiçbir şey geri
alınmadı, commit yapılmadı. Üretim ortamına dokunan hiçbir komut çalıştırılmadı.

---

## 6. 07 numaralı rapor neden yanıldı

07, doğru gözlemi (yeşil) yanlış sonuca bağladı: **"tekrar üretemedim" ile "bozuk değil"i
eşitledi** ve yeşil koşu sayısını (4 kez `npm test`) kanıt yerine koydu. Oysa belirti,
süreç başına verilen ve önbelleğe alınan bir kararın ürünü olduğu için ya tamamen kırmızı
ya tamamen yeşildir; *yeşil koşuları tekrarlamak kırmızının koşulunu hiç örneklemez* —
kaç kez tekrarlanırsa tekrarlansın. 07'nin yapması gereken, benim burada yaptığım gibi
kırmızı koşulu **elemeler yoluyla daraltmak** (disk durumunu lock ile kıyaslamak,
zaman damgalarıyla "aynı ağaç iki farklı sonuç verdi" çelişkisini kurmak, hata imzasını
vitest kaynağında tek satıra kilitlemek) ve bir sonraki kırmızıda kanıtı yakalayacak
prosedürü bırakmaktı. Ayrıca 07, config dosyasını `vitest.config.ts` diye rapor etti;
dosyanın gerçek adı `vitest.config.mts` — yani incelemesi ya yüzeysel ya ezberdi.
Ben de "yeşil gördüm" demiyorum: **§7'deki prosedür bir kez kırmızıyı yakalayana kadar
bu iş kapanmamalıdır.**

---

## 7. Bir daha olmaması / bir sonraki kırmızıyı kanıtlamak için

**A. Kırmızı tekrar görüldüğü ANDA (en önemli madde).** Yeşil koşu tekrarlamak işe yaramaz;
kırmızı koşunun kanıtı toplanmalı. Kırmızıyı gören kişi **aynı kabukta**:

```sh
npx vitest run --reporter=verbose 2>&1 | tee /tmp/vitest-kirmizi.log
VITEST_DEBUG_DUMP=/tmp/vdump npx vitest run 2>&1 | tail -40
cat /tmp/vdump/root/vitest-metadata.json     # externalized listesinde vitest var mı?
```
Beklenen ayrım: `externalized` listesinde `.../node_modules/vitest/dist/index.js`
**yoksa / `inlined` tarafındaysa** → §1'deki mekanizma **kanıtlanmış** olur ve kalıcı
çözüm nettir (vitest sürüm yükseltmesi + upstream issue). Varsa → mekanizma yanlış,
tam yığın izi (`--reporter=verbose`) yeni yolu gösterir.

**B. Sürüm sabitleme (ağ olan bir oturumda yapılmalı).** `package.json`'da
`"vite": "^8.3.0"` ve `"vitest": "^5.0.0"` → `"8.3.0"` / `"5.0.0"` (caret kaldırılır) ve
ardından `npm install` ile lock güncellenir. Şu an kayma yok ama `^` her `npm install`'da
test koşucusunu sessizce değiştirmeye açık kapı bırakıyor; bu sınıf bir belirsizliğin
test altyapısında bulunması istenmez.

**C. `@types/node` peer uyumsuzluğu giderilmeli** (`^20` → `^22`). Bu belirtinin sebebi
**değil** (kanıtı §2/#6) ama `npm ls` çıktısındaki tek gerçek `invalid` bu ve her teşhiste
yanlış ize sürüklüyor (rapor 09 da buna takıldı). Temizlenmeli ki bir dahaki sefere gürültü
yapmasın. Ardından `npx tsc --noEmit` mutlaka tekrar koşulmalı.

**D. CI kapısı.** `npm ci && npm test && npx tsc --noEmit` bir CI iş akışında koşmalı.
Kritik nokta: **CI, "0 test koştu" durumunu başarı saymamalı.** vitest zaten hepsi fail
olunca exit≠0 veriyor, ama ek güvence için `--passWithNoTests=false` (varsayılan) korunmalı
ve beklenen minimum test sayısı bir eşikle kontrol edilmeli. Böylece belirti bir daha
"birinin makinesinde" değil, tekrarlanabilir bir ortamda yakalanır.

**E. Yerel tarama istisnası.** Windows Defender'a `C:\Dev\MyProjects\Syncron\know-and-conquer\node_modules`
istisnası eklenmesi (proje sahibi kararı). §1'deki mekanizmanın en olası tetikleyicisi
geçici dosya kilididir; istisna bu riski kaynağında düşürür ve maliyeti sıfırdır.

---

## LİDERE SORU

1. **Kırmızıyı hâlâ üretebiliyor musun?** Evetse §7-A'daki üç komutun çıktısını ver —
   özellikle `vitest-metadata.json`'daki `externalized` listesini ve
   `--reporter=verbose`'un **tam yığın izini**. Yığın izi `run.CQOUYP-x.js:2613`'ü
   gösteriyorsa teşhis doğrulanır; başka bir satırı gösteriyorsa §1'i çöpe atıp oradan
   devam ederim.
2. **Ağ erişimi olan bir oturum verebilir misin?** `npm ci` ile temiz kurulum doğrulaması
   ve §7-B/C'deki bağımlılık düzeltmeleri **ancak o zaman** yapılabilir. Şu anki sandbox
   kayıt defterine (registry) erişemiyor (`EALLOWREMOTE`).
3. **Kırmızıyı gören ajanın kabuğu/ortamı benimkiyle aynı mıydı?** (aynı makine, aynı
   sandbox profili, eşzamanlı başka bir ajan var mıydı, antivirüs taraması aktif miydi)
   Rapor 09 ile benim ilk koşum arasında **5 dakika** ve **bayt-bayt aynı node_modules**
   var; fark yalnızca süreç ortamında olabilir ve o farkı ben göremiyorum.
